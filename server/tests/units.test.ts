import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Stripe from 'stripe';
import { canTransition, isSettled } from '../src/domain/state.ts';
import { buildOrder, OrderRejected } from '../src/domain/orders.ts';
import { assertMinor, formatMinor, toMinor } from '../src/money.ts';
import { redact } from '../src/logging.ts';
import { StripeProvider } from '../src/providers/stripe.ts';
import { ProviderUnavailableError, WebhookVerificationError } from '../src/providers/types.ts';
import { catalogue } from './harness.ts';

describe('the state machine', () => {
  it('only moves a payment forward', () => {
    assert.equal(canTransition('PENDING', 'PROCESSING'), true);
    assert.equal(canTransition('PROCESSING', 'PAID'), true);
    assert.equal(canTransition('PAID', 'REFUNDED'), true);
    assert.equal(canTransition('PENDING', 'PAID'), false, 'a payment cannot settle before it is taken');
    assert.equal(canTransition('PAID', 'FAILED'), false, 'a paid order cannot fail afterwards');
    assert.equal(canTransition('CANCELLED', 'PAID'), false);
    assert.equal(canTransition('REFUNDED', 'PAID'), false);
    assert.equal(canTransition('PAID', 'PAID'), true, 'a redelivery is not a move');
    assert.equal(isSettled('PAID'), true);
    assert.equal(isSettled('PROCESSING'), false);
  });
});

describe('money', () => {
  it('stays whole', () => {
    assert.equal(toMinor(2500, 'ILS'), 250000);
    assert.equal(toMinor(0.1 + 0.2, 'ILS'), 30, 'no float dust');
    assert.equal(formatMinor(250000, 'ILS'), '2,500 ₪');
    assert.throws(() => assertMinor(2500.5), /whole number/);
    assert.throws(() => assertMinor(-1), /positive/);
    assert.throws(() => assertMinor('250000'), /minor units/);
  });
});

describe('an order', () => {
  const customer = { name: 'Test Buyer', phone: '+972500000000' };

  it('is priced from the catalogue, never from the request', () => {
    const order = buildOrder(catalogue, { sku: 'boutique-01', quantity: 2, locale: 'ar', customer, amount: 1 } as any);
    assert.equal(order.unitAmount, 250000);
    assert.equal(order.amount, 500000);
    assert.equal(order.currency, 'ILS');
    assert.equal(order.title, 'البوتيك — إطلالة 01');
    assert.match(order.reference, /^EED-[A-Z2-9]{8}$/);
    assert.equal(order.statusToken.length, 32);
  });

  it('refuses what it should', () => {
    const cases: Array<[string, any]> = [
      ['sku_unknown', { sku: 'not-for-sale', quantity: 1, customer }],
      ['sku_missing', { quantity: 1, customer }],
      ['quantity_invalid', { sku: 'boutique-01', quantity: 0, customer }],
      ['quantity_invalid', { sku: 'boutique-01', quantity: 99, customer }],
      ['quantity_invalid', { sku: 'boutique-01', quantity: 1.5, customer }],
      ['name_missing', { sku: 'boutique-01', quantity: 1, customer: { phone: '+972500000000' } }],
      ['contact_missing', { sku: 'boutique-01', quantity: 1, customer: { name: 'Test' } }],
      ['email_invalid', { sku: 'boutique-01', quantity: 1, customer: { name: 'Test', email: 'not-an-email' } }],
    ];
    for (const [reason, request] of cases) {
      assert.throws(() => buildOrder(catalogue, request), (err: unknown) => {
        assert.ok(err instanceof OrderRejected);
        assert.equal(err.reason, reason);
        return true;
      }, `expected ${reason}`);
    }
  });
});

