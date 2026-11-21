import type { AssetId } from './ids';
import type { Quote } from './market';

// Assets that trade like coins on an exchange but are not what the top-100 list is for. They stay
// listed and searchable; only the ranking skips them (docs/product/requirements.md).
// Curated from the live top 130 of both providers on 2026-11-21. Exchanges add new ones, so
// recheck when the list shows something odd. M14's bundled coin-name file may replace this.

// Pegged to a fiat currency.
const STABLECOINS = [
  'USDT',
  'USDC',
  'USD1',
  'USDG',
  'USDE',
  'USDS',
  'USDP',
  'USDD',
  'USDQ',
  'USD0',
  'PYUSD',
  'FDUSD',
  'TUSD',
  'BUSD',
  'GUSD',
  'LUSD',
  'RLUSD',
  'RWUSD',
  'BFUSD',
  'XUSD',
  'DAI',
  'FRAX',
  'GHO',
  'U',
  'EURC',
  'EURI',
  'EURT',
  'AEUR',
  'ZCHF',
  'QCAD',
  'BRL1',
];

// Fiat currencies that exchanges list as if they were coins, such as EUR/USD.
const FIAT = [
  'USD',
  'EUR',
  'GBP',
  'AUD',
  'CAD',
  'CHF',
  'JPY',
  'TRY',
  'BRL',
  'MXN',
  'ARS',
  'ZAR',
  'PLN',
  'SEK',
  'NOK',
  'DKK',
  'CZK',
  'HUF',
  'RON',
  'NZD',
  'SGD',
  'HKD',
  'KRW',
  'INR',
  'IDR',
  'THB',
  'AED',
  'KZT',
  'UAH',
  'COP',
  'NGN',
  'RUB',
];

// Binance tokenized stocks and ETFs. Their tickers end in B (NVDAB is Nvidia).
const TOKENIZED_STOCKS = [
  'NVDAB',
  'TSLAB',
  'GOOGLB',
  'AMDB',
  'AVGOB',
  'MSTRB',
  'COINB',
  'CRCLB',
  'INTCB',
  'MUB',
  'ORCLB',
  'MRVLB',
  'NBISB',
  'SNDKB',
  'SKHYB',
  'INTWB',
  'SPCXB',
  'SPYB',
  'QQQB',
  'TQQQB',
  'SOXLB',
  'SOXSB',
  'SNXXB',
  'KORUB',
  'EWYB',
];

const EXCLUDED = new Set<string>([...STABLECOINS, ...FIAT, ...TOKENIZED_STOCKS]);

export function isRankedCoin(id: AssetId): boolean {
  return !EXCLUDED.has(id);
}

// The top coins by 24-hour volume, without stablecoins, fiat, and stocks.
export function rankTopCoins(quotes: readonly Quote[], count: number): AssetId[] {
  return quotes
    .filter((q) => isRankedCoin(q.assetId))
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, count)
    .map((q) => q.assetId);
}
