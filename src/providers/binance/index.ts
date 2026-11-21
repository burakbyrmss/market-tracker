import { z } from 'zod';

import type { AssetId, CurrencyCode } from '@/domain/ids';
import type { ChartRange, LiveUpdate, PricePoint, Quote } from '@/domain/market';
import { div, isPositive, mul, sub, toDisplayNumber, decimal, type Decimal } from '@/domain/money';

import {
  RANGE_CANDLES,
  type CandleMinutes,
  type CryptoProvider,
  type ProviderOptions,
} from '../contract';
import { getJson, ProviderDataError } from '../http';
import { buildPairTable, cachedPairTable, notListed, parseEach, parseJson } from '../pairs';
import { decimalString, numberString } from '../schemas';

// Market-data-only host: public spot data, no API key (docs/architecture/providers.md).
const BASE = 'https://data-api.binance.vision/api/v3';
// Market-data-only WebSocket host. The all-market mini ticker sends every symbol that changed in
// the last second (docs/architecture/providers.md).
const LIVE_URL = 'wss://data-stream.binance.vision/ws/!miniTicker@arr';
// Binance closes a connection at 24 hours. Reconnect an hour early.
const LIVE_MAX_AGE = 23 * 60 * 60_000;

const exchangeInfoSchema = z.object({
  symbols: z.array(
    z.object({
      symbol: z.string(),
      status: z.string(),
      baseAsset: z.string(),
      quoteAsset: z.string(),
    }),
  ),
});

const miniTickerSchema = z.object({
  symbol: z.string(),
  openPrice: decimalString,
  lastPrice: decimalString,
  quoteVolume: numberString,
  closeTime: z.number(),
});

const liveTickerSchema = z.object({
  E: z.number(),
  s: z.string(),
  c: decimalString,
  o: decimalString,
  q: numberString,
});

const klineSchema = z
  .tuple([z.number(), z.string(), z.string(), z.string(), numberString])
  .rest(z.unknown());

const INTERVALS: Record<CandleMinutes, string> = {
  5: '5m',
  60: '1h',
  240: '4h',
  1440: '1d',
  10080: '1w',
};

const HUNDRED = decimal(100);

function changePct(open: Decimal, last: Decimal): number | null {
  const ratio = div(sub(last, open), open);
  return ratio ? toDisplayNumber(mul(ratio, HUNDRED)) : null;
}

export function createBinanceProvider(options: ProviderOptions = {}): CryptoProvider {
  const fetchFn = options.fetch ?? fetch;
  const now = options.now ?? Date.now;

  const pairTable = cachedPairTable(async () => {
    const info = await getJson(
      fetchFn,
      `${BASE}/exchangeInfo?symbolStatus=TRADING&showPermissionSets=false`,
      exchangeInfoSchema,
    );
    const trading = info.symbols.filter((s) => s.status === 'TRADING');
    return buildPairTable(
      trading.map((s) => ({ symbol: s.symbol, base: s.baseAsset, quote: s.quoteAsset })),
      'USDT',
    );
  }, now);

  return {
    id: 'binance',
    name: 'Binance',
    quoteAsset: 'USDT',

    async listAssets() {
      return (await pairTable(true)).assets;
    },

    async snapshot(signal) {
      const table = await pairTable();
      // MINI drops fields we do not use and cuts the response size.
      const raw = await getJson(
        fetchFn,
        `${BASE}/ticker/24hr?type=MINI`,
        z.array(z.unknown()),
        signal,
      );
      const quotes: Quote[] = [];
      const directPrices = new Map<AssetId, Map<CurrencyCode, Decimal>>();

      for (const ticker of parseEach(raw, miniTickerSchema)) {
        const pair = table.bySymbol.get(ticker.symbol);
        if (!pair || !isPositive(ticker.lastPrice)) continue;
        if (pair.quote === 'USD') {
          quotes.push({
            assetId: pair.assetId,
            price: ticker.lastPrice,
            change24hPct: changePct(ticker.openPrice, ticker.lastPrice),
            volume24h: ticker.quoteVolume,
            updatedAt: ticker.closeTime,
          });
        } else {
          const prices = directPrices.get(pair.assetId) ?? new Map<CurrencyCode, Decimal>();
          prices.set(pair.quote, ticker.lastPrice);
          directPrices.set(pair.assetId, prices);
        }
      }

      if (quotes.length === 0 && table.usdSymbol.size > 0) {
        throw new ProviderDataError('Binance snapshot has no USDT prices');
      }
      return { source: 'binance', quotes, directPrices };
    },

    async history(assetId: AssetId, range: ChartRange, signal) {
      const symbol = (await pairTable()).usdSymbol.get(assetId);
      if (!symbol) throw notListed('Binance', assetId);
      const { minutes, span } = RANGE_CANDLES[range];
      const params = new URLSearchParams({
        symbol,
        interval: INTERVALS[minutes],
        limit: '1000',
      });
      if (span !== null) params.set('startTime', String(now() - span));
      const klines = await getJson(
        fetchFn,
        `${BASE}/klines?${params}`,
        z.array(klineSchema),
        signal,
      );
      return klines.map(([time, , , , close]): PricePoint => ({ time, price: close }));
    },

    // The all-market stream covers every coin, so `assetIds` needs no subscription.
    async liveFeed() {
      const table = await pairTable();
      return {
        url: LIVE_URL,
        subscribeMessages: [],
        maxAgeMs: LIVE_MAX_AGE,
        parse(message) {
          const body = parseJson(message);
          if (!Array.isArray(body)) return [];
          const updates: LiveUpdate[] = [];
          for (const ticker of parseEach(body, liveTickerSchema)) {
            const pair = table.bySymbol.get(ticker.s);
            if (!pair || !isPositive(ticker.c)) continue;
            updates.push({
              assetId: pair.assetId,
              quote: pair.quote,
              price: ticker.c,
              change24hPct: changePct(ticker.o, ticker.c),
              volume24h: ticker.q,
              updatedAt: ticker.E,
            });
          }
          return updates;
        },
      };
    },
  };
}
