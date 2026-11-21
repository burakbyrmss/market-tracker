import { render, screen, within } from '@testing-library/react-native';

import type { AssetId } from '@/domain/ids';
import type { MarketSnapshot, Quote } from '@/domain/market';
import { decimal } from '@/domain/money';
import { CryptoList } from '@/features/market/crypto-list';
import {
  applySnapshot,
  applyUpdates,
  resetLivePrices,
  setMarketStatus,
} from '@/services/market-data/live-prices';
import i18n from '@/shared/i18n';

const quote = (id: string, price: string, volume24h: number, change: number | null): Quote => ({
  assetId: id as AssetId,
  price: decimal(price),
  change24hPct: change,
  volume24h,
  updatedAt: 0,
});

const snapshot: MarketSnapshot = {
  source: 'binance',
  quotes: [
    quote('ETH', '2500', 500, -1.5),
    quote('BTC', '50000', 1000, 2.5),
    quote('USDC', '1', 5000, 0),
    quote('DOGE', '0.1', 100, null),
  ],
  directPrices: new Map(),
};

function goLive() {
  applySnapshot(snapshot, 'Binance');
  setMarketStatus('live');
}

const rowIds = () => screen.getAllByTestId(/^crypto-row-/).map((row) => row.props.testID as string);

afterEach(async () => {
  resetLivePrices();
  await i18n.changeLanguage('en');
});

test('lists coins by volume with price and change, without stablecoins', async () => {
  goLive();
  await render(<CryptoList />);

  expect(rowIds()).toEqual(['crypto-row-BTC', 'crypto-row-ETH', 'crypto-row-DOGE']);
  expect(within(screen.getByTestId('crypto-row-DOGE')).getByText('3')).toBeOnTheScreen();
  const btc = screen.getByTestId('crypto-row-BTC');
  expect(within(btc).getByText('$50,000.00')).toBeOnTheScreen();
  expect(within(btc).getByText('+2.50%')).toBeOnTheScreen();
  expect(screen.queryByTestId('crypto-row-USDC')).toBeNull();
});

test('names each row for screen readers', async () => {
  goLive();
  await render(<CryptoList />);
  expect(screen.getByLabelText('BTC, $50,000.00, +2.50%')).toBeOnTheScreen();
  expect(screen.getByLabelText('DOGE, $0.10')).toBeOnTheScreen();
});

test('shows the data source', async () => {
  goLive();
  await render(<CryptoList />);
  expect(screen.getByText('Source: Binance')).toBeOnTheScreen();
});

test('a live update changes the price in its row and keeps the order', async () => {
  goLive();
  await render(<CryptoList />);

  applyUpdates([
    {
      assetId: 'ETH' as AssetId,
      quote: 'USD',
      price: decimal('2600'),
      change24hPct: 4,
      volume24h: 99_999,
      updatedAt: 1,
    },
  ]);

  expect(await screen.findByText('$2,600.00')).toBeOnTheScreen();
  // FlashList recycles views, so check the rank each row shows, not the order in the tree.
  expect(within(screen.getByTestId('crypto-row-BTC')).getByText('1')).toBeOnTheScreen();
  expect(within(screen.getByTestId('crypto-row-ETH')).getByText('2')).toBeOnTheScreen();
});

test('formats prices for the app language', async () => {
  await i18n.changeLanguage('tr');
  goLive();
  await render(<CryptoList />);
  expect(screen.getByText('$50.000,00')).toBeOnTheScreen();
});

test('shows loading, then a retry when prices are unavailable', async () => {
  setMarketStatus('loading');
  const view = await render(<CryptoList />);
  expect(screen.getByText('Loading prices…')).toBeOnTheScreen();

  setMarketStatus('error');
  await view.rerender(<CryptoList />);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});
