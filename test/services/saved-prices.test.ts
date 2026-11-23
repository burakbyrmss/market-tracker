import type { AssetId, CurrencyCode } from '@/domain/ids';
import { decimal, toDecimalString } from '@/domain/money';
import { applySnapshot, resetLivePrices, useLivePrices } from '@/services/market-data/live-prices';
import { savedPrices } from '@/services/market-data/saved-prices';
import { storage } from '@/shared/storage';

const BTC = 'BTC' as AssetId;
const SHIB = 'SHIB' as AssetId;
const EUR = 'EUR' as CurrencyCode;

function seed() {
  applySnapshot(
    {
      source: 'kraken',
      quotes: [
        {
          assetId: BTC,
          price: decimal('50000.12'),
          change24hPct: -1.5,
          volume24h: 9,
          updatedAt: 7,
        },
        // More digits than a float holds: saved prices must read back exactly.
        {
          assetId: SHIB,
          price: decimal('0.000012345678901234'),
          change24hPct: null,
          volume24h: 3,
          updatedAt: 8,
        },
      ],
      directPrices: new Map([[BTC, new Map([[EUR, decimal('46000.5')]])]]),
    },
    { name: 'Kraken', quoteAsset: 'USD' },
    1_000,
  );
}

afterEach(() => {
  resetLivePrices();
  storage.clearAll();
});

test('saved prices read back exactly, with their source, order, and time', () => {
  seed();
  savedPrices.save();
  resetLivePrices();
  savedPrices.restore();

  const state = useLivePrices.getState();
  expect(state.source).toEqual({ id: 'kraken', name: 'Kraken', quoteAsset: 'USD' });
  expect(toDecimalString(state.quotes[SHIB]!.price)).toBe('0.000012345678901234');
  expect(state.quotes[BTC]).toMatchObject({ change24hPct: -1.5, volume24h: 9, updatedAt: 7 });
  expect(toDecimalString(state.directPrices[BTC]!.get(EUR)!)).toBe('46000.5');
  expect(state.ranking).toEqual([BTC, SHIB]);
  expect(state.listed).toEqual([BTC, SHIB]);
  expect(state.asOf).toBe(1_000);
  // Saved prices are never live.
  expect(state.connected).toBe(false);
  expect(state.status).toBe('idle');
});

test('restoring never replaces prices already in the store', () => {
  seed();
  savedPrices.save();
  useLivePrices.setState({ asOf: 2_000 });
  savedPrices.restore();
  expect(useLivePrices.getState().asOf).toBe(2_000);
});

test('damaged or foreign saved data is ignored', () => {
  for (const raw of ['not json', '{"source":1}', JSON.stringify({ quotes: [] })]) {
    storage.set('saved-prices.v1', raw);
    savedPrices.restore();
    expect(useLivePrices.getState().source).toBeNull();
  }
});

test('a price that is not a decimal string drops the saved prices', () => {
  seed();
  savedPrices.save();
  const stored = JSON.parse(storage.getString('saved-prices.v1')!);
  stored.quotes[0].price = '5e4';
  storage.set('saved-prices.v1', JSON.stringify(stored));
  resetLivePrices();

  savedPrices.restore();
  expect(useLivePrices.getState().source).toBeNull();
});

test('nothing is saved before prices arrive', () => {
  savedPrices.save();
  expect(storage.getString('saved-prices.v1')).toBeUndefined();
});
