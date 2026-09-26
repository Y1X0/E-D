/**
 * The basket.
 *
 * It lives in the browser and nowhere else: a static site has no session to
 * hang it on, and a basket is not worth an account. What it holds is only ever
 * what was chosen and how many — never a price. Every figure the buyer is
 * shown is read from the page she is on, and the figure she is charged is
 * worked out again by the payment service from its own catalogue. Editing this
 * storage by hand changes what is in the basket, and nothing about the bill.
 */

import { MAX_PER_PIECE } from '~/data/basket';

const KEY = 'eed.basket.v1';
const CHANGED = 'eed:basket';

export interface BasketLine { sku: string; quantity: number }

const readable = (): Storage | null => {
  try {
    const probe = '__eed';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // private windows, blocked storage — the basket simply does not persist
    return null;
  }
};

let memory: BasketLine[] = [];

export function readBasket(): BasketLine[] {
  const store = readable();
  if (!store) return memory;
  try {
    const raw = JSON.parse(store.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map((row: any) => ({ sku: String(row?.sku ?? ''), quantity: Number(row?.quantity ?? 0) }))
      .filter((row) => row.sku && Number.isInteger(row.quantity) && row.quantity > 0)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function write(lines: BasketLine[]): BasketLine[] {
  const kept = lines.filter((l) => l.quantity > 0).slice(0, 12);
  const store = readable();
  memory = kept;
  try {
    store?.setItem(KEY, JSON.stringify(kept));
  } catch {
    /* full or blocked — the basket stays in memory for this page */
  }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: kept }));
  return kept;
}

/** Adds a piece, or adds to the count of one already there. */
export function addToBasket(sku: string, quantity = 1, max = MAX_PER_PIECE): BasketLine[] {
  const lines = readBasket();
  const line = lines.find((l) => l.sku === sku);
  if (line) line.quantity = Math.min(line.quantity + quantity, max);
  else lines.push({ sku, quantity: Math.min(quantity, max) });
  return write(lines);
}

export function setQuantity(sku: string, quantity: number, max = MAX_PER_PIECE): BasketLine[] {
  const lines = readBasket()
    .map((l) => (l.sku === sku ? { ...l, quantity: Math.max(0, Math.min(quantity, max)) } : l));
  return write(lines);
}

export const removeFromBasket = (sku: string): BasketLine[] =>
  write(readBasket().filter((l) => l.sku !== sku));

export const clearBasket = (): BasketLine[] => write([]);

export const basketCount = (lines = readBasket()): number =>
  lines.reduce((n, l) => n + l.quantity, 0);

/** Called whenever the basket changes, in this tab or another. */
export function onBasketChange(handler: (lines: BasketLine[]) => void): void {
  window.addEventListener(CHANGED, () => handler(readBasket()));
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) handler(readBasket());
  });
}
