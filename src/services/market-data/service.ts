import { rankTopCoins } from '@/domain/asset-classes';
import type { AssetId } from '@/domain/ids';
import type { ChartRange, PricePoint } from '@/domain/market';
import type { CryptoProvider, LiveFeed } from '@/providers/contract';

import { createLiveConnection, type LiveConnection, type SocketLike } from './live-connection';
import { applySnapshot, applyUpdates, RANKING_SIZE, setMarketStatus } from './live-prices';
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
      applySnapshot(await current.snapshot(), current);
    } catch {
      // Live updates continue. Old prices stay until they arrive.
    }
  }

  // The socket is closed in the background: no data is used and the OS would cut it anyway.
  function onAppStateChange(state: string) {
    if (!connection || !provider) return;
    if (state === 'background') {
      connection.stop();
      backgroundSince = now();
    } else if (state === 'active' && backgroundSince !== null) {
      const away = now() - backgroundSince;
      backgroundSince = null;
      if (away > REFRESH_AFTER_BACKGROUND_MS) void refreshSnapshot(provider);
      connection.start();
    }
  }

  return {
    async start() {
      if (provider) return;
      const run = ++generation;
      setMarketStatus('loading');
      try {
        const selection = await selectProvider(options.providers);
        const listed = rankTopCoins(selection.snapshot.quotes, RANKING_SIZE);
        const nextFeed = await selection.provider.liveFeed([...new Set([...listed, ...watched])]);
        // stop() ran while this start was waiting.
        if (run !== generation) return;
        provider = selection.provider;
        feed = nextFeed;
        applySnapshot(selection.snapshot, provider);
        connection = createLiveConnection({
          feed: nextFeed,
          onUpdates: applyUpdates,
          ...(options.openSocket ? { openSocket: options.openSocket } : {}),
          ...(options.random ? { random: options.random } : {}),
        });
        // Coins watched while the feed was loading.
        connection.send(nextFeed.addAssets(watched));
        connection.start();
        appStateSubscription = options.appState.addEventListener('change', onAppStateChange);
        setMarketStatus('live');
      } catch {
        if (run === generation) setMarketStatus('error');
      }
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
      connection?.stop();
      appStateSubscription?.remove();
      connection = null;
      feed = null;
      appStateSubscription = null;
      provider = null;
      backgroundSince = null;
    },
  };
}
