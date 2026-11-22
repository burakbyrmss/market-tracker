import { create } from 'zustand';

import { rankTopCoins } from '@/domain/asset-classes';

import type { AssetId, CurrencyCode } from '@/domain/ids';
import type { LiveUpdate, MarketSnapshot, ProviderId } from '@/domain/market';
import type { Decimal } from '@/domain/money';

export type LiveQuote = {
  price: Decimal;
  change24hPct: number | null;
  volume24h: number;
  updatedAt: number;
};

export type MarketStatus = 'idle' | 'loading' | 'live' | 'error';

// The provider behind the prices on screen. `quoteAsset` lets the detail screen say when a
// "USD" price is really a USDT price.
export type MarketSource = { id: ProviderId; name: string; quoteAsset: 'USD' | 'USDT' };

export type DirectPrices = ReadonlyMap<CurrencyCode, Decimal>;

type LivePricesState = {
  status: MarketStatus;
  source: MarketSource | null;
  quotes: Readonly<Record<string, LiveQuote>>;
  directPrices: Readonly<Record<string, DirectPrices>>;
  // The market list order. Set from each snapshot, not from live updates, so rows do not jump
  // around every second.
  ranking: readonly AssetId[];
  // Every coin the provider lists, by volume, including the ones the ranking hides. Search
  // covers these. Like the ranking, it changes only with a snapshot.
  listed: readonly AssetId[];
};

const INITIAL: LivePricesState = {
  status: 'idle',
  source: null,
  quotes: {},
  directPrices: {},
  ranking: [],
  listed: [],
};

export const RANKING_SIZE = 100;

// One store, written by one WebSocket. Each row reads its own asset with useLiveQuote, so a
// price change re-renders only that row (ADR 0003).
export const useLivePrices = create<LivePricesState>(() => INITIAL);

export function useLiveQuote(assetId: AssetId): LiveQuote | undefined {
  return useLivePrices((state) => state.quotes[assetId]);
}

const NO_DIRECT_PRICES: DirectPrices = new Map();

// A stable empty map for coins without direct pairs, so their rows do not re-render.
export function useDirectPrices(assetId: AssetId): DirectPrices {
  return useLivePrices((state) => state.directPrices[assetId] ?? NO_DIRECT_PRICES);
}

export function resetLivePrices() {
  useLivePrices.setState(INITIAL, true);
}

export function setMarketStatus(status: MarketStatus) {
  useLivePrices.setState({ status });
}

export function applySnapshot(
  snapshot: MarketSnapshot,
  provider: { name: string; quoteAsset: 'USD' | 'USDT' },
) {
  const quotes: Record<string, LiveQuote> = {};
  for (const quote of snapshot.quotes) {
    quotes[quote.assetId] = {
      price: quote.price,
      change24hPct: quote.change24hPct,
      volume24h: quote.volume24h,
      updatedAt: quote.updatedAt,
    };
  }
  const directPrices: Record<string, DirectPrices> = {};
  for (const [assetId, prices] of snapshot.directPrices) directPrices[assetId] = new Map(prices);
  useLivePrices.setState({
    source: { id: snapshot.source, name: provider.name, quoteAsset: provider.quoteAsset },
    quotes,
    directPrices,
    ranking: rankTopCoins(snapshot.quotes, RANKING_SIZE),
    listed: [...snapshot.quotes]
      .sort((a, b) => b.volume24h - a.volume24h)
      .map((quote) => quote.assetId),
  });
}

// Only changed assets get new objects. Unchanged rows keep their reference and skip re-render.
export function applyUpdates(updates: readonly LiveUpdate[]) {
  const { quotes, directPrices } = useLivePrices.getState();
  const nextQuotes = { ...quotes };
  let nextDirect: Record<string, DirectPrices> | null = null;

  for (const update of updates) {
    if (update.quote === 'USD') {
      const previous = nextQuotes[update.assetId];
      nextQuotes[update.assetId] = {
        price: update.price,
        // Keep the last known value when the update has none.
        change24hPct: update.change24hPct ?? previous?.change24hPct ?? null,
        volume24h: update.volume24h ?? previous?.volume24h ?? 0,
        updatedAt: update.updatedAt,
      };
    } else {
      nextDirect ??= { ...directPrices };
      nextDirect[update.assetId] = new Map(nextDirect[update.assetId]).set(
        update.quote,
        update.price,
      );
    }
  }
  useLivePrices.setState({ quotes: nextQuotes, directPrices: nextDirect ?? directPrices });
}
