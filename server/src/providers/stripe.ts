import Stripe from 'stripe';
import type { CheckoutRequest, CheckoutSession, PaymentProvider, WebhookOutcome } from './types.ts';
import { ProviderUnavailableError, WebhookVerificationError } from './types.ts';
import type { PaymentState } from '../domain/state.ts';

/**
 * Stripe Checkout.
 *
 * The buyer is sent to a page Stripe hosts and returns with nothing but an
 * order reference; the card, the 3-D Secure step and the whole PCI surface stay
 * on Stripe's side. What settles the order is the webhook, verified against the
 * signing secret, never the redirect.
 *
 * Written against the installed SDK (stripe@18): checkout.sessions.create,
 * webhooks.constructEvent and refunds.create are the methods used.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  #stripe: Stripe;
  #webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string, stripe?: Stripe) {
    this.#stripe = stripe ?? new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000 });
    this.#webhookSecret = webhookSecret;
  }

  async createCheckout({ order, returnUrl, cancelUrl }: CheckoutRequest): Promise<CheckoutSession> {
    try {
      const session = await this.#stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: order.reference,
        // read back on the webhook and checked against the order in our own tables
        metadata: { reference: order.reference, sku: order.sku },
        line_items: [{
          quantity: order.quantity,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: order.unitAmount,
            product_data: { name: order.title },
          },
        }],
        ...(order.customerEmail ? { customer_email: order.customerEmail } : {}),
        success_url: returnUrl,
        cancel_url: cancelUrl,
      });
      if (!session.url) throw new ProviderUnavailableError('Stripe returned a session with no URL');
      return { sessionId: session.id, redirectUrl: session.url };
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw err;
      // network, rate limit, or Stripe itself being down
      throw new ProviderUnavailableError(err instanceof Error ? err.message : 'Stripe is unavailable');
    }
  }

  async readWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookOutcome> {
    const signature = headers['stripe-signature'];
    if (typeof signature !== 'string') throw new WebhookVerificationError('missing signature');

    let event: Stripe.Event;
    try {
      event = this.#stripe.webhooks.constructEvent(rawBody, signature, this.#webhookSecret);
    } catch {
      // the message carries the payload; it is not repeated into our logs
      throw new WebhookVerificationError('signature does not verify');
    }

    const base = { eventId: event.id, type: event.type };

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paid = session.payment_status === 'paid';
      return {
        ...base,
        sessionId: session.id,
        reference: session.client_reference_id ?? session.metadata?.reference ?? null,
        amount: session.amount_total ?? null,
        currency: session.currency ? session.currency.toUpperCase() : null,
        settlement: paid
          ? {
              status: 'PAID' as PaymentState,
              providerTransactionId: typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id ?? session.id,
              paidAt: new Date(event.created * 1000),
            }
          : null,
      };
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        ...base,
        sessionId: session.id,
        reference: session.client_reference_id ?? null,
        amount: session.amount_total ?? null,
        currency: session.currency ? session.currency.toUpperCase() : null,
        settlement: { status: 'FAILED' as PaymentState, failureReason: 'payment declined' },
      };
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        ...base,
        sessionId: session.id,
        reference: session.client_reference_id ?? null,
        amount: session.amount_total ?? null,
        currency: session.currency ? session.currency.toUpperCase() : null,
        settlement: { status: 'CANCELLED' as PaymentState, failureReason: 'checkout expired' },
      };
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      return {
        ...base,
        sessionId: null,
        reference: charge.metadata?.reference ?? null,
        amount: charge.amount_refunded ?? null,
        currency: charge.currency ? charge.currency.toUpperCase() : null,
        settlement: {
          status: 'REFUNDED' as PaymentState,
          providerTransactionId: typeof charge.payment_intent === 'string' ? charge.payment_intent : null,
          refundedAmount: charge.amount_refunded,
        },
      };
    }

    // anything else is acknowledged and ignored — Stripe sends a great deal
    return { ...base, sessionId: null, reference: null, amount: null, currency: null, settlement: null };
  }

  async refund(providerTransactionId: string, amount: number) {
    const refund = await this.#stripe.refunds.create({ payment_intent: providerTransactionId, amount });
    return { refundId: refund.id, amount: refund.amount };
  }
}
