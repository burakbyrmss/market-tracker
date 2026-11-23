import type { AssetId } from '@/domain/ids';
import type { LiveUpdate } from '@/domain/market';
import { createBinanceProvider } from '@/providers/binance';
import type { CryptoProvider } from '@/providers/contract';
import { createKrakenProvider } from '@/providers/kraken';
import { createLiveConnection } from '@/services/market-data/live-connection';

const BTC = 'BTC' as AssetId;
const ETH = 'ETH' as AssetId;

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

  test('a coin added to the open socket starts sending prices', async () => {
    const feed = await create().liveFeed([ETH]);
    const btc = await new Promise<LiveUpdate>((resolve) => {
      let added = false;
      const connection = createLiveConnection({
        feed,
        onUpdates: (updates) => {
          // Add bitcoin once the first ether price proves the socket is open.
          if (!added) {
            added = true;
            connection.send(feed.addAssets([BTC]));
          }
          const update = updates.find((u) => u.assetId === BTC && u.quote === 'USD');
          if (update) {
            connection.stop();
            resolve(update);
          }
        },
      });
      connection.start();
    });
    expect(btc.updatedAt).toBeGreaterThan(Date.now() - 24 * 60 * 60_000);
  });
});
