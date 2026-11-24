import { queryOptions } from '@tanstack/react-query';
import { AppState } from 'react-native';

import type { AssetId } from '@/domain/ids';
import type { ChartRange, ProviderId } from '@/domain/market';

import { createBinanceProvider } from '@/providers/binance';
import { createKrakenProvider } from '@/providers/kraken';
import { OFFLINE_MAX_AGE_MS, persisted } from '@/shared/query/persist';
import { storedPricePoints } from '@/shared/storage/schemas';

import { savedPrices } from './saved-prices';
import { createMarketDataService } from './service';

export {
  useDirectPrices,
  useLivePrices,
  useLiveQuote,
  type DirectPrices,
  type LiveQuote,
  type MarketSource,
  type MarketStatus,
} from './live-prices';
export { lastProviderId } from './select-provider';

// Binance first, Kraken as fallback (ADR 0004).
export const marketData = createMarketDataService({
  providers: [createBinanceProvider(), createKrakenProvider()],
  appState: AppState,
  cache: savedPrices,
});

const MINUTE = 60_000;

// About one candle: a 1D chart has 5-minute candles, so it is stale after a few minutes.
const STALE: Record<ChartRange, number> = {
  '1D': 2 * MINUTE,
  '1W': 15 * MINUTE,
  '1M': 60 * MINUTE,
  '1Y': 6 * 60 * MINUTE,
  ALL: 24 * 60 * MINUTE,
};

export const cryptoQueries = {
  // The provider is part of the key, so a session on another provider never shows cached
  // candles from the first.
  history: (provider: ProviderId, assetId: AssetId, range: ChartRange) =>
    queryOptions({
      queryKey: ['crypto', 'history', provider, assetId, range],
      queryFn: ({ signal }) => marketData.history(assetId, range, signal),
      staleTime: STALE[range],
      gcTime: OFFLINE_MAX_AGE_MS,
    }),
};

// Saved on the device, so a chart opened offline shows its last copy.
export const cryptoPersisted = [
  persisted({
    key: ['crypto', 'history'],
    schema: storedPricePoints,
    toStored: (points) => points,
  }),
];
