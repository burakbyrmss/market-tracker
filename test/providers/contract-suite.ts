import type { AssetId } from '@/domain/ids';
import { toDecimalString } from '@/domain/money';
import type { CryptoProvider, ProviderOptions } from '@/providers/contract';
import { ProviderDataError, ProviderHttpError } from '@/providers/http';

import values from '../fixtures/synthetic-values.json';
import { fakeFetch, type Route } from './fake-fetch';

export type ContractCase = {
  create: (options: ProviderOptions) => CryptoProvider;
  // Fixture routes for a healthy provider.
  routes: Record<string, Route>;
  // The route key of the snapshot endpoint, used to inject failures.
  snapshotRoute: string;
  // Fiat currencies the fixtures give BTC a direct pair in.
  btcDirectFiat: string[];
  // Recorded WebSocket messages, as the socket delivers them.
  liveMessages: string[];
};

const id = (raw: string) => raw as AssetId;
const NOW = values.time;

// Every crypto adapter passes this suite (docs/architecture/providers.md).
export function describeProviderContract(name: string, c: ContractCase) {
  const make = (routes = c.routes) => {
    const fake = fakeFetch(routes);
    return { provider: c.create({ fetch: fake.fetch, now: () => NOW }), calls: fake.calls };
  };

  describe(`${name} provider contract`, () => {
    test('lists coins that have a USD pair, under our own IDs', async () => {
      const { provider } = make();
      const assets = await provider.listAssets();
      expect(assets.map((a) => a.id).sort()).toEqual(['BTC', 'DOGE', 'ETH']);
    });

    test('lists the direct fiat pairs for each coin', async () => {
      const { provider } = make();
      const btc = (await provider.listAssets()).find((a) => a.id === 'BTC');
      expect([...(btc?.directFiat ?? [])].sort()).toEqual(c.btcDirectFiat);
    });

    test('snapshot prices each coin in the quote asset, exactly', async () => {
      const { provider } = make();
      const snapshot = await provider.snapshot();
      expect(snapshot.source).toBe(provider.id);

      const byId = new Map(snapshot.quotes.map((q) => [q.assetId, q]));
      expect([...byId.keys()].sort()).toEqual(['BTC', 'DOGE', 'ETH']);
      const btc = byId.get(id('BTC'));
      expect(btc && toDecimalString(btc.price)).toBe(values.prices['BTC/USD']);
      expect(btc?.volume24h).toBe(Number(values.prices['BTC/USD']) * Number(values.baseVolume));
      const doge = byId.get(id('DOGE'));
      expect(doge && toDecimalString(doge.price)).toBe(values.prices['DOGE/USD']);
    });

    test('snapshot includes direct fiat prices', async () => {
      const { provider } = make();
      const direct = (await provider.snapshot()).directPrices.get(id('BTC'));
      const eur = direct?.get('EUR' as never);
      expect(eur && toDecimalString(eur)).toBe(values.prices['BTC/EUR']);
    });

    test('history returns closes oldest first, with times in milliseconds', async () => {
      const { provider } = make();
      const points = await provider.history(id('BTC'), '1Y');
      expect(points.map((p) => p.price)).toEqual(values.candleCloses.map(Number));
      expect(points.at(-1)?.time).toBe(NOW);
    });

    test('history rejects a coin the provider does not list', async () => {
      const { provider } = make();
      await expect(provider.history(id('NOPE'), '1D')).rejects.toBeInstanceOf(ProviderDataError);
    });

    test('reports the HTTP status when the provider refuses the request', async () => {
      const { provider } = make({ ...c.routes, [c.snapshotRoute]: { body: {}, status: 451 } });
      const error = await provider.snapshot().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ProviderHttpError);
      expect((error as ProviderHttpError).status).toBe(451);
    });

    test('rejects a response with an unexpected shape', async () => {
      const { provider } = make({ ...c.routes, [c.snapshotRoute]: { body: { surprise: true } } });
      await expect(provider.snapshot()).rejects.toBeInstanceOf(ProviderDataError);
    });

    test('live feed turns recorded messages into price updates', async () => {
      const { provider } = make();
      const feed = await provider.liveFeed([id('BTC'), id('ETH'), id('DOGE')]);
      expect(feed.url).toMatch(/^wss:\/\//);
      const updates = c.liveMessages.flatMap((message) => feed.parse(message));

      const btcUsd = updates.find((u) => u.assetId === 'BTC' && u.quote === 'USD');
      expect(btcUsd && toDecimalString(btcUsd.price)).toBe(values.prices['BTC/USD']);
      expect(btcUsd?.change24hPct).toBe(25);
      expect(btcUsd?.updatedAt).toBe(NOW);
      const btcEur = updates.find((u) => u.assetId === 'BTC' && u.quote === 'EUR');
      expect(btcEur && toDecimalString(btcEur.price)).toBe(values.prices['BTC/EUR']);
    });

    test('live feed ignores messages without prices', async () => {
      const { provider } = make();
      const feed = await provider.liveFeed([id('BTC')]);
      expect(feed.parse('not json')).toEqual([]);
      expect(feed.parse('{"channel":"heartbeat"}')).toEqual([]);
      expect(feed.parse('[]')).toEqual([]);
    });

    test('fetches the asset list once for snapshot and history', async () => {
      const { provider, calls } = make();
      await provider.snapshot();
      await provider.history(id('BTC'), '1D');
      expect(calls.filter((url) => url.includes(Object.keys(c.routes)[0] ?? ''))).toHaveLength(1);
    });
  });
}
