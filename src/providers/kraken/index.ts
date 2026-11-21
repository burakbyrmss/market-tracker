import { z } from 'zod';

import type { AssetId, CurrencyCode } from '@/domain/ids';
import type { ChartRange, LiveUpdate, PricePoint, Quote } from '@/domain/market';
import { decimal, isPositive, mul, toDisplayNumber, type Decimal } from '@/domain/money';

import { RANGE_CANDLES, type CryptoProvider, type ProviderOptions } from '../contract';
import { getJson, ProviderDataError, type Fetch } from '../http';
import {
  buildPairTable,
  cachedPairTable,
  notListed,
  parseEach,
  parseJson,
  type PairQuote,
} from '../pairs';
import { decimalString, numberString } from '../schemas';

const BASE = 'https://api.kraken.com/0/public';
const LIVE_URL = 'wss://ws.kraken.com/v2';
// Kraken publishes no symbol cap for the ticker channel. Smaller messages keep each
// subscription modest.
const SUBSCRIBE_CHUNK = 100;

// Kraken's REST names that differ from the common ticker (docs/architecture/providers.md).
const KRAKEN_TO_COMMON: Record<string, string> = { XBT: 'BTC', XDG: 'DOGE' };

// Every Kraken response wraps its data: errors in `error`, data in `result`.
function envelope<T extends z.ZodType>(result: T) {
  return z.object({ error: z.array(z.string()), result: result.optional() });
}

async function krakenGet<T extends z.ZodType>(
  fetchFn: Fetch,
  url: string,
  result: T,
  signal?: AbortSignal,
): Promise<z.output<T>> {
  const body = await getJson(fetchFn, url, envelope(result), signal);
  if (body.error.length > 0 || body.result === undefined) {
    throw new ProviderDataError(`Kraken error from ${url}: ${body.error.join(', ')}`);
  }
  return body.result;
}

const assetPairSchema = z.object({
  altname: z.string(),
  wsname: z.string(),
  status: z.string(),
});

const tickerSchema = z.object({
  // [price, lot volume]
  c: z.tuple([decimalString, z.string()]),
  // [today, last 24 hours]
  v: z.tuple([z.string(), decimalString]),
  p: z.tuple([z.string(), decimalString]),
});

// WebSocket v2 sends numbers, not strings. A JSON number round-trips to the same decimal text
// for up to 15 significant digits, which covers Kraken's price precision.
const liveMessageSchema = z.object({
  channel: z.literal('ticker'),
  type: z.enum(['snapshot', 'update']),
  data: z.array(z.unknown()),
});

const liveTickerSchema = z.object({
  symbol: z.string(),
  last: z.number().positive(),
  change_pct: z.number(),
  volume: z.number(),
  vwap: z.number(),
  timestamp: z.string(),
});

const ohlcSchema = z.array(
  z.tuple([z.number(), z.string(), z.string(), z.string(), numberString]).rest(z.unknown()),
);

