import type { PaymentState } from '../domain/state.ts';

/** An order is created before the buyer ever reaches the gateway. */
export interface Order {
  id: string;
  reference: string;
  status: PaymentState;
  sku: string;
  title: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
  locale: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  /** Secret handed to the buyer's own browser so it may read this order back. */
  statusToken: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
}

/** What is needed to reconcile a payment — and nothing else. Never card data. */
export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerSessionId: string | null;
  providerTransactionId: string | null;
  amount: number;
  currency: string;
  status: PaymentState;
  failureReason: string | null;
  refundedAmount: number;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
}

export interface NewOrder {
  reference: string;
  sku: string;
  title: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
  locale: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  statusToken: string;
}

export interface Settlement {
  status: PaymentState;
  providerTransactionId?: string | null;
  failureReason?: string | null;
  paidAt?: Date | null;
  refundedAmount?: number;
}

/**
 * Everything the service does to storage. Two implementations: Postgres in
 * production, and an in-memory one the tests run against, so the whole payment
 * flow is exercised without a database.
 */
export interface Store {
  createOrderWithPayment(order: NewOrder, provider: string): Promise<{ order: Order; payment: Payment }>;
  orderByReference(reference: string): Promise<Order | null>;
  paymentForOrder(orderId: string): Promise<Payment | null>;
  paymentByProviderSession(provider: string, sessionId: string): Promise<Payment | null>;
  attachSession(paymentId: string, sessionId: string): Promise<void>;
  /**
   * Moves a payment and its order together, refusing any move the state
   * machine does not allow, and taking a row lock so two webhooks delivered at
   * the same moment cannot both settle the same order.
   */
  settle(paymentId: string, next: Settlement): Promise<{ payment: Payment; changed: boolean }>;
  /** True the first time this event is seen; false for every redelivery. */
  rememberEvent(provider: string, eventId: string): Promise<boolean>;
  listPayments(limit: number): Promise<Array<Payment & { reference: string; title: string }>>;
  close(): Promise<void>;
}
