import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { CheckoutRequest, CheckoutSession, PaymentProvider, WebhookOutcome } from './types.ts';
import { WebhookVerificationError } from './types.ts';
import type { PaymentState } from '../domain/state.ts';

/**
 * A gateway that behaves like one, for tests and for local work.
 *
 * It signs its webhooks the way a real gateway does — HMAC-SHA256 over the raw
 * body — so the verification path under test is the real one rather than a
 * stub that always says yes. It never touches the network and never sees a
 * card: the "checkout page" it returns is a local page that simply posts the
 * outcome the developer chooses.
 */
export class MockProvider implements PaymentProvider {
  readonly name = 'mock';
  #secret: string;
  #baseUrl: string;

  constructor(secret: string, baseUrl: string) {
    this.#secret = secret || 'mock-secret';
    this.#baseUrl = baseUrl.replace(/\/$/, '');
  }

  async createCheckout({ order, returnUrl, cancelUrl }: CheckoutRequest): Promise<CheckoutSession> {
    const sessionId = `mock_cs_${randomUUID()}`;
    const q = new URLSearchParams({ session: sessionId, amount: String(order.amount), return: returnUrl, cancel: cancelUrl });
    return { sessionId, redirectUrl: `${this.#baseUrl}/sandbox/checkout?${q}` };
  }

  /** The signature a caller must send. Used by the tests and the sandbox page. */
  sign(rawBody: Buffer | string): string {
    return createHmac('sha256', this.#secret).update(rawBody).digest('hex');
  }

  async readWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookOutcome> {
    const given = headers['x-mock-signature'];
    if (typeof given !== 'string') throw new WebhookVerificationError('missing signature');
    const expected = this.sign(rawBody);
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookVerificationError('signature does not verify');

    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new WebhookVerificationError('body is not JSON');
    }

    const status = String(body.status ?? '').toUpperCase() as PaymentState;
    const understood = ['PAID', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(status);
    return {
      eventId: String(body.id ?? ''),
      type: `mock.${status.toLowerCase() || 'unknown'}`,
      sessionId: body.session ?? null,
      reference: body.reference ?? null,
      amount: typeof body.amount === 'number' ? body.amount : null,
      currency: body.currency ? String(body.currency).toUpperCase() : null,
      settlement: understood
        ? {
            status,
            providerTransactionId: body.transaction ?? null,
            failureReason: body.failureReason ?? null,
            ...(status === 'REFUNDED' ? { refundedAmount: body.amount } : {}),
          }
        : null,
    };
  }
}
