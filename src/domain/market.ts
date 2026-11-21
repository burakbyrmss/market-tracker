import type { AssetId, CurrencyCode } from './ids';
import type { Decimal } from './money';

export type ProviderId = 'binance' | 'kraken';

// A coin the provider lists against USD (or USDT), with the fiat currencies it also has direct
// pairs for.
export type ListedAsset = {
  id: AssetId;
  directFiat: readonly CurrencyCode[];
};

export type Quote = {
  assetId: AssetId;
  // In the provider's quote asset (USD or USDT, treated as USD).
  price: Decimal;
  // Rolling 24 hours. Null when the source does not provide a rolling 24-hour value.
  change24hPct: number | null;
  // Rolling 24-hour volume in the quote asset. Used for ranking and display only.
  volume24h: number;
  // Milliseconds since the epoch.
  updatedAt: number;
};

export type MarketSnapshot = {
  source: ProviderId;
  quotes: readonly Quote[];
  // Prices from direct fiat pairs, such as BTCEUR. Input to cryptoDisplayPrice.
  directPrices: ReadonlyMap<AssetId, ReadonlyMap<CurrencyCode, Decimal>>;
};

export const CHART_RANGES = ['1D', '1W', '1M', '1Y', 'ALL'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

// Plain numbers: chart data is for plotting only.
export type PricePoint = {
  // Milliseconds since the epoch, at the start of the candle.
  time: number;
  // Closing price of the candle.
  price: number;
};

// One live price change from the provider's WebSocket.
export type LiveUpdate = {
  assetId: AssetId;
  // USD for the coin's main price, or a fiat currency for a direct pair.
  quote: 'USD' | CurrencyCode;
  price: Decimal;
  change24hPct: number | null;
  volume24h: number | null;
  updatedAt: number;
};

// FX history is daily ECB data, so ranges start at a month (docs/product/requirements.md).
export const FX_RANGES = ['1M', '1Y', '5Y'] as const;
export type FxRange = (typeof FX_RANGES)[number];
