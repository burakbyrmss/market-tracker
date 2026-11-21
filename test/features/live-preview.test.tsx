import { render, screen } from '@testing-library/react-native';

import type { AssetId } from '@/domain/ids';
import { decimal } from '@/domain/money';
import { LivePreview } from '@/features/market/live-preview';
import {
  applySnapshot,
  applyUpdates,
  resetLivePrices,
  setMarketStatus,
} from '@/services/market-data/live-prices';

const BTC = 'BTC' as AssetId;

afterEach(resetLivePrices);

test('shows a loading message before prices arrive', async () => {
  setMarketStatus('loading');
  await render(<LivePreview />);
  expect(screen.getByText('Loading prices…')).toBeOnTheScreen();
});

test('shows live prices with their source', async () => {
  applySnapshot(
    {
      source: 'kraken',
      quotes: [
        { assetId: BTC, price: decimal('50000'), change24hPct: null, volume24h: 1, updatedAt: 0 },
      ],
      directPrices: new Map(),
    },
    'Kraken',
  );
  setMarketStatus('live');
  await render(<LivePreview />);

  expect(screen.getByText('$50,000.00')).toBeOnTheScreen();
  expect(screen.getByText('Source: Kraken')).toBeOnTheScreen();
});

test('updates the price when a live update arrives', async () => {
  applySnapshot(
    {
      source: 'binance',
      quotes: [
        { assetId: BTC, price: decimal('50000'), change24hPct: 1, volume24h: 1, updatedAt: 0 },
      ],
      directPrices: new Map(),
    },
    'Binance',
  );
  setMarketStatus('live');
  await render(<LivePreview />);

  applyUpdates([
    {
      assetId: BTC,
      quote: 'USD',
      price: decimal('51000'),
      change24hPct: -2,
      volume24h: 1,
      updatedAt: 1,
    },
  ]);

  expect(await screen.findByText('$51,000.00')).toBeOnTheScreen();
  expect(screen.getByText('-2.00%')).toBeOnTheScreen();
});

test('offers a retry when no provider is reachable', async () => {
  setMarketStatus('error');
  await render(<LivePreview />);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});
