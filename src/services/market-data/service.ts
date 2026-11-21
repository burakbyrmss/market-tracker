import { rankTopCoins } from '@/domain/asset-classes';
import type { CryptoProvider } from '@/providers/contract';

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
};

export function createMarketDataService(options: MarketDataOptions): MarketDataService {
  const now = options.now ?? Date.now;
  let provider: CryptoProvider | null = null;
  let connection: LiveConnection | null = null;
  let appStateSubscription: { remove(): void } | null = null;
  let backgroundSince: number | null = null;
  let generation = 0;

  async function refreshSnapshot(current: CryptoProvider) {
    try {
      applySnapshot(await current.snapshot(), current.name);
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
        // The live feed covers the market list. Watchlists join in M10.
        const feed = await selection.provider.liveFeed(
          rankTopCoins(selection.snapshot.quotes, RANKING_SIZE),
        );
        // stop() ran while this start was waiting.
        if (run !== generation) return;
        provider = selection.provider;
        applySnapshot(selection.snapshot, provider.name);
        connection = createLiveConnection({
          feed,
          onUpdates: applyUpdates,
          ...(options.openSocket ? { openSocket: options.openSocket } : {}),
          ...(options.random ? { random: options.random } : {}),
        });
        connection.start();
        appStateSubscription = options.appState.addEventListener('change', onAppStateChange);
        setMarketStatus('live');
      } catch {
        if (run === generation) setMarketStatus('error');
      }
    },
    stop() {
      generation += 1;
      connection?.stop();
      appStateSubscription?.remove();
      connection = null;
      appStateSubscription = null;
      provider = null;
      backgroundSince = null;
    },
  };
}
