/**
 * The payment lifecycle.
 *
 * A payment moves forward only through the transitions listed here, and only
 * ever in the database. Nothing the browser says moves it: the success page is
 * a redirect, not a receipt.
 */
export const PAYMENT_STATES = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

const NEXT: Record<PaymentState, readonly PaymentState[]> = {
  // created, the buyer has not reached the gateway yet
  PENDING: ['PROCESSING', 'CANCELLED', 'FAILED'],
  // handed to the gateway; the money is in flight
  PROCESSING: ['PAID', 'FAILED', 'CANCELLED'],
  // settled. Only a refund moves it again
  PAID: ['REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export const canTransition = (from: PaymentState, to: PaymentState): boolean =>
  from === to || NEXT[from].includes(to);

/** True once the order is owed nothing further — used to stop repeat work. */
export const isSettled = (state: PaymentState): boolean =>
  state === 'PAID' || state === 'REFUNDED';

export const isFinished = (state: PaymentState): boolean =>
  isSettled(state) || state === 'FAILED' || state === 'CANCELLED';

export class TransitionError extends Error {
  readonly from: PaymentState;
  readonly to: PaymentState;
  constructor(from: PaymentState, to: PaymentState) {
    super(`refusing to move a payment from ${from} to ${to}`);
    this.from = from;
    this.to = to;
  }
}
