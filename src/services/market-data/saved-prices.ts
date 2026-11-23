import { z } from 'zod';

import { toDecimalString } from '@/domain/money';
import { readStored, writeStored } from '@/shared/storage';
import { storedAssetId, storedCurrencyCode, storedDecimal } from '@/shared/storage/schemas';

import { useLivePrices } from './live-prices';

// The last prices, kept so the app shows them, with their age, when it starts without a network.
const KEY = 'saved-prices.v1';

const savedPricesSchema = z.object({
  source: z.object({
    id: z.enum(['binance', 'kraken']),
    name: z.string(),
    quoteAsset: z.enum(['USD', 'USDT']),
  }),
  quotes: z.array(
    z.object({
      assetId: storedAssetId,
      price: storedDecimal,
      change24hPct: z.number().nullable(),
      volume24h: z.number(),
      updatedAt: z.number(),
    }),
  ),
  directPrices: z.array(
    z.object({
      assetId: storedAssetId,
      prices: z.array(z.object({ currency: storedCurrencyCode, price: storedDecimal })),
    }),
  ),
  ranking: z.array(storedAssetId),
  listed: z.array(storedAssetId),
  asOf: z.number(),
});

type StoredPrices = z.input<typeof savedPricesSchema>;

export type PriceCache = {
  // Puts saved prices in the store, unless it already has prices.
  restore(): void;
  save(): void;
};

export const savedPrices: PriceCache = {
  restore() {
    if (useLivePrices.getState().source) return;
    const saved = readStored(KEY, savedPricesSchema);
    if (!saved) return;
    useLivePrices.setState({
      source: saved.source,
      quotes: Object.fromEntries(
        saved.quotes.map(({ assetId, ...quote }) => [assetId, quote] as const),
      ),
      directPrices: Object.fromEntries(
        saved.directPrices.map(({ assetId, prices }) => [
          assetId,
          new Map(prices.map(({ currency, price }) => [currency, price] as const)),
        ]),
      ),
      ranking: saved.ranking,
      listed: saved.listed,
      asOf: saved.asOf,
      connected: false,
    });
  },
  save() {
    const { source, quotes, directPrices, ranking, listed, asOf } = useLivePrices.getState();
    if (!source || asOf === null) return;
    const stored: StoredPrices = {
      source,
      quotes: Object.entries(quotes).map(([assetId, quote]) => ({
        assetId,
        price: toDecimalString(quote.price),
        change24hPct: quote.change24hPct,
        volume24h: quote.volume24h,
        updatedAt: quote.updatedAt,
      })),
      directPrices: Object.entries(directPrices).map(([assetId, prices]) => ({
        assetId,
        prices: [...prices].map(([currency, price]) => ({
          currency,
          price: toDecimalString(price),
        })),
      })),
      ranking: [...ranking],
      listed: [...listed],
      asOf,
    };
    writeStored(KEY, stored);
  },
};
