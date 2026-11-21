import type { AssetId } from '@/domain/ids';
import type {
  ChartRange,
  ListedAsset,
  LiveUpdate,
  MarketSnapshot,
  PricePoint,
  ProviderId,
} from '@/domain/market';

// Every crypto adapter implements this and passes the shared contract suite
// (test/providers/contract-suite.ts). See docs/architecture/providers.md.
export interface CryptoProvider {
  readonly id: ProviderId;
  // Shown in the UI as the data source.
  readonly name: string;
  // The asset prices are quoted in. The app treats USDT as USD.
  readonly quoteAsset: 'USD' | 'USDT';
  listAssets(signal?: AbortSignal): Promise<ListedAsset[]>;
  snapshot(signal?: AbortSignal): Promise<MarketSnapshot>;
  // Oldest point first. Rejects with ProviderDataError for an asset the provider does not list.
  history(assetId: AssetId, range: ChartRange, signal?: AbortSignal): Promise<PricePoint[]>;
  // The WebSocket protocol for live prices of at least `assetIds`. The market-data service owns
  // the socket itself: connecting, reconnecting, and closing.
  liveFeed(assetIds: readonly AssetId[]): Promise<LiveFeed>;
}

export type LiveFeed = {
  url: string;
  // Messages to send once the socket opens.
  subscribeMessages: string[];
  // The provider closes connections older than this. The service reconnects before then.
  maxAgeMs: number | null;
  // Turns one message into updates. Messages without prices (heartbeats, acks) give [].
  parse(message: string): LiveUpdate[];
};

export type ProviderOptions = {
  fetch?: typeof fetch;
  now?: () => number;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// One candle size per range, shared by every adapter so charts look the same on each provider.
// Each range stays under Kraken's 720-candle limit per call. `span` null means all history the
// provider returns in one call.
export type CandleMinutes = 5 | 60 | 240 | 1440 | 10080;

export const RANGE_CANDLES: Record<ChartRange, { minutes: CandleMinutes; span: number | null }> = {
  '1D': { minutes: 5, span: DAY },
  '1W': { minutes: 60, span: 7 * DAY },
  '1M': { minutes: 240, span: 30 * DAY },
  '1Y': { minutes: 1440, span: 365 * DAY },
  ALL: { minutes: 10080, span: null },
};
