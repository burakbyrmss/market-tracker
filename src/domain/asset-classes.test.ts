import { rankTopCoins } from './asset-classes';
import type { AssetId } from './ids';
import type { Quote } from './market';
import { decimal } from './money';

const quote = (id: string, volume24h: number): Quote => ({
  assetId: id as AssetId,
  price: decimal('1'),
  change24hPct: null,
  volume24h,
  updatedAt: 0,
});

test('ranks coins by volume and skips stablecoins, fiat, and tokenized stocks', () => {
  const quotes = [
    quote('ETH', 50),
    quote('USDC', 1000),
    quote('BTC', 100),
    quote('EUR', 900),
    quote('NVDAB', 800),
    quote('DOGE', 10),
  ];
  expect(rankTopCoins(quotes, 2)).toEqual(['BTC', 'ETH']);
  expect(rankTopCoins(quotes, 10)).toEqual(['BTC', 'ETH', 'DOGE']);
});
