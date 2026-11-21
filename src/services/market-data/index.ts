import { AppState } from 'react-native';

import { createBinanceProvider } from '@/providers/binance';
import { createKrakenProvider } from '@/providers/kraken';

import { createMarketDataService } from './service';

export { useLivePrices, useLiveQuote, type LiveQuote, type MarketStatus } from './live-prices';
export { lastProviderId } from './select-provider';

// Binance first, Kraken as fallback (ADR 0004).
export const marketData = createMarketDataService({
  providers: [createBinanceProvider(), createKrakenProvider()],
  appState: AppState,
});
