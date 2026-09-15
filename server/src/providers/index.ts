import type { Env } from '../env.ts';
import type { PaymentProvider } from './types.ts';
import { StripeProvider } from './stripe.ts';
import { MockProvider } from './mock.ts';
import { IsraeliAcquirerProvider } from './local-il.ts';

/** The one gateway this deployment talks to, chosen by PAYMENT_PROVIDER. */
export function providerFor(env: Env): PaymentProvider {
  switch (env.provider) {
    case 'stripe':
      return new StripeProvider(env.stripe.secretKey, env.stripe.webhookSecret);
    case 'local-il':
      return new IsraeliAcquirerProvider();
    case 'mock':
      return new MockProvider(env.stripe.webhookSecret, env.baseUrl);
    default:
      throw new Error(`unknown PAYMENT_PROVIDER: ${env.provider}`);
  }
}
