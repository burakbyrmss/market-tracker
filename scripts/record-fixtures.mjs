// Records provider responses for the contract tests (ADR 0012). The repo is public, so the
// script keeps each response's real shape, trims it to a few pairs, and replaces every price,
// volume, and timestamp with the values in test/fixtures/synthetic-values.json.
//
// Run: node scripts/record-fixtures.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const FIXTURES = new URL('../test/fixtures/', import.meta.url);
const values = JSON.parse(readFileSync(new URL('synthetic-values.json', FIXTURES), 'utf8'));

const BINANCE = 'https://data-api.binance.vision/api/v3';
const KRAKEN = 'https://api.kraken.com/0/public';

// Our pair name ("BTC/USD") for each provider symbol kept in the fixtures.
const BINANCE_PAIRS = {
  BTCUSDT: 'BTC/USD',
  ETHUSDT: 'ETH/USD',
  DOGEUSDT: 'DOGE/USD',
  BTCEUR: 'BTC/EUR',
  BTCTRY: 'BTC/TRY',
  ETHBTC: 'ETH/BTC',
};
const KRAKEN_PAIRS = {
  XXBTZUSD: 'BTC/USD',
  XETHZUSD: 'ETH/USD',
  XDGUSD: 'DOGE/USD',
  XXBTZEUR: 'BTC/EUR',
  XETHXXBT: 'ETH/BTC',
};

// Kraken returns object keys in a different order each call.
function sortKeys(object) {
  return Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
}

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

