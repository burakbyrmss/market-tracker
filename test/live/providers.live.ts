import type { AssetId } from '@/domain/ids';
import { CHART_RANGES } from '@/domain/market';
import { isPositive } from '@/domain/money';
import { createBinanceProvider } from '@/providers/binance';
import type { CryptoProvider } from '@/providers/contract';
import { createKrakenProvider } from '@/providers/kraken';

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
