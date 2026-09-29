import type { CheckoutRequest, CheckoutSession, PaymentProvider, WebhookOutcome } from './types.ts';
import { ProviderUnavailableError } from './types.ts';

/**
 * uPay — יופיי פיננסים בע"מ. Deliberately unimplemented.
 *
 * Everything around this file is finished: the order is written and priced
 * before the buyer leaves, the state machine refuses illegal moves, webhook
 * events are deduplicated by id and settled under a row lock, and the amount
 * and currency on a notification are compared against the stored order before
 * anything is called paid. This class is the only missing piece, and it stays
 * missing on purpose.
 *
 * It is not written because the official uPay integration document has not
 * been obtained. Each Israeli acquirer — uPay, Grow, Meshulam, PayPlus,
 * Tranzila, Cardcom — has its own request shape, its own field names and its
 * own signing scheme, and they are not interchangeable. Two things follow from
 * guessing instead of reading:
 *
 *   A wrong endpoint or field fails loudly and merely wastes everyone's time.
 *
 *   A wrong signature check fails SILENTLY and expensively. If verification is
 *   implemented against an assumed scheme, anyone who can reach the webhook URL
 *   can post `status=paid` for a real order reference and receive a gown that
 *   was never paid for. That is the reason this file throws rather than
 *   approximates.
 *
 * The merchant account itself is ready: registered business, bank account on
 * file, and an API key issued in the panel — which is what establishes that an
 * API exists. What is absent is its specification.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NEEDED FROM uPay, BEFORE A LINE OF THIS IS WRITTEN
 * ---------------------------------------------------------------------------
 * Ask uPay support (the panel's עזרה, or צור קשר) for `מסמך API למפתחים`, and
 * ask them to register the notification URL below. Expect a one-time setup fee.
 * Every item here must come from that document, quoted, not inferred.
 *
 * A. Credentials and authentication
 *      A1  Which of the panel's values authenticate a request (the API key, a
 *          terminal or masof number, a password), and under what names.
 *      A2  How they are carried: header, body field, or query.
 *      A3  Whether the caller's IP must be allow-listed, and where.
 *
 * B. Creating a payment page  →  implements `createCheckout`
 *      B1  Full endpoint URL and HTTP method.
 *      B2  Content type and body encoding (JSON, form, XML).
 *      B3  Every request field, with its exact name, type and whether it is
 *          required — in particular the fields carrying:
 *            • the amount, and its UNIT (shekels or agorot; this service holds
 *              integer agorot and must convert, not assume)
 *            • the currency
 *            • our own order reference (`order.reference`, e.g. EED-7K2M4QX9),
 *              so the notification can be matched back
 *            • the item description
 *            • the success and cancel return URLs
 *            • the language of the hosted page, if selectable
 *      B4  The response: where the page URL is, and where the gateway's own
 *          session or transaction id is. Both are required —
 *          `CheckoutSession` returns `{ sessionId, redirectUrl }`.
 *      B5  Error responses: shape, and which are retryable.
 *      B6  Whether a created page is single-use or reusable, and whether it
 *          expires. (A standing link previously returned the provider's
 *          security block page when opened from a phone, which is part of why
 *          the API route is being taken.)
 *
 * C. The return to the site
 *      C1  What uPay appends to the return URL. The service already carries its
 *          own `ref` and `t` query parameters and must keep them intact.
 *      C2  Confirmation that the redirect is NOT treated as settlement. It is
 *          not, here: the success page asks this service what happened.
 *
 * D. The notification  →  implements `readWebhook`
 *      D1  Delivery: method, content type, and whether the body is JSON, form
 *          encoded, or query parameters.
 *      D2  Every field, by exact name: the event or notification id (what makes
 *          a redelivery harmless), the transaction id, our order reference, the
 *          amount, the currency, and the status.
 *      D3  The complete set of status values and their meanings, so each can be
 *          mapped onto PAID / FAILED / CANCELLED / REFUNDED — or onto null,
 *          meaning acknowledged and ignored.
 *      D4  Retry behaviour: how often uPay redelivers, for how long, and what
 *          HTTP response it treats as accepted.
 *      D5  Whether refunds and chargebacks arrive here too, and under which
 *          status values.
 *
 * E. Verifying the notification really came from uPay  ← the critical one
 *      E1  The algorithm (HMAC-SHA256, MD5 of concatenated fields, or other).
 *      E2  EXACTLY what is signed: the raw body bytes, or a named list of
 *          fields in a stated order, with the exact separator and the exact
 *          treatment of absent fields.
 *      E3  Which secret signs it, and where that secret is obtained.
 *      E4  Where the signature arrives (header name, or body field) and its
 *          encoding (hex, base64, upper or lower case).
 *      E5  A worked example from the document: a sample payload with its
 *          correct signature, so the implementation can be tested against a
 *          known-good case rather than against itself.
 *
 * F. Test facilities
 *      F1  Whether a sandbox or test terminal exists, and its credentials.
 *      F2  Test card numbers and the amounts that force each outcome.
 *
 * The notification URL to register:
 *   https://elite-evening-payments.onrender.com/api/webhooks/local-il
 *
 * ---------------------------------------------------------------------------
 * WHAT THE IMPLEMENTATION MUST AND MUST NOT DO
 * ---------------------------------------------------------------------------
 * `createCheckout` receives an order that is already written and priced. It
 * posts that order to uPay and returns the hosted page's URL and the gateway's
 * session id. It must not price anything itself.
 *
 * `readWebhook` must, in this order:
 *
 *   1. Verify the signature over the RAW bytes. The body must not be parsed
 *      before it verifies — `express.raw()` already hands it over unparsed, and
 *      re-serialising a parsed body changes the bytes and breaks the check.
 *      Compare with `crypto.timingSafeEqual`, never `===`.
 *   2. Throw `WebhookVerificationError` when it does not verify. The route
 *      answers 400 and nothing moves.
 *   3. Only then read the payload, and return `WebhookOutcome` with the event
 *      id, the gateway's session and transaction ids, our order reference, the
 *      amount in agorot, the currency, and the mapped settlement.
 *
 * A status field is never sufficient on its own. It is trusted only once the
 * signature has verified, and the caller then independently compares the
 * returned amount and currency against the order it already holds before the
 * state machine is allowed to move. Do not move that check in here, and do not
 * remove it.
 *
 * Nothing else in this service needs to change. Set PAYMENT_PROVIDER=local-il
 * once this is written, with the credentials in Render's environment — never in
 * this repository.
 */

/** What this adapter cannot do until the document above is in hand. */
const UNSPECIFIED = 'The uPay adapter is unimplemented: the official integration document '
  + '(מסמך API למפתחים) has not been obtained. server/src/providers/local-il.ts lists '
  + 'exactly what is required. Nothing here is guessed.';

export class IsraeliAcquirerProvider implements PaymentProvider {
  readonly name = 'local-il';

  async createCheckout(_request: CheckoutRequest): Promise<CheckoutSession> {
    throw new ProviderUnavailableError(UNSPECIFIED);
  }

  async readWebhook(
    _rawBody: Buffer,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookOutcome> {
    // Refusing is the safe answer: an adapter that cannot verify a signature
    // must never report a settlement, because a caller that trusted it would
    // mark an unpaid order paid.
    throw new ProviderUnavailableError(UNSPECIFIED);
  }
}
