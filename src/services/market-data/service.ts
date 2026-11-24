import { rankTopCoins } from '@/domain/asset-classes';
import type { AssetId } from '@/domain/ids';
import type { ChartRange, PricePoint } from '@/domain/market';
import type { CryptoProvider, LiveFeed } from '@/providers/contract';

import { createLiveConnection, type LiveConnection, type SocketLike } from './live-connection';
import {
  applySnapshot,
  applyUpdates,
  RANKING_SIZE,
  setConnected,
  setMarketStatus,
  useLivePrices,
} from './live-prices';
import type { PriceCache } from './saved-prices';
import { selectProvider } from './select-provider';

export type AppStateLike = {
  addEventListener(type: 'change', listener: (state: string) => void): { remove(): void };
};

export type MarketDataOptions = {
  providers: readonly CryptoProvider[];
  appState: AppStateLike;
  openSocket?: (url: string) => SocketLike;
  random?: () => number;
  now?: () => number;
  // Saved prices, shown until live ones arrive and when the network is down.
  cache?: PriceCache;
};

// After this long in the background, prices of quiet coins may be old, so resume refetches the
// snapshot. Busy coins update within a second either way.
export const REFRESH_AFTER_BACKGROUND_MS = 60_000;

export type MarketDataService = {
  start(): Promise<void>;
  stop(): void;
  // Coins that need live prices beyond the market list, such as watchlisted ones.
  watch(assetIds: readonly AssetId[]): void;
  // Chart data from the session's provider, so a chart never mixes in another provider's prices.
  history(assetId: AssetId, range: ChartRange, signal?: AbortSignal): Promise<PricePoint[]>;
};

export function createMarketDataService(options: MarketDataOptions): MarketDataService {
  const now = options.now ?? Date.now;
  let provider: CryptoProvider | null = null;
  let connection: LiveConnection | null = null;
  let feed: LiveFeed | null = null;
  let watched: readonly AssetId[] = [];
  let appStateSubscription: { remove(): void } | null = null;
  let backgroundSince: number | null = null;
  let generation = 0;

  async function refreshSnapshot(current: CryptoProvider) {
    try {
      applySnapshot(await current.snapshot(), current, now());
      options.cache?.save();
    } catch {
      // Live updates continue. Old prices stay until they arrive.
    }
  }

  // The socket is closed in the background: no data is used and the OS would cut it anyway.
  function onAppStateChange(state: string) {
    if (!connection || !provider) {
      // Started without a network. Coming back to the app is a good moment to try again.
      if (state === 'active' && useLivePrices.getState().status === 'error') void service.start();
      return;
    }
    if (state === 'background') {
      connection.stop();
      // Live updates since the last snapshot are saved too, so a restart offline shows them.
      options.cache?.save();
      backgroundSince = now();
    } else if (state === 'active' && backgroundSince !== null) {
      const away = now() - backgroundSince;
      backgroundSince = null;
      if (away > REFRESH_AFTER_BACKGROUND_MS) void refreshSnapshot(provider);
      connection.start();
    }
  }

  let starting: Promise<void> | null = null;

  async function startOnce() {
    const run = ++generation;
    options.cache?.restore();
    appStateSubscription ??= options.appState.addEventListener('change', onAppStateChange);
    setMarketStatus('loading');
    try {
      const selection = await selectProvider(options.providers);
      const listed = rankTopCoins(selection.snapshot.quotes, RANKING_SIZE);
      const nextFeed = await selection.provider.liveFeed([...new Set([...listed, ...watched])]);
      // stop() ran while this start was waiting.
      if (run !== generation) return;
      provider = selection.provider;
      feed = nextFeed;
      applySnapshot(selection.snapshot, provider, now());
      options.cache?.save();
      connection = createLiveConnection({
        feed: nextFeed,
        onUpdates: (updates) => applyUpdates(updates, now()),
        onDisconnect: () => setConnected(false),
        ...(options.openSocket ? { openSocket: options.openSocket } : {}),
        ...(options.random ? { random: options.random } : {}),
      });
      // Coins watched while the feed was loading.
      connection.send(nextFeed.addAssets(watched));
      connection.start();
      setMarketStatus('live');
    } catch {
      if (run === generation) setMarketStatus('error');
    }
  }

  const service: MarketDataService = {
    async start() {
      if (provider) return;
      // The retry button and a return to the foreground can both ask at once.
      if (!starting) {
        const attempt: Promise<void> = startOnce().finally(() => {
          if (starting === attempt) starting = null;
        });
        starting = attempt;
      }
      return starting;
    },
    async history(assetId, range, signal) {
      if (!provider) throw new Error('Market data has not started');
      return provider.history(assetId, range, signal);
    },
    watch(assetIds) {
      watched = assetIds;
      // Widening the open feed avoids a reconnect: Kraken bans an IP after about 150 in 10 minutes.
      if (feed && connection) connection.send(feed.addAssets(assetIds));
    },
    stop() {
      generation += 1;
      starting = null;
      options.cache?.save();
      connection?.stop();
      appStateSubscription?.remove();
      connection = null;
      feed = null;
      appStateSubscription = null;
      provider = null;
      backgroundSince = null;
    },
  };
  return service;
}
