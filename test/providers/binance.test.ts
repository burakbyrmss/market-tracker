import type { AssetId } from '@/domain/ids';
import { createBinanceProvider } from '@/providers/binance';

import exchangeInfo from '../fixtures/binance/exchangeInfo.json';
import klines from '../fixtures/binance/klines.json';
import tickers from '../fixtures/binance/ticker-24hr-mini.json';
import values from '../fixtures/synthetic-values.json';
import { describeProviderContract } from './contract-suite';
import { fakeFetch } from './fake-fetch';

const routes = {
  '/exchangeInfo': { body: exchangeInfo },
  '/ticker/24hr': { body: tickers },
  '/klines': { body: klines },
};

describeProviderContract('Binance', {
  create: createBinanceProvider,
  routes,
  snapshotRoute: '/ticker/24hr',
  btcDirectFiat: ['EUR', 'TRY'],
});

describe('Binance adapter', () => {
  const make = () => {
    const fake = fakeFetch(routes);
    return { provider: createBinanceProvider({ fetch: fake.fetch, now: () => values.time }), fake };
  };

  test('computes the 24-hour change from the rolling open', async () => {
    const { provider } = make();
    const btc = (await provider.snapshot()).quotes.find((q) => q.assetId === 'BTC');
    // Open is 0.8 of the last price: (1 - 0.8) / 0.8 = 25 %.
    expect(btc?.change24hPct).toBe(25);
  });

  test('asks for candles that match the range', async () => {
    const { provider, fake } = make();
    await provider.history('BTC' as AssetId, '1W');
    await provider.history('BTC' as AssetId, 'ALL');
    const [week, all] = fake.calls
      .filter((u) => u.includes('/klines'))
      .map((u) => new URL(u).searchParams);
    expect(week?.get('symbol')).toBe('BTCUSDT');
    expect(week?.get('interval')).toBe('1h');
    expect(week?.get('startTime')).toBe(String(values.time - 7 * 86_400_000));
    expect(all?.get('interval')).toBe('1w');
    expect(all?.has('startTime')).toBe(false);
  });

  test('skips a pair that is not trading', async () => {
    const halted = {
      ...exchangeInfo,
      symbols: exchangeInfo.symbols.map((s) =>
        s.symbol === 'DOGEUSDT' ? { ...s, status: 'BREAK' } : s,
      ),
    };
    const fake = fakeFetch({ ...routes, '/exchangeInfo': { body: halted } });
    const assets = await createBinanceProvider({ fetch: fake.fetch }).listAssets();
    expect(assets.map((a) => a.id)).not.toContain('DOGE');
  });
});
