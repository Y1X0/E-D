import express from 'express';
import type { Express, Request, Response } from 'express';
import type { Env } from '../env.ts';
import type { Store } from '../db/types.ts';
import type { PaymentProvider } from '../providers/types.ts';
import { ProviderUnavailableError, WebhookVerificationError } from '../providers/types.ts';
import type { Catalogue } from '../catalogue.ts';
import { titleFor } from '../catalogue.ts';
import { buildOrder, OrderRejected } from '../domain/orders.ts';
import { TransitionError } from '../domain/state.ts';
import { log } from '../logging.ts';
import { cors, hardenedHeaders, rateLimit, sameOrigin } from './security.ts';

export interface Deps {
  env: Env;
  store: Store;
  provider: PaymentProvider;
  catalogue: Catalogue;
}

export function createApp({ env, store, provider, catalogue }: Deps): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(hardenedHeaders);
  app.use(cors([env.siteUrl]));

  app.get('/healthz', (_req, res) => { res.json({ ok: true, provider: provider.name }); });

  /** What the checkout page shows. Prices come from here, not from the page. */
  app.get('/api/catalogue/:sku', (req: Request, res: Response) => {
    const item = catalogue.items.get(String(req.params.sku));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    const locale = String(req.query.locale ?? 'en');
    res.json({
      sku: item.sku,
      title: titleFor(item, locale),
      note: item.notes[locale] ?? item.notes.en,
      unitAmount: item.unitAmount,
      currency: item.currency,
      maxQuantity: item.maxQuantity,
    });
  });

  /**
   * Starts a payment.
   *
   * The order is written before the buyer ever reaches the gateway, so there is
   * something to reconcile against whatever comes back — and the amount on it
   * is the catalogue's, never the request's.
   */
  app.post('/api/checkout',
    rateLimit({ windowMs: 60_000, max: 10 }),
    sameOrigin([env.siteUrl]),
    express.json({ limit: '8kb' }),
    async (req: Request, res: Response) => {
      let created;
      try {
        const draft = buildOrder(catalogue, req.body ?? {});
        created = await store.createOrderWithPayment(draft, provider.name);
      } catch (err) {
        if (err instanceof OrderRejected) {
          res.status(400).json({ error: err.reason, message: err.message });
          return;
        }
        log.error('could not create order', { error: (err as Error).message });
        res.status(500).json({ error: 'order_failed' });
        return;
      }

      const { order, payment } = created;
      const back = (base: string) => {
        const url = new URL(base);
        url.searchParams.set('ref', order.reference);
        url.searchParams.set('t', order.statusToken);
        return url.toString();
      };

      try {
        const session = await provider.createCheckout({
          order,
          returnUrl: back(env.returnUrl),
          cancelUrl: back(env.cancelUrl),
        });
        await store.attachSession(payment.id, session.sessionId);
        // in flight: handed to the gateway, not yet settled by it
        await store.settle(payment.id, { status: 'PROCESSING' });
        log.info('checkout opened', { reference: order.reference, sku: order.sku, amount: order.amount, provider: provider.name });
        res.status(201).json({
          reference: order.reference,
          statusToken: order.statusToken,
          amount: order.amount,
          currency: order.currency,
          redirectUrl: session.redirectUrl,
        });
      } catch (err) {
        await store.settle(payment.id, { status: 'FAILED', failureReason: 'could not reach the payment page' })
          .catch(() => undefined);
        const unavailable = err instanceof ProviderUnavailableError;
        log.error('could not open checkout', { reference: order.reference, provider: provider.name, error: (err as Error).message });
        res.status(unavailable ? 502 : 500).json({ error: unavailable ? 'gateway_unavailable' : 'checkout_failed' });
      }
    });

  /**
   * The webhook. This, and only this, settles an order.
   *
   * Raw body — the signature is over the bytes, so nothing may parse them
   * first. Verified, then deduplicated, then checked against the order we
   * already hold: reference, amount, currency. A second delivery of the same
   * event changes nothing and still answers 200, because a gateway that gets
   * anything else will keep trying.
   */
  app.post('/api/webhooks/:provider',
    express.raw({ type: '*/*', limit: '1mb' }),
    async (req: Request, res: Response) => {
      if (req.params.provider !== provider.name) { res.status(404).json({ error: 'unknown_provider' }); return; }

      let outcome;
      try {
        outcome = await provider.readWebhook(req.body as Buffer, req.headers);
      } catch (err) {
        if (err instanceof WebhookVerificationError) {
          log.warn('webhook rejected', { provider: provider.name, reason: err.message });
          res.status(400).json({ error: 'invalid_signature' });
          return;
        }
        log.error('webhook unreadable', { provider: provider.name, error: (err as Error).message });
        res.status(400).json({ error: 'unreadable' });
        return;
      }

      if (!outcome.eventId) { res.status(400).json({ error: 'missing_event_id' }); return; }

      // a redelivery, or a replay of a captured request, stops here
      const fresh = await store.rememberEvent(provider.name, outcome.eventId);
      if (!fresh) {
        log.info('webhook already handled', { provider: provider.name, event: outcome.eventId, type: outcome.type });
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      if (!outcome.settlement) {
        res.status(200).json({ received: true, ignored: outcome.type });
        return;
      }

      const payment = outcome.sessionId
        ? await store.paymentByProviderSession(provider.name, outcome.sessionId)
        : null;
      const order = outcome.reference ? await store.orderByReference(outcome.reference) : null;
      const target = payment ?? (order ? await store.paymentForOrder(order.id) : null);

      if (!target || !order) {
        log.warn('webhook for an unknown order', { provider: provider.name, event: outcome.eventId, reference: outcome.reference });
        res.status(404).json({ error: 'unknown_order' });
        return;
      }

      // what the gateway says it took must be what the order asked for
      const settling = outcome.settlement.status;
      if (settling === 'PAID') {
        if (outcome.amount !== order.amount || (outcome.currency ?? order.currency) !== order.currency) {
          log.error('webhook amount does not match the order', {
            reference: order.reference, expected: order.amount, currency: order.currency,
            received: outcome.amount, receivedCurrency: outcome.currency,
          });
          await store.settle(target.id, { status: 'FAILED', failureReason: 'amount or currency did not match the order' })
            .catch(() => undefined);
          res.status(409).json({ error: 'amount_mismatch' });
          return;
        }
      }

      try {
        const { changed } = await store.settle(target.id, outcome.settlement);
        log.info('payment settled', {
          reference: order.reference, status: settling, changed,
          transaction: outcome.settlement.providerTransactionId ?? null,
        });
        res.status(200).json({ received: true, changed });
      } catch (err) {
        if (err instanceof TransitionError) {
          // e.g. a late failure for an order already paid: understood, ignored
          log.warn('webhook out of order', { reference: order.reference, from: err.from, to: err.to });
          res.status(200).json({ received: true, ignored: 'state' });
          return;
        }
        log.error('could not settle payment', { reference: order.reference, error: (err as Error).message });
        res.status(500).json({ error: 'settle_failed' });
      }
    });

  /**
   * What the success page asks. The redirect carries no proof, so the page
   * shows whatever this says — and this reads the database.
   */
  app.get('/api/orders/:reference/status',
    rateLimit({ windowMs: 60_000, max: 60 }),
    async (req: Request, res: Response) => {
      const order = await store.orderByReference(String(req.params.reference));
      const token = String(req.query.t ?? '');
      if (!order || !token || token !== order.statusToken) {
        // the same answer either way, so a reference cannot be probed
        res.status(404).json({ error: 'not_found' });
        return;
      }
      const payment = await store.paymentForOrder(order.id);
      res.json({
        reference: order.reference,
        status: order.status,
        title: order.title,
        quantity: order.quantity,
        amount: order.amount,
        currency: order.currency,
        paidAt: order.paidAt,
        provider: payment?.provider ?? null,
        transaction: payment?.providerTransactionId ?? null,
        failureReason: payment?.failureReason ?? null,
      });
    });

  /** The atelier's own view, behind a token kept in the environment. */
  app.get('/api/admin/payments', async (req: Request, res: Response) => {
    const given = req.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!env.adminToken || given !== env.adminToken) { res.status(401).json({ error: 'unauthorised' }); return; }
    const rows = await store.listPayments(Math.min(Number(req.query.limit ?? 50), 200));
    res.json({ payments: rows });
  });

  app.use((_req, res) => { res.status(404).json({ error: 'not_found' }); });

  return app;
}
