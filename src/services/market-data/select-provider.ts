import { z } from 'zod';

import type { MarketSnapshot, ProviderId } from '@/domain/market';
import type { CryptoProvider } from '@/providers/contract';
import { storage } from '@/shared/storage';

const STORAGE_KEY = 'market.provider';
const providerIdSchema = z.enum(['binance', 'kraken']);

export type Selection = { provider: CryptoProvider; snapshot: MarketSnapshot };

// Tries each provider in order and keeps the first that returns a snapshot (ADR 0004). Binance
// refuses some locations with HTTP 451. Any failure moves on, because a provider that cannot
// serve a snapshot cannot serve the session. The snapshot doubles as the first prices.
export async function selectProvider(
  providers: readonly CryptoProvider[],
  signal?: AbortSignal,
): Promise<Selection> {
  const errors: unknown[] = [];
  for (const provider of providers) {
    try {
      const snapshot = await provider.snapshot(signal);
      storage.set(STORAGE_KEY, provider.id);
      return { provider, snapshot };
    } catch (error) {
      if (signal?.aborted) throw error;
      errors.push(error);
    }
  }
  throw new AggregateError(errors, 'No market data provider is reachable');
}

// The provider of the last successful session. Labels cached prices when the app is offline.
export function lastProviderId(): ProviderId | null {
  const parsed = providerIdSchema.safeParse(storage.getString(STORAGE_KEY));
  return parsed.success ? parsed.data : null;
}
