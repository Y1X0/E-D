/**
 * Configuration, read once at boot and never from anywhere else.
 *
 * Credentials live only here, only in the environment. Nothing in this file is
 * ever logged, returned in a response, or written to the database.
 */
export type ProviderName = 'stripe' | 'local-il' | 'mock';

export interface Env {
  nodeEnv: string;
  port: number;
  provider: ProviderName;
  /** Origin of the website — the only origin allowed to call this service. */
  siteUrl: string;
  /** Public origin of this service, where the gateway sends its webhooks. */
  baseUrl: string;
  returnUrl: string;
  cancelUrl: string;
  databaseUrl: string;
  adminToken: string;
  currency: string;
  stripe: { secretKey: string; webhookSecret: string };
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const get = (name: string, fallback = ''): string => source[name]?.trim() || fallback;
  const need = (name: string): string => {
    const value = get(name);
    if (!value) throw new Error(`${name} is not set`);
    return value;
  };

  const provider = get('PAYMENT_PROVIDER', 'mock') as ProviderName;
  const siteUrl = get('SITE_URL', 'http://localhost:4321').replace(/\/$/, '');
  const port = Number(get('PORT', '4000'));

  return {
    nodeEnv: get('NODE_ENV', 'development'),
    port,
    provider,
    siteUrl,
    baseUrl: get('PAYMENT_BASE_URL', `http://localhost:${port}`).replace(/\/$/, ''),
    // the gateway returns the buyer to these pages; each then asks this service
    // what actually happened, because a redirect proves nothing
    returnUrl: get('PAYMENT_RETURN_URL', `${siteUrl}/payment/success`),
    cancelUrl: get('PAYMENT_CANCEL_URL', `${siteUrl}/payment/cancelled`),
    databaseUrl: get('DATABASE_URL'),
    adminToken: get('ADMIN_TOKEN'),
    currency: get('PAYMENT_CURRENCY', 'ILS').toUpperCase(),
    stripe: {
      secretKey: provider === 'stripe' ? need('PAYMENT_SERVER_KEY') : get('PAYMENT_SERVER_KEY'),
      webhookSecret: provider === 'stripe' ? need('PAYMENT_WEBHOOK_SECRET') : get('PAYMENT_WEBHOOK_SECRET'),
    },
  };
}
