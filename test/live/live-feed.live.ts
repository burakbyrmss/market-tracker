import type { AssetId } from '@/domain/ids';
import type { LiveUpdate } from '@/domain/market';
import { createBinanceProvider } from '@/providers/binance';
import type { CryptoProvider } from '@/providers/contract';
import { createKrakenProvider } from '@/providers/kraken';
import { createLiveConnection } from '@/services/market-data/live-connection';

const BTC = 'BTC' as AssetId;

describe.each<[string, () => CryptoProvider]>([
  ['Binance', createBinanceProvider],
  ['Kraken', createKrakenProvider],
])('%s live WebSocket', (_, create) => {
  test('delivers a bitcoin price within 20 seconds', async () => {
    const feed = await create().liveFeed([BTC]);
    const btc = await new Promise<LiveUpdate>((resolve) => {
      const connection = createLiveConnection({
        feed,
        onUpdates: (updates) => {
          const update = updates.find((u) => u.assetId === BTC && u.quote === 'USD');
          if (update) {
            connection.stop();
            resolve(update);
          }
        },
      });
      connection.start();
    });
    expect(btc.change24hPct).not.toBeNull();
    expect(btc.updatedAt).toBeGreaterThan(Date.now() - 24 * 60 * 60_000);
  });
});
