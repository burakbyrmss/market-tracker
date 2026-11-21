import type { AssetId, CurrencyCode } from '@/domain/ids';
import type { LiveUpdate, MarketSnapshot, ProviderId } from '@/domain/market';
import { decimal, toDecimalString } from '@/domain/money';
import type { CryptoProvider } from '@/providers/contract';
import { ProviderHttpError } from '@/providers/http';
import { lastProviderId } from '@/services/market-data';
import { resetLivePrices, useLivePrices } from '@/services/market-data/live-prices';
import {
  createMarketDataService,
  REFRESH_AFTER_BACKGROUND_MS,
  type AppStateLike,
} from '@/services/market-data/service';
import { storage } from '@/shared/storage';

import { socketFactory } from './fake-socket';

const BTC = 'BTC' as AssetId;

function snapshot(source: ProviderId, price: string): MarketSnapshot {
  return {
    source,
    quotes: [
      { assetId: BTC, price: decimal(price), change24hPct: null, volume24h: 1, updatedAt: 0 },
    ],
    directPrices: new Map([[BTC, new Map([['EUR' as CurrencyCode, decimal('46000')]])]]),
  };
}

function fakeProvider(id: ProviderId, result: () => Promise<MarketSnapshot>): CryptoProvider {
  return {
    id,
    name: id === 'binance' ? 'Binance' : 'Kraken',
    quoteAsset: 'USD',
    listAssets: async () => [],
    history: async () => [],
    snapshot: jest.fn(result),
    liveFeed: async () => ({
      url: `wss://${id}.test`,
      subscribeMessages: [],
      maxAgeMs: null,
      parse: (message: string): LiveUpdate[] => [
        {
          assetId: BTC,
          quote: 'USD',
          price: decimal(message),
          change24hPct: 1,
          volume24h: 1,
          updatedAt: 1,
        },
      ],
    }),
  };
}

function fakeAppState() {
  let listener: ((state: string) => void) | null = null;
  const appState: AppStateLike = {
    addEventListener: (_type, fn) => {
      listener = fn;
      return { remove: () => (listener = null) };
    },
  };
  return { appState, moveTo: (state: string) => listener?.(state) };
}

const blocked = () => Promise.reject(new ProviderHttpError('https://binance.test', 451));

function setup(
  binance = fakeProvider('binance', async () => snapshot('binance', '50000')),
  kraken = fakeProvider('kraken', async () => snapshot('kraken', '50100')),
) {
  const sockets = socketFactory();
  const app = fakeAppState();
  let now = 0;
  const service = createMarketDataService({
    providers: [binance, kraken],
    appState: app.appState,
    openSocket: sockets.open,
    random: () => 1,
    now: () => now,
  });
  return { service, sockets, app, binance, kraken, advance: (ms: number) => (now += ms) };
}

const btcPrice = () => {
  const quote = useLivePrices.getState().quotes[BTC];
  return quote && toDecimalString(quote.price);
};

afterEach(() => {
  resetLivePrices();
  storage.clearAll();
});

test('uses Binance when it answers', async () => {
  const { service, sockets } = setup();
  await service.start();

  expect(useLivePrices.getState().source?.name).toBe('Binance');
  expect(sockets.latest().url).toBe('wss://binance.test');
  expect(btcPrice()).toBe('50000');
  expect(lastProviderId()).toBe('binance');
  service.stop();
});

test('falls back to Kraken when Binance answers HTTP 451', async () => {
  const { service, sockets } = setup(fakeProvider('binance', blocked));
  await service.start();

  expect(useLivePrices.getState().status).toBe('live');
  expect(useLivePrices.getState().source?.name).toBe('Kraken');
  expect(sockets.latest().url).toBe('wss://kraken.test');
  expect(btcPrice()).toBe('50100');
  expect(lastProviderId()).toBe('kraken');
  service.stop();
});

test('reports an error when no provider answers', async () => {
  const offline = () => Promise.reject(new TypeError('Network request failed'));
  const { service, sockets } = setup(
    fakeProvider('binance', blocked),
    fakeProvider('kraken', offline),
  );
  await service.start();

  expect(useLivePrices.getState().status).toBe('error');
  expect(sockets.sockets).toHaveLength(0);
  service.stop();
});

test('live messages update the price store', async () => {
  const { service, sockets } = setup();
  await service.start();
  sockets.latest().serverSends('50500');
  expect(btcPrice()).toBe('50500');
  service.stop();
});

test('closes the socket in the background and reopens it on return', async () => {
  const { service, sockets, app, binance, advance } = setup();
  await service.start();
  const first = sockets.latest();

  app.moveTo('background');
  expect(first.closed).toBe(true);
  advance(5_000);
  app.moveTo('active');
  expect(sockets.sockets).toHaveLength(2);
  // A short absence keeps the snapshot. Only the first start fetched one.
  expect(binance.snapshot).toHaveBeenCalledTimes(1);
  service.stop();
});

test('refreshes the snapshot after a long time in the background', async () => {
  const { service, app, binance, advance } = setup();
  await service.start();

  app.moveTo('background');
  advance(REFRESH_AFTER_BACKGROUND_MS + 1);
  app.moveTo('active');
  expect(binance.snapshot).toHaveBeenCalledTimes(2);
  service.stop();
});

test('an inactive moment, like opening Control Center, keeps the socket', async () => {
  const { service, sockets, app } = setup();
  await service.start();
  app.moveTo('inactive');
  expect(sockets.latest().closed).toBe(false);
  service.stop();
});
