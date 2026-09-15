import { randomUUID } from 'node:crypto';
import type { NewOrder, Order, Payment, Settlement, Store } from './types.ts';
import { canTransition, TransitionError } from '../domain/state.ts';

/**
 * The same store, in memory.
 *
 * It exists so the tests can drive the entire payment flow — including two
 * webhooks arriving for one order — without a database. Its rules are the
 * Postgres ones: the state machine is enforced, a settlement that changes
 * nothing reports `changed: false`, and an event id is only ever new once.
 */
export class MemoryStore implements Store {
  #orders = new Map<string, Order>();
  #payments = new Map<string, Payment>();
  #events = new Set<string>();
  /** Serialises settlements the way `select … for update` does in Postgres. */
  #queue: Promise<unknown> = Promise.resolve();

  async createOrderWithPayment(input: NewOrder, provider: string) {
    const now = new Date();
    const order: Order = {
      id: randomUUID(), status: 'PENDING', createdAt: now, updatedAt: now, paidAt: null, ...input,
    };
    const payment: Payment = {
      id: randomUUID(), orderId: order.id, provider,
      providerSessionId: null, providerTransactionId: null,
      amount: order.amount, currency: order.currency, status: 'PENDING',
      failureReason: null, refundedAmount: 0, createdAt: now, updatedAt: now, paidAt: null,
    };
    this.#orders.set(order.id, order);
    this.#payments.set(payment.id, payment);
    return { order, payment };
  }

  async orderByReference(reference: string) {
    return [...this.#orders.values()].find((o) => o.reference === reference) ?? null;
  }

  async paymentForOrder(orderId: string) {
    return [...this.#payments.values()].find((p) => p.orderId === orderId) ?? null;
  }

  async paymentByProviderSession(provider: string, sessionId: string) {
    return [...this.#payments.values()].find((p) => p.provider === provider && p.providerSessionId === sessionId) ?? null;
  }

  async attachSession(paymentId: string, sessionId: string) {
    const payment = this.#payments.get(paymentId);
    if (payment) Object.assign(payment, { providerSessionId: sessionId, updatedAt: new Date() });
  }

  settle(paymentId: string, next: Settlement) {
    const run = async () => {
      const payment = this.#payments.get(paymentId);
      if (!payment) throw new Error('payment not found');
      const order = this.#orders.get(payment.orderId)!;
      if (payment.status === next.status) return { payment, changed: false };
      if (!canTransition(payment.status, next.status)) throw new TransitionError(payment.status, next.status);

      const now = new Date();
      const paidAt = next.status === 'PAID' ? next.paidAt ?? now : payment.paidAt;
      Object.assign(payment, {
        status: next.status,
        providerTransactionId: next.providerTransactionId ?? payment.providerTransactionId,
        failureReason: next.failureReason ?? null,
        refundedAmount: next.refundedAmount ?? payment.refundedAmount,
        paidAt, updatedAt: now,
      });
      Object.assign(order, { status: next.status, paidAt, updatedAt: now });
      return { payment, changed: true };
    };
    const result = this.#queue.then(run, run);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async rememberEvent(provider: string, eventId: string) {
    const key = `${provider}:${eventId}`;
    if (this.#events.has(key)) return false;
    this.#events.add(key);
    return true;
  }

  async listPayments(limit: number) {
    return [...this.#payments.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((p) => {
        const order = this.#orders.get(p.orderId)!;
        return { ...p, reference: order.reference, title: order.title };
      });
  }

  async close() {}
}
