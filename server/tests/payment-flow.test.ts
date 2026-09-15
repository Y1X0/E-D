import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { start, SECRET, SITE } from './harness.ts';
import { MemoryStore } from '../src/db/memory.ts';
import { MockProvider } from '../src/providers/mock.ts';
import { ProviderUnavailableError } from '../src/providers/types.ts';
import type { PaymentProvider } from '../src/providers/types.ts';
import type { Store } from '../src/db/types.ts';

const paid = (reference: string, session: string, amount = 250000) => ({
  id: `evt_${randomUUID()}`, status: 'PAID', reference, session, amount, currency: 'ILS',
  transaction: `txn_${randomUUID()}`,
});

const statusOf = async (h: Awaited<ReturnType<typeof start>>, ref: string, token: string) => {
  const res = await h.get(`/api/orders/${ref}/status?t=${token}`);
  return { code: res.status, body: await res.json() as any };
};

describe('the payment flow', () => {
  it('1. settles an order when the gateway says it was paid', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();

    // before the webhook, the order is in flight — not paid
    let seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'PROCESSING');

    const session = new URL(order.redirectUrl).searchParams.get('session')!;
    const res = await h.webhook(paid(order.reference, session));
    assert.equal(res.status, 200);
    assert.equal((await res.json() as any).changed, true);

    seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'PAID');
    assert.equal(seen.body.amount, 250000);
    assert.equal(seen.body.currency, 'ILS');
    assert.ok(seen.body.paidAt, 'paidAt is recorded');
    assert.ok(seen.body.transaction, 'the gateway reference is kept');
  });

  it('2. records a failed payment without marking it paid', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    const res = await h.webhook({
      id: `evt_${randomUUID()}`, status: 'FAILED', reference: order.reference, session,
      amount: 250000, currency: 'ILS', failureReason: 'card declined',
    });
    assert.equal(res.status, 200);

    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'FAILED');
    assert.equal(seen.body.failureReason, 'card declined');
    assert.equal(seen.body.paidAt, null);
  });

  it('3. records a cancelled payment', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    await h.webhook({ id: `evt_${randomUUID()}`, status: 'CANCELLED', reference: order.reference, session, amount: 250000, currency: 'ILS' });
    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'CANCELLED');
  });

  it('4. refuses a webhook whose amount is not the amount ordered', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    const res = await h.webhook(paid(order.reference, session, 100));
    assert.equal(res.status, 409);
    assert.equal((await res.json() as any).error, 'amount_mismatch');

    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.notEqual(seen.body.status, 'PAID');
  });

  it('5. refuses a webhook in another currency', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    const res = await h.webhook({ ...paid(order.reference, session), currency: 'USD' });
    assert.equal(res.status, 409);

    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.notEqual(seen.body.status, 'PAID');
  });

  it('6. answers 404 for a webhook about an order that does not exist', async () => {
    const h = await start();
    after(() => h.stop());
    const res = await h.webhook(paid('EED-NOTREAL', 'mock_cs_nothing'));
    assert.equal(res.status, 404);
  });

  it('7. treats a redelivered webhook as already handled', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;
    const event = paid(order.reference, session);

    const first = await h.webhook(event);
    const second = await h.webhook(event);

    assert.equal(first.status, 200);
    assert.equal((await first.json() as any).changed, true);
    assert.equal(second.status, 200);
    assert.equal((await second.json() as any).duplicate, true);

    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'PAID');
  });

  it('8. ignores a replayed request, signature and all', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    // captured verbatim — body and signature both valid, sent again later
    const raw = JSON.stringify(paid(order.reference, session));
    const signature = h.provider.sign(raw);
    await h.post('/api/webhooks/mock', raw, { 'x-mock-signature': signature });
    const replay = await h.post('/api/webhooks/mock', raw, { 'x-mock-signature': signature });

    assert.equal(replay.status, 200);
    assert.equal((await replay.json() as any).duplicate, true);
    const payments = await h.store.listPayments(10);
    assert.equal(payments.filter((p) => p.status === 'PAID').length, 1);
  });

  it('9. rejects a webhook whose signature does not verify', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    const res = await h.webhook(paid(order.reference, session), 'deadbeef'.repeat(8));
    assert.equal(res.status, 400);
    assert.equal((await res.json() as any).error, 'invalid_signature');

    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.notEqual(seen.body.status, 'PAID');
  });

  it('10. leaves an order that is already paid alone', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;
    await h.webhook(paid(order.reference, session));

    // a late failure for the same order, a different event
    const late = await h.webhook({
      id: `evt_${randomUUID()}`, status: 'FAILED', reference: order.reference, session,
      amount: 250000, currency: 'ILS', failureReason: 'late decline',
    });
    assert.equal(late.status, 200);
    assert.equal((await late.json() as any).ignored, 'state');

    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'PAID');
  });

  it('11. treats an expired checkout as cancelled, never paid', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    await h.webhook({ id: `evt_${randomUUID()}`, status: 'CANCELLED', reference: order.reference, session, amount: 250000, currency: 'ILS', failureReason: 'checkout expired' });
    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'CANCELLED');
    assert.equal(seen.body.paidAt, null);
  });

  it('12. answers 502 and fails the payment when the gateway is unreachable', async () => {
    const broken: PaymentProvider = {
      name: 'mock',
      async createCheckout() { throw new ProviderUnavailableError('gateway down'); },
      async readWebhook() { throw new Error('not used'); },
    };
    const h = await start({ provider: broken });
    after(() => h.stop());

    const res = await h.post('/api/checkout', {
      sku: 'boutique-01', quantity: 1, locale: 'en', customer: { name: 'Test', phone: '+972500000000' },
    });
    assert.equal(res.status, 502);
    assert.equal((await res.json() as any).error, 'gateway_unavailable');

    const payments = await h.store.listPayments(10);
    assert.equal(payments[0]?.status, 'FAILED');
  });

  it('13. gives the same answer however often the success page is refreshed', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;
    await h.webhook(paid(order.reference, session));

    const reads = await Promise.all([1, 2, 3, 4, 5].map(() => statusOf(h, order.reference, order.statusToken)));
    for (const read of reads) {
      assert.equal(read.code, 200);
      assert.equal(read.body.status, 'PAID');
    }
    const payments = await h.store.listPayments(10);
    assert.equal(payments.length, 1, 'refreshing creates nothing');
  });

  it('14. tells nothing to someone who opens the success page without paying', async () => {
    const h = await start();
    after(() => h.stop());
    const order = await h.checkout();

    // no token at all, and a guessed one
    assert.equal((await h.get(`/api/orders/${order.reference}/status`)).status, 404);
    assert.equal((await h.get(`/api/orders/${order.reference}/status?t=${'0'.repeat(32)}`)).status, 404);
    assert.equal((await h.get(`/api/orders/EED-GUESSED/status?t=${order.statusToken}`)).status, 404);

    // with the real token, the honest answer: not paid
    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'PROCESSING');
  });

  it('15. keeps two attempts at the same piece apart', async () => {
    const h = await start();
    after(() => h.stop());
    const first = await h.checkout();
    const second = await h.checkout();
    assert.notEqual(first.reference, second.reference);

    const session = new URL(first.redirectUrl).searchParams.get('session')!;
    await h.webhook(paid(first.reference, session));

    assert.equal((await statusOf(h, first.reference, first.statusToken)).body.status, 'PAID');
    assert.equal((await statusOf(h, second.reference, second.statusToken)).body.status, 'PROCESSING');
  });

  it('16. answers 500 and settles nothing when storage fails mid-webhook', async () => {
    // a store that works until the moment the webhook tries to settle — which
    // is where a dropped connection actually hurts
    const real = new MemoryStore();
    let failing = false;
    const store: Store = {
      createOrderWithPayment: (o, p) => real.createOrderWithPayment(o, p),
      orderByReference: (r) => real.orderByReference(r),
      paymentForOrder: (id) => real.paymentForOrder(id),
      paymentByProviderSession: (p, s) => real.paymentByProviderSession(p, s),
      attachSession: (id, s) => real.attachSession(id, s),
      settle: (id, next) => failing
        ? Promise.reject(new Error('connection terminated unexpectedly'))
        : real.settle(id, next),
      rememberEvent: (p, e) => real.rememberEvent(p, e),
      listPayments: (n) => real.listPayments(n),
      close: () => real.close(),
    };

    const h = await start({ store });
    after(() => h.stop());
    const order = await h.checkout();
    const session = new URL(order.redirectUrl).searchParams.get('session')!;

    failing = true;
    const res = await h.webhook(paid(order.reference, session));
    assert.equal(res.status, 500);
    assert.equal((await res.json() as any).error, 'settle_failed');

    failing = false;
    const seen = await statusOf(h, order.reference, order.statusToken);
    assert.equal(seen.body.status, 'PROCESSING', 'nothing was marked paid');
    assert.equal((await real.listPayments(10)).filter((p) => p.status === 'PAID').length, 0);
  });

});
