import { randomBytes, randomUUID } from 'node:crypto';
import type { Catalogue } from '../catalogue.ts';
import { titleFor } from '../catalogue.ts';
import type { NewOrder } from '../db/types.ts';

export class OrderRejected extends Error {
  readonly reason: string;
  constructor(reason: string, message: string) {
    super(message);
    this.reason = reason;
  }
}

/** EED-7K2M4QX9 — short enough to read down the phone, long enough not to guess. */
const reference = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  return `EED-${[...bytes].map((b) => alphabet[b % alphabet.length]).join('')}`;
};

export interface OrderRequest {
  sku: unknown;
  quantity: unknown;
  locale: unknown;
  customer?: { name?: unknown; email?: unknown; phone?: unknown };
}

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

/**
 * Turns a request into an order, or refuses it.
 *
 * Every figure here comes from the catalogue. The request contributes what the
 * buyer is entitled to choose — which piece, how many, how to be reached — and
 * nothing else; an amount sent by the browser is not read at all.
 */
export function buildOrder(catalogue: Catalogue, request: OrderRequest): NewOrder {
  const sku = text(request.sku, 64);
  if (!sku) throw new OrderRejected('sku_missing', 'No piece was chosen.');

  const item = catalogue.items.get(sku);
  if (!item) throw new OrderRejected('sku_unknown', 'That piece is not for sale online.');

  const quantity = Number(request.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.maxQuantity) {
    throw new OrderRejected('quantity_invalid', `Quantity must be a whole number between 1 and ${item.maxQuantity}.`);
  }

  const locale = ['en', 'he', 'ar'].includes(String(request.locale)) ? String(request.locale) : 'en';
  const email = text(request.customer?.email, 200);
  if (email && !EMAIL.test(email)) throw new OrderRejected('email_invalid', 'That email address does not look right.');

  const name = text(request.customer?.name, 120);
  if (!name) throw new OrderRejected('name_missing', 'A name is needed for the order.');

  const phone = text(request.customer?.phone, 40);
  if (!phone && !email) throw new OrderRejected('contact_missing', 'A phone number or an email address is needed.');

  const amount = item.unitAmount * quantity;
  return {
    reference: reference(),
    sku,
    title: titleFor(item, locale),
    quantity,
    unitAmount: item.unitAmount,
    amount,
    currency: item.currency,
    locale,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    // the browser is given this once, at checkout, and must present it to read
    // the order back — so an order cannot be read by guessing a reference
    statusToken: randomUUID().replaceAll('-', ''),
  };
}
