import { randomBytes, randomUUID } from 'node:crypto';
import type { Catalogue } from '../catalogue.ts';
import { titleFor } from '../catalogue.ts';
import type { NewOrder, OrderItem } from '../db/types.ts';

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
  /** A basket. A single `sku`/`quantity` is still accepted and means one line. */
  items?: unknown;
  sku?: unknown;
  quantity?: unknown;
  locale: unknown;
  customer?: { name?: unknown; email?: unknown; phone?: unknown };
}

/** At most this many distinct pieces in one order — a basket, not a warehouse. */
const MAX_LINES = 12;

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

/** The lines of the basket, as the browser sent them, before pricing. */
const asked = (request: OrderRequest): Array<{ sku: string; quantity: number }> => {
  const rows = Array.isArray(request.items)
    ? request.items
    : [{ sku: request.sku, quantity: request.quantity }];

  if (!rows.length) throw new OrderRejected('sku_missing', 'The basket is empty.');
  if (rows.length > MAX_LINES) throw new OrderRejected('too_many_lines', 'That is more pieces than one order can hold.');

  const wanted = new Map<string, number>();
  for (const row of rows as Array<{ sku?: unknown; quantity?: unknown }>) {
    const sku = text(row?.sku, 64);
    if (!sku) throw new OrderRejected('sku_missing', 'No piece was chosen.');
    const quantity = Number(row?.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new OrderRejected('quantity_invalid', 'Quantity must be a whole number, one or more.');
    }
    // the same piece twice is one line of two, not two lines
    wanted.set(sku, (wanted.get(sku) ?? 0) + quantity);
  }
  return [...wanted].map(([sku, quantity]) => ({ sku, quantity }));
};

/**
 * Turns a request into an order, or refuses it.
 *
 * Every figure here comes from the catalogue. The request contributes what the
 * buyer is entitled to choose — which pieces, how many, how to be reached — and
 * nothing else; an amount sent by the browser is not read at all.
 */
export function buildOrder(catalogue: Catalogue, request: OrderRequest): NewOrder {
  const locale = ['en', 'he', 'ar'].includes(String(request.locale)) ? String(request.locale) : 'en';

  const items: OrderItem[] = asked(request).map(({ sku, quantity }) => {
    const item = catalogue.items.get(sku);
    if (!item) throw new OrderRejected('sku_unknown', 'That piece is not for sale online.');
    if (quantity > item.maxQuantity) {
      throw new OrderRejected('quantity_invalid', `Quantity must be a whole number between 1 and ${item.maxQuantity}.`);
    }
    return {
      sku,
      title: titleFor(item, locale),
      quantity,
      unitAmount: item.unitAmount,
      amount: item.unitAmount * quantity,
    };
  });

  // one currency per order: the catalogue is priced in one, and a basket that
  // somehow mixed them could not be charged as a single amount
  const currency = items[0] ? catalogue.items.get(items[0].sku)!.currency : catalogue.currency;
  if (items.some((i) => catalogue.items.get(i.sku)!.currency !== currency)) {
    throw new OrderRejected('currency_mixed', 'Those pieces are priced in different currencies.');
  }
  const email = text(request.customer?.email, 200);
  if (email && !EMAIL.test(email)) throw new OrderRejected('email_invalid', 'That email address does not look right.');

  const name = text(request.customer?.name, 120);
  if (!name) throw new OrderRejected('name_missing', 'A name is needed for the order.');

  const phone = text(request.customer?.phone, 40);
  if (!phone && !email) throw new OrderRejected('contact_missing', 'A phone number or an email address is needed.');

  const amount = items.reduce((sum, i) => sum + i.amount, 0);
  const extra = items.length - 1;
  return {
    reference: reference(),
    items,
    // how the order reads in a list: the first piece, and how many joined it
    title: extra > 0 ? `${items[0]!.title} +${extra}` : items[0]!.title,
    amount,
    currency,
    locale,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    // the browser is given this once, at checkout, and must present it to read
    // the order back — so an order cannot be read by guessing a reference
    statusToken: randomUUID().replaceAll('-', ''),
  };
}
