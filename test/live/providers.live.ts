import { rankTopCoins } from '@/domain/asset-classes';
import type { AssetId } from '@/domain/ids';
import { CHART_RANGES, FX_RANGES } from '@/domain/market';
import { isPositive } from '@/domain/money';
import { createBinanceProvider } from '@/providers/binance';
import type { CryptoProvider } from '@/providers/contract';
import { createFrankfurterProvider } from '@/providers/frankfurter';
import { createKrakenProvider } from '@/providers/kraken';
// The JSON, not @/features/coins: plain Node cannot load react-native's Image.
import coinNames from '@/features/coins/generated/coin-names.json';
// The JSON, not @/shared/i18n: plain Node cannot load expo-localization.
import en from '@/shared/i18n/locales/en.json';

const BTC = 'BTC' as AssetId;

describe.each<[string, () => CryptoProvider]>([
  ['Binance', createBinanceProvider],
  ['Kraken', createKrakenProvider],
])('%s live API', (_, create) => {
  const provider = create();

  test('lists bitcoin and many other coins', async () => {
    const assets = await provider.listAssets();
    expect(assets.length).toBeGreaterThan(100);
    expect(assets.some((a) => a.id === BTC)).toBe(true);
    expect(assets.find((a) => a.id === BTC)?.directFiat).toContain('EUR');
  });

  test('snapshot has a positive bitcoin price and a direct EUR price', async () => {
    const snapshot = await provider.snapshot();
    expect(snapshot.quotes.length).toBeGreaterThan(100);
    const btc = snapshot.quotes.find((q) => q.assetId === BTC);
    expect(btc && isPositive(btc.price)).toBe(true);
    expect(btc?.volume24h).toBeGreaterThan(0);
    expect(snapshot.directPrices.get(BTC)?.has('EUR' as never)).toBe(true);
  });

  test.each(CHART_RANGES)(
    'history %s is ordered, positive, and within the candle limit',
    async (range) => {
      const points = await provider.history(BTC, range);
      expect(points.length).toBeGreaterThan(1);
      expect(points.length).toBeLessThanOrEqual(1000);
      for (let i = 1; i < points.length; i++) {
        expect(points[i]!.time).toBeGreaterThan(points[i - 1]!.time);
      }
      expect(points.every((p) => p.price > 0)).toBe(true);
    },
  );
});

describe('Frankfurter live API', () => {
  const fx = createFrankfurterProvider();

  test('latest has USD and TRY per euro, dated within a week', async () => {
    const rates = await fx.latest();
    expect(rates.rates.has('USD' as never)).toBe(true);
    expect(rates.rates.has('TRY' as never)).toBe(true);
    expect(Date.now() - Date.parse(rates.date)).toBeLessThan(7 * 24 * 60 * 60_000);
  });

  test('every ECB currency has a bundled name', async () => {
    const rates = await fx.latest();
    const unnamed = [...rates.rates.keys(), rates.base].filter((code) => !(code in en.currency));
    expect(unnamed).toEqual([]);
  });

  test.each(FX_RANGES)('history %s is ordered and positive', async (range) => {
    const points = await fx.history('USD' as never, 'TRY' as never, range);
    expect(points.length).toBeGreaterThan(10);
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.time).toBeGreaterThan(points[i - 1]!.time);
    }
    expect(points.every((p) => p.price > 0)).toBe(true);
  });
});

// M14 exit check: every coin in today's top 100 has a name. The ranking changes daily, so this
// runs against the live APIs. Fill a gap in scripts/coin-assets/overrides.json.
describe.each<[string, () => CryptoProvider]>([
  ['Binance', createBinanceProvider],
  ['Kraken', createKrakenProvider],
])('%s top 100', (_, create) => {
  test('every coin has a name', async () => {
    const top = rankTopCoins((await create().snapshot()).quotes, 100);
    const names: Readonly<Record<string, string>> = coinNames;
    expect(top.filter((id) => names[id] === undefined)).toEqual([]);
  });
});
