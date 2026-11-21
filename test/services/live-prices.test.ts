import type { AssetId } from '@/domain/ids';
import type { LiveUpdate, MarketSnapshot } from '@/domain/market';
import { decimal, toDecimalString } from '@/domain/money';
import {
  applySnapshot,
  applyUpdates,
  resetLivePrices,
  useLivePrices,
} from '@/services/market-data/live-prices';

const id = (raw: string) => raw as AssetId;

const snapshot: MarketSnapshot = {
  source: 'kraken',
  quotes: ['BTC', 'ETH'].map((asset) => ({
    assetId: id(asset),
    price: decimal('100'),
    change24hPct: null,
    volume24h: 10,
    updatedAt: 0,
  })),
  directPrices: new Map(),
};

const update = (overrides: Partial<LiveUpdate>): LiveUpdate => ({
  assetId: id('BTC'),
  quote: 'USD',
  price: decimal('101'),
  change24hPct: 2,
  volume24h: 20,
  updatedAt: 1,
  ...overrides,
});

afterEach(resetLivePrices);

test('an update leaves other assets untouched, so their rows do not re-render', () => {
  applySnapshot(snapshot, 'Kraken');
  const ethBefore = useLivePrices.getState().quotes.ETH;

  applyUpdates([update({})]);

  const { quotes } = useLivePrices.getState();
  expect(quotes.ETH).toBe(ethBefore);
  expect(quotes.BTC && toDecimalString(quotes.BTC.price)).toBe('101');
});

test('keeps the last known change when an update has none', () => {
  applySnapshot(snapshot, 'Kraken');
  applyUpdates([update({ change24hPct: 3 })]);
  applyUpdates([update({ change24hPct: null, price: decimal('102') })]);
  expect(useLivePrices.getState().quotes.BTC?.change24hPct).toBe(3);
});

test('direct fiat updates go to the direct price table', () => {
  applySnapshot(snapshot, 'Kraken');
  applyUpdates([update({ quote: 'EUR' as never, price: decimal('93') })]);
  const eur = useLivePrices.getState().directPrices.BTC?.EUR;
  expect(eur && toDecimalString(eur)).toBe('93');
  expect(toDecimalString(useLivePrices.getState().quotes.BTC!.price)).toBe('100');
});
