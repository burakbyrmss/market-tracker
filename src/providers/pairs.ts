import type { z } from 'zod';

import { DISPLAY_CURRENCIES, parseAssetId, type AssetId, type CurrencyCode } from '@/domain/ids';
import type { ListedAsset } from '@/domain/market';

import { ProviderDataError } from './http';

// Fiat currencies worth a direct pair: the display currencies other than USD.
const DIRECT_FIAT = new Set<string>(DISPLAY_CURRENCIES.filter((code) => code !== 'USD'));

export type PairQuote = 'USD' | CurrencyCode;

export type RawPair = {
  // The provider's own symbol. It never leaves the adapter.
  symbol: string;
  base: string;
  quote: string;
};

export type PairTable = {
  assets: ListedAsset[];
  usdSymbol: ReadonlyMap<AssetId, string>;
  bySymbol: ReadonlyMap<string, { assetId: AssetId; quote: PairQuote }>;
};

// Builds the coin list from a provider's pairs. `usdQuote` is the provider's USD-like quote
// asset (USDT on Binance, USD on Kraken). A coin is listed only with a USD-like pair
// (docs/product/requirements.md). Pairs against other coins are ignored.
export function buildPairTable(pairs: readonly RawPair[], usdQuote: string): PairTable {
  const usdSymbol = new Map<AssetId, string>();
  const fiatPairs: { symbol: string; assetId: AssetId; quote: CurrencyCode }[] = [];

  for (const pair of pairs) {
    const assetId = parseAssetId(pair.base);
    if (!assetId) continue;
    if (pair.quote === usdQuote) {
      if (!usdSymbol.has(assetId)) usdSymbol.set(assetId, pair.symbol);
    } else if (DIRECT_FIAT.has(pair.quote)) {
      fiatPairs.push({ symbol: pair.symbol, assetId, quote: pair.quote as CurrencyCode });
    }
  }

  const bySymbol = new Map<string, { assetId: AssetId; quote: PairQuote }>();
  const directFiat = new Map<AssetId, CurrencyCode[]>();
  for (const [assetId, symbol] of usdSymbol) {
    bySymbol.set(symbol, { assetId, quote: 'USD' });
    directFiat.set(assetId, []);
  }
  for (const { symbol, assetId, quote } of fiatPairs) {
    const list = directFiat.get(assetId);
    if (!list || list.includes(quote)) continue;
    list.push(quote);
    bySymbol.set(symbol, { assetId, quote });
  }

  return {
    assets: [...directFiat].map(([id, fiat]) => ({ id, directFiat: fiat })),
    usdSymbol,
    bySymbol,
  };
}

// Caches the pair table for a day, so snapshot and history reuse one asset list call.
export function cachedPairTable(load: () => Promise<PairTable>, now: () => number) {
  const TTL = 24 * 60 * 60_000;
  let cached: { at: number; table: Promise<PairTable> } | null = null;
  return (fresh = false): Promise<PairTable> => {
    if (fresh || !cached || now() - cached.at > TTL) {
      const table = load();
      cached = { at: now(), table };
      // A failed load must not stay cached.
      table.catch(() => {
        if (cached?.table === table) cached = null;
      });
    }
    return cached.table;
  };
}

// Parses each item on its own, so one odd entry in a list of thousands does not fail the call.
export function parseEach<T>(items: readonly unknown[], schema: z.ZodType<T>): T[] {
  const parsed: T[] = [];
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) parsed.push(result.data);
  }
  return parsed;
}

export function notListed(provider: string, assetId: AssetId): ProviderDataError {
  return new ProviderDataError(`${provider} does not list ${assetId} against USD`);
}

// WebSocket messages arrive as text. A message that is not JSON is ignored, not thrown.
export function parseJson(message: string): unknown {
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return undefined;
  }
}
