import type { Order, Settlement } from '../db/types.ts';

export interface CheckoutRequest {
  order: Order;
  /** Where the gateway returns a buyer who paid, with the order's own token. */
  returnUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** The gateway's id for this attempt, stored so a webhook can be matched. */
  sessionId: string;
  /** Where to send the buyer. The card is typed there, never here. */
  redirectUrl: string;
}

/**
 * What a verified webhook turned out to be.
 *
 * `eventId` is what makes redelivery harmless; the amount and currency are
 * returned so the caller can check them against the order it already has, and
 * a null settlement means "understood, nothing to change".
 */
export interface WebhookOutcome {
  eventId: string;
  sessionId: string | null;
  reference: string | null;
  amount: number | null;
  currency: string | null;
  settlement: Settlement | null;
  /** For the log — never the payload itself. */
  type: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /**
   * Verifies the request really came from the gateway and reads it. Throws
   * `WebhookVerificationError` when the signature does not check out — the
   * caller answers 400 and changes nothing.
   */
  readWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookOutcome>;
  /** Present only where the gateway supports refunds through its API. */
  refund?(providerTransactionId: string, amount: number): Promise<{ refundId: string; amount: number }>;
}

export class WebhookVerificationError extends Error {}
export class ProviderUnavailableError extends Error {}
