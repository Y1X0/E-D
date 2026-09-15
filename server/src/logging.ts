/**
 * Logging that cannot leak a payment.
 *
 * Card data never reaches this service — the buyer types it on the gateway's
 * own page — but gateway payloads still carry keys, signatures and customer
 * details. Everything is written through `redact`, which drops the known
 * sensitive keys and anything that looks like a key or a card number.
 */
const SENSITIVE = new Set([
  'card', 'cardnumber', 'card_number', 'number', 'cvv', 'cvc', 'cvv2', 'pin',
  'expiry', 'exp_month', 'exp_year', 'secret', 'client_secret', 'password',
  'authorization', 'signature', 'stripe-signature', 'token', 'apikey', 'api_key',
  'server_key', 'webhook_secret', 'admin_token',
]);

const LOOKS_LIKE_KEY = /\b(sk|rk|whsec|pk)_[A-Za-z0-9_]{6,}/g;
const LOOKS_LIKE_PAN = /\b(?:\d[ -]*?){13,19}\b/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[deep]';
  if (typeof value === 'string') {
    return value.replace(LOOKS_LIKE_KEY, '[redacted-key]').replace(LOOKS_LIKE_PAN, '[redacted-number]');
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.has(k.toLowerCase()) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

const write = (level: string, message: string, fields?: Record<string, unknown>) => {
  const line = { level, at: new Date().toISOString(), message, ...(fields ? (redact(fields) as object) : {}) };
  process.stdout.write(`${JSON.stringify(line)}\n`);
};

export const log = {
  info: (message: string, fields?: Record<string, unknown>) => write('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write('error', message, fields),
};
