import type { AssetId } from '@/domain/ids';
import { ProviderDataError } from '@/providers/http';
import { createKrakenProvider } from '@/providers/kraken';

import assetPairs from '../fixtures/kraken/AssetPairs.json';
import ohlc from '../fixtures/kraken/OHLC.json';
import ticker from '../fixtures/kraken/Ticker.json';
import liveMessages from '../fixtures/kraken/live-messages.json';
import values from '../fixtures/synthetic-values.json';
import { describeProviderContract } from './contract-suite';
import { fakeFetch } from './fake-fetch';

const routes = {
  '/AssetPairs': { body: assetPairs },
  '/Ticker': { body: ticker },
  '/OHLC': { body: ohlc },
};

describeProviderContract('Kraken', {
  create: createKrakenProvider,
  routes,
  snapshotRoute: '/Ticker',
  liveMessages: liveMessages.map((m) => JSON.stringify(m)),
  btcDirectFiat: ['EUR'],
});

describe('Kraken adapter', () => {
  const make = () => {
    const fake = fakeFetch(routes);
    return { provider: createKrakenProvider({ fetch: fake.fetch, now: () => values.time }), fake };
  };

  test('leaves the 24-hour change empty, because REST has no rolling open', async () => {
    const { provider } = make();
    const btc = (await provider.snapshot()).quotes.find((q) => q.assetId === 'BTC');
    expect(btc?.change24hPct).toBeNull();
  });

  test('asks for OHLC by the Kraken pair name, from the start of the range', async () => {
    const { provider, fake } = make();
    await provider.history('BTC' as AssetId, '1D');
    const params = new URL(fake.calls.find((u) => u.includes('/OHLC')) ?? '').searchParams;
    expect(params.get('pair')).toBe('XBTUSD');
    expect(params.get('interval')).toBe('5');
    expect(params.get('since')).toBe(String((values.time - 86_400_000) / 1000));
  });

  test('subscribes to the ticker by WebSocket v2 names, including direct fiat pairs', async () => {
    const { provider } = make();
    const feed = await provider.liveFeed(['BTC' as AssetId, 'NOPE' as AssetId]);
    const symbols = feed.subscribeMessages.flatMap(
      (m) => (JSON.parse(m) as { params: { symbol: string[] } }).params.symbol,
    );
    expect(symbols.sort()).toEqual(['BTC/EUR', 'BTC/USD']);
  });

  test('turns an error in the Kraken envelope into a data error', async () => {
    const fake = fakeFetch({ ...routes, '/Ticker': { body: { error: ['EService:Unavailable'] } } });
    await expect(createKrakenProvider({ fetch: fake.fetch }).snapshot()).rejects.toBeInstanceOf(
      ProviderDataError,
    );
  });
});
