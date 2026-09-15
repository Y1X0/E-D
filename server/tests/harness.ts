import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { loadEnv } from '../src/env.ts';
import type { Catalogue } from '../src/catalogue.ts';
import { MemoryStore } from '../src/db/memory.ts';
import type { Store } from '../src/db/types.ts';
import { MockProvider } from '../src/providers/mock.ts';
import type { PaymentProvider } from '../src/providers/types.ts';
import { createApp } from '../src/http/app.ts';

export const SECRET = 'test-secret';
export const SITE = 'https://atelier.test';

/** One priced piece, so the tests do not depend on what the atelier sells today. */
export const catalogue: Catalogue = {
  currency: 'ILS',
  items: new Map([['boutique-01', {
    sku: 'boutique-01', collection: 'boutique',
    unitAmount: 250000, currency: 'ILS', maxQuantity: 5,
    titles: { en: 'Boutique — Look 01', ar: 'البوتيك — إطلالة 01', he: 'בוטיק — לוק 01' },
    notes: { en: 'Light fabric.', ar: 'قماش خفيف.', he: 'בד קל.' },
  }]]),
};

export interface Harness {
  url: string;
  store: Store;
  provider: MockProvider;
  server: Server;
  stop(): Promise<void>;
  post(path: string, body: unknown, headers?: Record<string, string>): Promise<Response>;
  get(path: string): Promise<Response>;
  /** A signed webhook, exactly as the gateway would send it. */
  webhook(body: Record<string, unknown>, signature?: string): Promise<Response>;
  checkout(body?: Record<string, unknown>): Promise<{ reference: string; statusToken: string; amount: number; redirectUrl: string }>;
}

export async function start(options: { store?: Store; provider?: PaymentProvider } = {}): Promise<Harness> {
  const env = loadEnv({
    PAYMENT_PROVIDER: 'mock',
    SITE_URL: SITE,
    PAYMENT_WEBHOOK_SECRET: SECRET,
    PAYMENT_BASE_URL: 'https://pay.atelier.test',
    NODE_ENV: 'test',
  } as NodeJS.ProcessEnv);

  const store = options.store ?? new MemoryStore();
  const provider = (options.provider ?? new MockProvider(SECRET, env.baseUrl)) as MockProvider;
  const app = createApp({ env, store, provider, catalogue });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${url}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: SITE, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  return {
    url, store, provider, server,
    post,
    get: (path: string) => fetch(`${url}${path}`, { headers: { origin: SITE } }),
    webhook: (body, signature) => {
      const raw = JSON.stringify(body);
      return post('/api/webhooks/mock', raw, { 'x-mock-signature': signature ?? provider.sign(raw) });
    },
    async checkout(body = {}) {
      const res = await post('/api/checkout', {
        sku: 'boutique-01', quantity: 1, locale: 'ar',
        customer: { name: 'Test Buyer', phone: '+972500000000' },
        ...body,
      });
      if (res.status !== 201) throw new Error(`checkout failed: ${res.status} ${await res.text()}`);
      return res.json() as Promise<{ reference: string; statusToken: string; amount: number; redirectUrl: string }>;
    },
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
