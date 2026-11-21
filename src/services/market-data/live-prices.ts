import { create } from 'zustand';

import type { AssetId } from '@/domain/ids';
import type { LiveUpdate, MarketSnapshot, ProviderId } from '@/domain/market';
import type { Decimal } from '@/domain/money';

export type LiveQuote = {
  price: Decimal;
  change24hPct: number | null;
  volume24h: number;
  updatedAt: number;
};

export type MarketStatus = 'idle' | 'loading' | 'live' | 'error';

type LivePricesState = {
  status: MarketStatus;
  source: { id: ProviderId; name: string } | null;
  quotes: Readonly<Record<string, LiveQuote>>;
  directPrices: Readonly<Record<string, Readonly<Record<string, Decimal>>>>;
};

const INITIAL: LivePricesState = { status: 'idle', source: null, quotes: {}, directPrices: {} };

// One store, written by one WebSocket. Each row reads its own asset with useLiveQuote, so a
// price change re-renders only that row (ADR 0003).
export const useLivePrices = create<LivePricesState>(() => INITIAL);

export function useLiveQuote(assetId: AssetId): LiveQuote | undefined {
  return useLivePrices((state) => state.quotes[assetId]);
}

export function resetLivePrices() {
  useLivePrices.setState(INITIAL, true);
}

export function setMarketStatus(status: MarketStatus) {
  useLivePrices.setState({ status });
}

export function applySnapshot(snapshot: MarketSnapshot, sourceName: string) {
  const quotes: Record<string, LiveQuote> = {};
  for (const quote of snapshot.quotes) {
    quotes[quote.assetId] = {
      price: quote.price,
      change24hPct: quote.change24hPct,
      volume24h: quote.volume24h,
      updatedAt: quote.updatedAt,
    };
  }
  const directPrices: Record<string, Record<string, Decimal>> = {};
  for (const [assetId, prices] of snapshot.directPrices) {
    directPrices[assetId] = Object.fromEntries(prices);
  }
  useLivePrices.setState({
    source: { id: snapshot.source, name: sourceName },
    quotes,
    directPrices,
  });
}

// Only changed assets get new objects. Unchanged rows keep their reference and skip re-render.
export function applyUpdates(updates: readonly LiveUpdate[]) {
  const { quotes, directPrices } = useLivePrices.getState();
  const nextQuotes = { ...quotes };
  let nextDirect: Record<string, Readonly<Record<string, Decimal>>> | null = null;

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
      nextDirect[update.assetId] = { ...nextDirect[update.assetId], [update.quote]: update.price };
    }
  }
  useLivePrices.setState({ quotes: nextQuotes, directPrices: nextDirect ?? directPrices });
}