export function createKrakenProvider(options: ProviderOptions = {}): CryptoProvider {
  const fetchFn = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  // OHLC takes the pair's altname, such as XBTUSD. The pair table keys on the result key,
  // such as XXBTZUSD, because Ticker answers with those.
  const altnames = new Map<string, string>();

  const pairTable = cachedPairTable(async () => {
    const pairs = await krakenGet(fetchFn, `${BASE}/AssetPairs`, z.record(z.string(), z.unknown()));
    const raw = [];
    for (const [key, value] of Object.entries(pairs)) {
      const pair = assetPairSchema.safeParse(value);
      if (!pair.success || pair.data.status !== 'online') continue;
      const [base, quote] = pair.data.wsname.split('/');
      if (!base || !quote) continue;
      altnames.set(key, pair.data.altname);
      raw.push({ symbol: key, base: KRAKEN_TO_COMMON[base] ?? base, quote });
    }
    return buildPairTable(raw, 'USD');
  }, now);

  return {
    id: 'kraken',
    name: 'Kraken',
    quoteAsset: 'USD',

    async listAssets() {
      return (await pairTable(true)).assets;
    },

    async snapshot(signal) {
      const table = await pairTable();
      const tickers = await krakenGet(
        fetchFn,
        `${BASE}/Ticker`,
        z.record(z.string(), z.unknown()),
        signal,
      );
      const updatedAt = now();
      const quotes: Quote[] = [];
      const directPrices = new Map<AssetId, Map<CurrencyCode, Decimal>>();

      for (const [key, value] of Object.entries(tickers)) {
        const pair = table.bySymbol.get(key);
        if (!pair) continue;
        const [ticker] = parseEach([value], tickerSchema);
        if (!ticker || !isPositive(ticker.c[0])) continue;
        if (pair.quote === 'USD') {
          quotes.push({
            assetId: pair.assetId,
            price: ticker.c[0],
            // Kraken REST only has the open at 00:00 UTC, not a rolling 24-hour open.
            change24hPct: null,
            // Base volume times the 24-hour average price gives volume in USD.
            volume24h: toDisplayNumber(mul(ticker.v[1], ticker.p[1])),
            updatedAt,
          });
        } else {
          const prices = directPrices.get(pair.assetId) ?? new Map<CurrencyCode, Decimal>();
          prices.set(pair.quote, ticker.c[0]);
          directPrices.set(pair.assetId, prices);
        }
      }

      if (quotes.length === 0 && table.usdSymbol.size > 0) {
        throw new ProviderDataError('Kraken snapshot has no USD prices');
      }
      return { source: 'kraken', quotes, directPrices };
    },

    async history(assetId: AssetId, range: ChartRange, signal) {
      const key = (await pairTable()).usdSymbol.get(assetId);
      const altname = key && altnames.get(key);
      if (!key || !altname) throw notListed('Kraken', assetId);
      const { minutes, span } = RANGE_CANDLES[range];
      const params = new URLSearchParams({ pair: altname, interval: String(minutes) });
      if (span !== null) params.set('since', String(Math.floor((now() - span) / 1000)));
      const result = await krakenGet(
        fetchFn,
        `${BASE}/OHLC?${params}`,
        z.record(z.string(), z.unknown()),
        signal,
      );
      const candles = ohlcSchema.safeParse(result[key]);
      if (!candles.success) throw new ProviderDataError(`Kraken OHLC has no data for ${altname}`);
      return candles.data.map(([time, , , , close]): PricePoint => ({
        time: time * 1000,
        price: close,
      }));
    },

    async liveFeed(assetIds) {
      const table = await pairTable();
      const fiatById = new Map(table.assets.map((a) => [a.id, a.directFiat]));
      // WebSocket v2 names pairs by our common tickers (BTC/USD), unlike REST (XBT/USD).
      const bySymbol = new Map<string, { assetId: AssetId; quote: PairQuote }>();
      for (const assetId of assetIds) {
        const fiat = fiatById.get(assetId);
        if (!fiat) continue;
        bySymbol.set(`${assetId}/USD`, { assetId, quote: 'USD' });
        for (const currency of fiat)
          bySymbol.set(`${assetId}/${currency}`, { assetId, quote: currency });
      }
      const symbols = [...bySymbol.keys()];
      const subscribeMessages: string[] = [];
      for (let i = 0; i < symbols.length; i += SUBSCRIBE_CHUNK) {
        subscribeMessages.push(
          JSON.stringify({
            method: 'subscribe',
            params: { channel: 'ticker', symbol: symbols.slice(i, i + SUBSCRIBE_CHUNK) },
          }),
        );
      }

      return {
        url: LIVE_URL,
        subscribeMessages,
        maxAgeMs: null,
        parse(message) {
          const body = liveMessageSchema.safeParse(parseJson(message));
          if (!body.success) return [];
          const updates: LiveUpdate[] = [];
          for (const ticker of parseEach(body.data.data, liveTickerSchema)) {
            const pair = bySymbol.get(ticker.symbol);
            const updatedAt = Date.parse(ticker.timestamp);
            if (!pair || Number.isNaN(updatedAt)) continue;
            updates.push({
              assetId: pair.assetId,
              quote: pair.quote,
              price: decimal(ticker.last),
              change24hPct: ticker.change_pct,
              volume24h: ticker.volume * ticker.vwap,
              updatedAt,
            });
          }
          return updates;
        },
      };
    },
  };
}