describe('logging', () => {
  it('drops anything that should never be written down', () => {
    const out = redact({
      reference: 'EED-ABCD1234',
      authorization: 'Bearer sk_live_do_not_log',
      card: { number: '4242424242424242', cvc: '123' },
      note: 'key sk_live_51ABCDEFghijkl said 4242 4242 4242 4242',
      nested: [{ password: 'hunter2' }],
    }) as any;

    assert.equal(out.reference, 'EED-ABCD1234', 'the useful part survives');
    assert.equal(out.authorization, '[redacted]');
    assert.equal(out.card, '[redacted]', 'the whole card object goes, not just its fields');
    assert.equal((redact({ payment: { cvc: '123', number: '4242424242424242' } }) as any).payment.cvc, '[redacted]');
    assert.equal((redact({ payment: { cvc: '123', number: '4242424242424242' } }) as any).payment.number, '[redacted]');
    assert.match(out.note, /\[redacted-key\]/);
    assert.match(out.note, /\[redacted-number\]/);
    assert.equal(out.nested[0].password, '[redacted]');
    assert.ok(!JSON.stringify(out).includes('4242424242424242'));
    assert.ok(!JSON.stringify(out).includes('sk_live_51ABCDEFghijkl'));
  });
});

describe('the Stripe adapter', () => {
  const secret = 'whsec_test_secret';
  const stripe = new Stripe('sk_test_not_a_real_key');
  const provider = new StripeProvider('sk_test_not_a_real_key', secret, stripe);

  const send = (event: object) => {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return provider.readWebhook(Buffer.from(payload), { 'stripe-signature': signature });
  };

  const session = (over: object = {}) => ({
    id: 'evt_1', type: 'checkout.session.completed', created: 1_700_000_000,
    data: { object: {
      id: 'cs_test_1', object: 'checkout.session', payment_status: 'paid',
      amount_total: 250000, currency: 'ils', client_reference_id: 'EED-ABCD1234',
      payment_intent: 'pi_test_1', ...over,
    } },
  });

  it('reads a real signed event', async () => {
    const outcome = await send(session());
    assert.equal(outcome.eventId, 'evt_1');
    assert.equal(outcome.settlement?.status, 'PAID');
    assert.equal(outcome.settlement?.providerTransactionId, 'pi_test_1');
    assert.equal(outcome.reference, 'EED-ABCD1234');
    assert.equal(outcome.amount, 250000);
    assert.equal(outcome.currency, 'ILS');
  });

  it('refuses a forged signature', async () => {
    const payload = JSON.stringify(session());
    await assert.rejects(
      provider.readWebhook(Buffer.from(payload), { 'stripe-signature': 't=1,v1=deadbeef' }),
      WebhookVerificationError,
    );
    await assert.rejects(provider.readWebhook(Buffer.from(payload), {}), WebhookVerificationError);
  });

  it('refuses a body that was altered after signing', async () => {
    const payload = JSON.stringify(session());
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const tampered = payload.replace('250000', '100');
    await assert.rejects(
      provider.readWebhook(Buffer.from(tampered), { 'stripe-signature': signature }),
      WebhookVerificationError,
    );
  });

  it('does not settle a session that completed without payment', async () => {
    const outcome = await send(session({ payment_status: 'unpaid' }));
    assert.equal(outcome.settlement, null);
  });

  it('maps expiry to cancelled and async failure to failed', async () => {
    const expired = await send({ ...session(), id: 'evt_2', type: 'checkout.session.expired' });
    assert.equal(expired.settlement?.status, 'CANCELLED');
    const failed = await send({ ...session(), id: 'evt_3', type: 'checkout.session.async_payment_failed' });
    assert.equal(failed.settlement?.status, 'FAILED');
  });

  it('acknowledges events it has no opinion about', async () => {
    const outcome = await send({ id: 'evt_4', type: 'customer.created', created: 1, data: { object: { id: 'cus_1' } } });
    assert.equal(outcome.settlement, null);
    assert.equal(outcome.eventId, 'evt_4');
  });

  it('reports an unreachable gateway rather than throwing something raw', async () => {
    const offline = new StripeProvider('sk_test_x', secret, {
      checkout: { sessions: { create: async () => { throw new Error('connect ECONNREFUSED'); } } },
    } as unknown as Stripe);

    await assert.rejects(
      offline.createCheckout({
        order: {
          id: '1', reference: 'EED-ABCD1234', status: 'PENDING', sku: 'boutique-01', title: 'x',
          quantity: 1, unitAmount: 250000, amount: 250000, currency: 'ILS', locale: 'en',
          customerName: 'x', customerEmail: null, customerPhone: null, statusToken: 't',
          createdAt: new Date(), updatedAt: new Date(), paidAt: null,
        },
        returnUrl: 'https://atelier.test/payment/success',
        cancelUrl: 'https://atelier.test/payment/cancelled',
      }),
      ProviderUnavailableError,
    );
  });
});
