import pg from 'pg';
import type { NewOrder, Order, Payment, Settlement, Store } from './types.ts';
import type { PaymentState } from '../domain/state.ts';
import { canTransition, TransitionError } from '../domain/state.ts';

const { Pool } = pg;

// bigint arrives as a string by default; every amount here is minor units and
// safely within Number range, so read it as a number rather than juggling both
pg.types.setTypeParser(20, (value: string) => Number(value));

/**
 * Render's managed Postgres is reached two ways. Over the internet the host is
 * a full domain and TLS is required — with Render's own chain, which is not in
 * the system store. Inside Render the host is a bare name on a private network,
 * where the server offers no TLS at all and asking for it fails the connection.
 */
const sslFor = (connectionString: string): false | { rejectUnauthorized: boolean } => {
  let host = '';
  try { host = new URL(connectionString).hostname; } catch { host = ''; }
  const internal = !host.includes('.') || host === 'localhost' || /^127\./.test(host);
  return internal ? false : { rejectUnauthorized: false };
};

const toOrder = (r: any): Order => ({
  id: r.id, reference: r.reference, status: r.status as PaymentState,
  sku: r.sku, title: r.title, quantity: r.quantity,
  unitAmount: r.unit_amount, amount: r.amount, currency: r.currency, locale: r.locale,
  customerName: r.customer_name, customerEmail: r.customer_email, customerPhone: r.customer_phone,
  statusToken: r.status_token, createdAt: r.created_at, updatedAt: r.updated_at, paidAt: r.paid_at,
});

const toPayment = (r: any): Payment => ({
  id: r.id, orderId: r.order_id, provider: r.provider,
  providerSessionId: r.provider_session_id, providerTransactionId: r.provider_transaction_id,
  amount: r.amount, currency: r.currency, status: r.status as PaymentState,
  failureReason: r.failure_reason, refundedAmount: r.refunded_amount,
  createdAt: r.created_at, updatedAt: r.updated_at, paidAt: r.paid_at,
});

/**
 * Postgres.
 *
 * Two things matter here beyond the SQL. A settlement takes the payment row
 * with `for update`, so two webhooks delivered at the same instant queue behind
 * each other instead of both deciding an order is paid. And the payment and its
 * order move inside one transaction, so an order is never marked paid while its
 * payment says otherwise.
 */
export class PostgresStore implements Store {
  #pool: pg.Pool;

  constructor(connectionString: string) {
    this.#pool = new Pool({ connectionString, max: 5, ssl: sslFor(connectionString) });
  }

  async createOrderWithPayment(input: NewOrder, provider: string) {
    const client = await this.#pool.connect();
    try {
      await client.query('begin');
      const { rows: [orderRow] } = await client.query(
        `insert into orders (reference, status, sku, title, quantity, unit_amount, amount, currency, locale,
                             customer_name, customer_email, customer_phone, status_token)
         values ($1,'PENDING',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
        [input.reference, input.sku, input.title, input.quantity, input.unitAmount, input.amount,
         input.currency, input.locale, input.customerName, input.customerEmail, input.customerPhone, input.statusToken],
      );
      const { rows: [paymentRow] } = await client.query(
        `insert into payments (order_id, provider, amount, currency, status)
         values ($1,$2,$3,$4,'PENDING') returning *`,
        [orderRow.id, provider, input.amount, input.currency],
      );
      await client.query('commit');
      return { order: toOrder(orderRow), payment: toPayment(paymentRow) };
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  }

  async orderByReference(reference: string) {
    const { rows } = await this.#pool.query('select * from orders where reference = $1', [reference]);
    return rows[0] ? toOrder(rows[0]) : null;
  }

  async paymentForOrder(orderId: string) {
    const { rows } = await this.#pool.query(
      'select * from payments where order_id = $1 order by created_at desc limit 1', [orderId]);
    return rows[0] ? toPayment(rows[0]) : null;
  }

  async paymentByProviderSession(provider: string, sessionId: string) {
    const { rows } = await this.#pool.query(
      'select * from payments where provider = $1 and provider_session_id = $2', [provider, sessionId]);
    return rows[0] ? toPayment(rows[0]) : null;
  }

  async attachSession(paymentId: string, sessionId: string) {
    await this.#pool.query(
      'update payments set provider_session_id = $2, updated_at = now() where id = $1', [paymentId, sessionId]);
  }

  async settle(paymentId: string, next: Settlement) {
    const client = await this.#pool.connect();
    try {
      await client.query('begin');
      const { rows: [current] } = await client.query('select * from payments where id = $1 for update', [paymentId]);
      if (!current) throw new Error('payment not found');

      const from = current.status as PaymentState;
      if (from === next.status) {
        await client.query('commit');
        return { payment: toPayment(current), changed: false };
      }
      if (!canTransition(from, next.status)) throw new TransitionError(from, next.status);

      const paidAt = next.status === 'PAID' ? (next.paidAt ?? new Date()) : current.paid_at;
      const { rows: [updated] } = await client.query(
        `update payments
            set status = $2,
                provider_transaction_id = coalesce($3, provider_transaction_id),
                failure_reason = $4,
                refunded_amount = coalesce($5, refunded_amount),
                paid_at = $6,
                updated_at = now()
          where id = $1 returning *`,
        [paymentId, next.status, next.providerTransactionId ?? null, next.failureReason ?? null,
         next.refundedAmount ?? null, paidAt],
      );
      await client.query(
        'update orders set status = $2, paid_at = $3, updated_at = now() where id = $1',
        [current.order_id, next.status, paidAt],
      );
      await client.query('commit');
      return { payment: toPayment(updated), changed: true };
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  }

  async rememberEvent(provider: string, eventId: string) {
    const { rowCount } = await this.#pool.query(
      `insert into webhook_events (provider, event_id) values ($1,$2)
       on conflict (provider, event_id) do nothing`, [provider, eventId]);
    return rowCount === 1;
  }

  async listPayments(limit: number) {
    const { rows } = await this.#pool.query(
      `select p.*, o.reference, o.title from payments p
         join orders o on o.id = p.order_id
        order by p.created_at desc limit $1`, [limit]);
    return rows.map((r: any) => ({ ...toPayment(r), reference: r.reference, title: r.title }));
  }

  async close() { await this.#pool.end(); }
}
