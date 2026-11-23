import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { FxRates } from '@/domain/fx';
import type { AssetId, CurrencyCode } from '@/domain/ids';
import type { MarketSnapshot, Quote } from '@/domain/market';
import { decimal } from '@/domain/money';
import { fxQueries } from '@/services/fx';
import { applySnapshot, setMarketStatus } from '@/services/market-data/live-prices';

export const asset = (id: string) => id as AssetId;
export const currency = (code: string) => code as CurrencyCode;

const quote = (id: string, price: string, volume24h: number, change: number | null): Quote => ({
  assetId: asset(id),
  price: decimal(price),
  change24hPct: change,
  volume24h,
  updatedAt: 0,
});

// BTC has a direct EUR pair. ETH and DOGE have only USDT pairs.
export const snapshot: MarketSnapshot = {
  source: 'binance',
  quotes: [
    quote('ETH', '2500', 500, -1.5),
    quote('BTC', '50000', 1000, 2.5),
    quote('USDC', '1', 5000, 0),
    quote('DOGE', '0.1', 100, null),
  ],
  directPrices: new Map([[asset('BTC'), new Map([[currency('EUR'), decimal('46000')]])]]),
};

// Per euro, as the ECB publishes. USD to TRY is 44 / 1.1 = 40, USD to EUR is 1 / 1.1.
export const fx: FxRates = {
  base: currency('EUR'),
  date: '2023-11-14',
  rates: new Map([
    [currency('USD'), decimal('1.1')],
    [currency('TRY'), decimal('44')],
  ]),
};

export function goLive() {
  applySnapshot(snapshot, { name: 'Binance', quoteAsset: 'USDT' });
  setMarketStatus('live');
}

// `seed` puts other data in the cache, such as chart history, so no test reaches the network.
export async function renderWithQuery(
  ui: ReactElement,
  rates: FxRates | null = fx,
  seed: (client: QueryClient) => void = () => {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  if (rates) client.setQueryData(fxQueries.latest().queryKey, rates);
  seed(client);
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
