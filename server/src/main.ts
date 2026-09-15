import { loadEnv } from './env.ts';
import { loadCatalogue } from './catalogue.ts';
import { MemoryStore } from './db/memory.ts';
import { PostgresStore } from './db/postgres.ts';
import { providerFor } from './providers/index.ts';
import { createApp } from './http/app.ts';
import { log } from './logging.ts';

const env = loadEnv();
const catalogue = loadCatalogue();
const provider = providerFor(env);

// A memory store is only ever acceptable while developing; in production the
// service refuses to start without a database rather than lose a payment.
if (!env.databaseUrl && env.nodeEnv === 'production') throw new Error('DATABASE_URL is not set');
const store = env.databaseUrl ? new PostgresStore(env.databaseUrl) : new MemoryStore();

const app = createApp({ env, store, provider, catalogue });
const server = app.listen(env.port, () => {
  log.info('payment service listening', {
    port: env.port, provider: provider.name, currency: env.currency,
    storage: env.databaseUrl ? 'postgres' : 'memory',
    pieces: catalogue.items.size,
    webhook: `${env.baseUrl}/api/webhooks/${provider.name}`,
  });
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(async () => { await store.close(); process.exit(0); });
  });
}