function write(path, data) {
  writeFileSync(new URL(path, FIXTURES), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote test/fixtures/${path}`);
}

// Synthetic numbers are fixed test inputs, not money, so plain floats are fine here.
const num = (pair) => Number(values.prices[pair]);
const fixed = (n, digits = 8) => n.toFixed(digits);
const time = values.time;
const open = (pair) => num(pair) * Number(values.openRatio);
const baseVolume = Number(values.baseVolume);

function candleTimes(count, minutes) {
  return Array.from({ length: count }, (_, i) => time - (count - 1 - i) * minutes * 60_000);
}

async function recordBinance() {
  const symbols = Object.keys(BINANCE_PAIRS);
  const info = await get(`${BINANCE}/exchangeInfo?symbolStatus=TRADING&showPermissionSets=false`);
  info.serverTime = time;
  info.symbols = info.symbols
    .filter((s) => symbols.includes(s.symbol))
    // MARKET_LOT_SIZE.maxQty follows recent trading volume, so it is market data too.
    .map((s) => ({
      ...s,
      filters: s.filters.map((f) =>
        f.filterType === 'MARKET_LOT_SIZE' ? { ...f, maxQty: fixed(baseVolume) } : f,
      ),
    }));
  if (info.symbols.length !== symbols.length) throw new Error('Binance: a fixture pair is missing');
  write('binance/exchangeInfo.json', info);

  const tickers = await get(`${BINANCE}/ticker/24hr?type=MINI`);
  const kept = tickers.filter((t) => symbols.includes(t.symbol));
  write(
    'binance/ticker-24hr-mini.json',
    kept.map((t) => {
      const pair = BINANCE_PAIRS[t.symbol];
      return {
        ...t,
        openPrice: fixed(open(pair)),
        highPrice: fixed(num(pair) * 1.1),
        lowPrice: fixed(num(pair) * 0.7),
        lastPrice: fixed(num(pair)),
        volume: fixed(baseVolume),
        quoteVolume: fixed(num(pair) * baseVolume),
        openTime: time - 86_400_000,
        closeTime: time,
        firstId: 1,
        lastId: 100,
        count: 100,
      };
    }),
  );

  const klines = await get(
    `${BINANCE}/klines?symbol=BTCUSDT&interval=1d&limit=${values.candleCloses.length}`,
  );
  const times = candleTimes(klines.length, values.candleMinutes);
  write(
    'binance/klines.json',
    klines.map((row, i) => {
      const close = Number(values.candleCloses[i]);
      const t = times[i];
      return [
        t,
        fixed(close),
        fixed(close),
        fixed(close),
        fixed(close),
        fixed(baseVolume),
        t + 86_399_999,
        fixed(close * baseVolume),
        100,
        fixed(baseVolume / 2),
        fixed((close * baseVolume) / 2),
        row[11],
      ];
    }),
  );
}

async function recordKraken() {
  const keys = Object.keys(KRAKEN_PAIRS);
  const pairs = await get(`${KRAKEN}/AssetPairs?pair=${keys.join(',')}`);
  if (Object.keys(pairs.result).length !== keys.length)
    throw new Error('Kraken: a fixture pair is missing');
  write('kraken/AssetPairs.json', { ...pairs, result: sortKeys(pairs.result) });

  const tickers = await get(`${KRAKEN}/Ticker?pair=${keys.join(',')}`);
  const result = {};
  for (const [key, t] of Object.entries(tickers.result)) {
    const pair = KRAKEN_PAIRS[key];
    if (!pair) throw new Error(`Kraken: unexpected ticker key ${key}`);
    const price = fixed(num(pair), 5);
    result[key] = {
      ...t,
      a: [price, '1', '1.000'],
      b: [price, '1', '1.000'],
      c: [price, '1.00000000'],
      v: [fixed(baseVolume / 2), fixed(baseVolume)],
      p: [price, price],
      t: [50, 100],
      l: [fixed(num(pair) * 0.7, 5), fixed(num(pair) * 0.7, 5)],
      h: [fixed(num(pair) * 1.1, 5), fixed(num(pair) * 1.1, 5)],
      o: fixed(open(pair), 5),
    };
  }
  write('kraken/Ticker.json', { error: tickers.error, result: sortKeys(result) });

  const ohlc = await get(`${KRAKEN}/OHLC?pair=XBTUSD&interval=${values.candleMinutes}`);
  const rows = ohlc.result.XXBTZUSD.slice(-values.candleCloses.length);
  const times = candleTimes(rows.length, values.candleMinutes);
  write('kraken/OHLC.json', {
    error: ohlc.error,
    result: {
      XXBTZUSD: rows.map((_, i) => {
        const close = fixed(Number(values.candleCloses[i]), 1);
        return [times[i] / 1000, close, close, close, close, close, fixed(baseVolume), 100];
      }),
      last: times[times.length - 1] / 1000,
    },
  });
}

// Collects WebSocket messages until `done` says enough, or fails after `ms`.
function collect(url, { onOpen, keep, done, ms = 20_000 }) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const kept = [];
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`Timed out collecting from ${url}`));
    }, ms);
    ws.onopen = () => onOpen?.(ws);
    ws.onerror = () => reject(new Error(`WebSocket error from ${url}`));
    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (keep(message)) kept.push(message);
      if (done(kept)) {
        clearTimeout(timer);
        ws.close();
        resolve(kept);
      }
    };
  });
}

async function recordBinanceLive() {
  const wanted = Object.keys(BINANCE_PAIRS);
  const seen = new Map();
  // The stream sends only symbols that changed in the last second, so merge a few messages.
  await collect('wss://data-stream.binance.vision/ws/!miniTicker@arr', {
    keep: (message) => {
      for (const t of message) if (wanted.includes(t.symbol ?? t.s)) seen.set(t.s, t);
      return false;
    },
    done: () => seen.size === wanted.length,
    ms: 60_000,
  });
  write(
    'binance/live-miniTicker.json',
    wanted.map((symbol) => {
      const pair = BINANCE_PAIRS[symbol];
      return {
        ...seen.get(symbol),
        E: time,
        c: fixed(num(pair)),
        o: fixed(open(pair)),
        h: fixed(num(pair) * 1.1),
        l: fixed(num(pair) * 0.7),
        v: fixed(baseVolume),
        q: fixed(num(pair) * baseVolume),
      };
    }),
  );
}

async function recordKrakenLive() {
  // WebSocket v2 names bitcoin BTC, unlike REST.
  const symbols = ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'BTC/EUR'];
  const messages = await collect('wss://ws.kraken.com/v2', {
    onOpen: (ws) =>
      ws.send(
        JSON.stringify({ method: 'subscribe', params: { channel: 'ticker', symbol: symbols } }),
      ),
    keep: (message) =>
      message.channel === 'ticker' ||
      message.channel === 'heartbeat' ||
      message.method === 'subscribe',
    done: (kept) =>
      symbols.every((s) =>
        kept.some((m) => m.channel === 'ticker' && m.data.some((d) => d.symbol === s)),
      ) && kept.some((m) => m.channel === 'heartbeat'),
  });
  const iso = new Date(time).toISOString().replace('Z', '000Z');
  // Messages arrive in a different order each run. A fixed order keeps re-recording diff-free:
  // acks, then one ticker message per symbol, then one heartbeat.
  const rank = (m) => (m.method ? 0 : m.channel === 'ticker' ? 1 : 2);
  const key = (m) => m.result?.symbol ?? m.data?.[0]?.symbol ?? '';
  const ordered = messages
    .filter(
      (m, i) =>
        m.channel !== 'heartbeat' || messages.findIndex((x) => x.channel === 'heartbeat') === i,
    )
    .sort((a, b) => rank(a) - rank(b) || key(a).localeCompare(key(b)));
  const round = (n) => Number(n.toFixed(5));
  write(
    'kraken/live-messages.json',
    ordered.map((message) => {
      if (message.channel !== 'ticker')
        return message.method ? { ...message, time_in: iso, time_out: iso } : message;
      return {
        ...message,
        data: message.data.map((d) => {
          const price = num(d.symbol);
          return {
            ...d,
            bid: price,
            bid_qty: 1,
            ask: price,
            ask_qty: 1,
            last: price,
            volume: baseVolume,
            vwap: price,
            low: round(price * 0.7),
            high: round(price * 1.1),
            change: round(price - open(d.symbol)),
            change_pct: 25,
            trades: 100,
            timestamp: iso,
          };
        }),
      };
    }),
  );
}

async function recordFrankfurter() {
  const FX = 'https://api.frankfurter.dev/v2/providers/ECB';
  const keep = Object.keys(values.fx.rates);
  const latest = await get(`${FX}/rates?base=EUR`);
  // Keep the EUR row too: the live response includes the base, and the adapter must skip it.
  const kept = latest.filter((r) => keep.includes(r.quote) || r.quote === 'EUR');
  if (kept.length !== keep.length + 1)
    throw new Error('Frankfurter: a fixture currency is missing');
  write(
    'frankfurter/latest.json',
    kept.map((r) => ({
      ...r,
      date: values.fx.date,
      rate: r.quote === 'EUR' ? 1 : Number(values.fx.rates[r.quote]),
    })),
  );

  const history = await get(`${FX}/rates?base=EUR&quotes=USD&from=2024-01-01&to=2024-01-10`);
  write(
    'frankfurter/history.json',
    history.slice(0, values.fx.historyDates.length).map((r, i) => ({
      ...r,
      date: values.fx.historyDates[i],
      rate: Number(values.fx.historyUsd[i]),
    })),
  );
}

await recordBinance();
await recordKraken();
await recordFrankfurter();
await recordBinanceLive();
await recordKrakenLive();
