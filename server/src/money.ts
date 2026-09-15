/**
 * Money is held as an integer number of minor units — agorot for the shekel —
 * from the moment it leaves the catalogue until it is displayed. No amount is
 * ever a float, so no amount is ever 2499.9999999999995.
 */
export type Minor = number;

const MINOR_DIGITS: Record<string, number> = { ILS: 2, USD: 2, EUR: 2, JOD: 3 };

export const minorDigits = (currency: string): number => MINOR_DIGITS[currency.toUpperCase()] ?? 2;

/** 2500 ₪ → 250000 agorot. Whole units only: the atelier prices in shekels. */
export function toMinor(units: number, currency: string): Minor {
  const factor = 10 ** minorDigits(currency);
  return Math.round(units * factor);
}

export function formatMinor(amount: Minor, currency: string): string {
  const factor = 10 ** minorDigits(currency);
  const units = amount / factor;
  const text = Number.isInteger(units) ? units.toLocaleString('en-US') : units.toFixed(minorDigits(currency));
  return currency.toUpperCase() === 'ILS' ? `${text} ₪` : `${text} ${currency.toUpperCase()}`;
}

/** Guards every amount that crosses a boundary: a webhook, a request, the ledger. */
export function assertMinor(amount: unknown, what = 'amount'): asserts amount is Minor {
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`${what} must be a positive whole number of minor units`);
  }
}
