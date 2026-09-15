import type { CheckoutRequest, CheckoutSession, PaymentProvider, WebhookOutcome } from './types.ts';
import { ProviderUnavailableError } from './types.ts';

/**
 * An Israeli acquirer — Grow, Meshulam, PayPlus, Tranzila, Cardcom.
 *
 * Deliberately unimplemented. Each of these has its own request shape, its own
 * signing scheme and its own field names, and writing them from memory is how
 * an integration ends up calling an endpoint that does not exist. Everything
 * around it is already built: this class is the only thing to fill in, and the
 * service will run against it the moment it is.
 *
 * To implement, from that provider's current official documentation:
 *
 *   createCheckout  POST the order to the provider's payment-page endpoint —
 *                   amount in minor units, currency ILS, our order reference as
 *                   the merchant reference, and PAYMENT_RETURN_URL /
 *                   PAYMENT_CALLBACK_URL as the return and notification URLs.
 *                   Return the provider's page URL and its session id.
 *
 *   readWebhook     Verify the notification the way that provider documents —
 *                   usually an HMAC over the raw body, or a hash of specific
 *                   fields with the terminal password. Compare in constant
 *                   time. Then map their status to ours and return the amount,
 *                   the currency and their transaction id so the caller can
 *                   check them against the order.
 *
 * Nothing else in this service needs to change.
 */
export class IsraeliAcquirerProvider implements PaymentProvider {
  readonly name = 'local-il';

  async createCheckout(_request: CheckoutRequest): Promise<CheckoutSession> {
    throw new ProviderUnavailableError(
      'The Israeli acquirer adapter is not implemented yet — see server/src/providers/local-il.ts',
    );
  }

  async readWebhook(_rawBody: Buffer, _headers: Record<string, string | string[] | undefined>): Promise<WebhookOutcome> {
    throw new ProviderUnavailableError(
      'The Israeli acquirer adapter is not implemented yet — see server/src/providers/local-il.ts',
    );
  }
}
