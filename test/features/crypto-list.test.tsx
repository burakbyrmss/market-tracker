import { act, fireEvent, screen, within } from '@testing-library/react-native';

import { decimal } from '@/domain/money';
import { CryptoList } from '@/features/market/crypto-list';
import { DEFAULT_SETTINGS, useSettings } from '@/features/settings/store';
import { marketData } from '@/services/market-data';
import {
  applySnapshot,
  applyUpdates,
  resetLivePrices,
  setConnected,
  setMarketStatus,
} from '@/services/market-data/live-prices';
import i18n from '@/shared/i18n';

import { asset, currency, goLive, renderWithQuery, snapshot } from '../market-fixtures';

const rowIds = () => screen.getAllByTestId(/^crypto-row-/).map((row) => row.props.testID as string);
const priceOf = (id: string) => screen.getByTestId(`price-${id}`);

afterEach(async () => {
  resetLivePrices();
  useSettings.setState(DEFAULT_SETTINGS);
  await i18n.changeLanguage('en');
});

test('lists coins by volume with price and change, without stablecoins', async () => {
  goLive();
  await renderWithQuery(<CryptoList />);

  expect(rowIds()).toEqual(['crypto-row-BTC', 'crypto-row-ETH', 'crypto-row-DOGE']);
  expect(within(screen.getByTestId('crypto-row-DOGE')).getByText('3')).toBeOnTheScreen();
  const btc = screen.getByTestId('crypto-row-BTC');
  expect(within(btc).getByText('$50,000.00')).toBeOnTheScreen();
  expect(within(btc).getByText('+2.50%')).toBeOnTheScreen();
  expect(screen.queryByTestId('crypto-row-USDC')).toBeNull();
});

test('shows each coin with its name and logo', async () => {
  goLive();
  await renderWithQuery(<CryptoList />);
  const btc = screen.getByTestId('crypto-row-BTC');
  expect(within(btc).getByText('Bitcoin')).toBeOnTheScreen();
  expect(within(btc).getByTestId('coin-icon-BTC')).toBeOnTheScreen();
});

test('names each row for screen readers', async () => {
  goLive();
  await renderWithQuery(<CryptoList />);
  expect(screen.getByLabelText('BTC, $50,000.00, +2.50%')).toBeOnTheScreen();
  expect(screen.getByLabelText('DOGE, $0.10')).toBeOnTheScreen();
});

test('shows the data source', async () => {
  goLive();
  await renderWithQuery(<CryptoList />);
  expect(screen.getByText('Source: Binance')).toBeOnTheScreen();
});

test('a live update changes the price in its row and keeps the order', async () => {
  goLive();
  await renderWithQuery(<CryptoList />);

  await act(() =>
    applyUpdates([
      {
        assetId: asset('ETH'),
        quote: 'USD',
        price: decimal('2600'),
        change24hPct: 4,
        volume24h: 99_999,
        updatedAt: 1,
      },
    ]),
  );

  expect(await screen.findByText('$2,600.00')).toBeOnTheScreen();
  // FlashList recycles views, so check the rank each row shows, not the order in the tree.
  expect(within(screen.getByTestId('crypto-row-BTC')).getByText('1')).toBeOnTheScreen();
  expect(within(screen.getByTestId('crypto-row-ETH')).getByText('2')).toBeOnTheScreen();
});

test('formats prices for the app language', async () => {
  await i18n.changeLanguage('tr');
  goLive();
  await renderWithQuery(<CryptoList />);
  expect(screen.getByText('$50.000,00')).toBeOnTheScreen();
});

test('shows loading, then a retry when prices are unavailable', async () => {
  setMarketStatus('loading');
  await renderWithQuery(<CryptoList />);
  expect(screen.getByText('Loading prices…')).toBeOnTheScreen();

  await act(() => setMarketStatus('error'));
  expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});

describe('saved prices', () => {
  // As the service leaves the store after a start without a network.
  function savedOffline(status: 'loading' | 'error') {
    applySnapshot(snapshot, { name: 'Binance', quoteAsset: 'USDT' }, Date.UTC(2026, 10, 20, 9, 30));
    setConnected(false);
    setMarketStatus(status);
  }

  test('offline, the list shows the saved prices, how old they are, and a retry', async () => {
    const start = jest.spyOn(marketData, 'start').mockResolvedValue();
    savedOffline('error');
    await renderWithQuery(<CryptoList />);

    expect(priceOf('BTC')).toHaveTextContent('$50,000.00');
    expect(screen.getByText('Source: Binance')).toBeOnTheScreen();
    expect(
      screen.getByText(/^Offline\. Showing saved prices from Nov \d+, \d\d:\d\d\s[AP]M\.$/),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(start).toHaveBeenCalled();
    start.mockRestore();
  });

  test('while connecting at launch, saved prices say so', async () => {
    savedOffline('loading');
    await renderWithQuery(<CryptoList />);
    expect(priceOf('ETH')).toHaveTextContent('$2,500.00');
    expect(screen.getByText(/^Showing saved prices from .+\. Connecting…$/)).toBeOnTheScreen();
  });

  test('live prices show no notice, and a dropped connection shows one until prices return', async () => {
    goLive();
    await renderWithQuery(<CryptoList />);
    expect(screen.queryByTestId('stale-notice')).toBeNull();

    await act(() => setConnected(false));
    expect(
      screen.getByText(/^Connection lost\. Prices from .+\. Reconnecting…$/),
    ).toBeOnTheScreen();

    await act(() =>
      applyUpdates([
        {
          assetId: asset('BTC'),
          quote: 'USD',
          price: decimal('50100'),
          change24hPct: null,
          volume24h: null,
          updatedAt: 1,
        },
      ]),
    );
    expect(screen.queryByTestId('stale-notice')).toBeNull();
  });

  test('the notice is in Turkish too', async () => {
    await i18n.changeLanguage('tr');
    savedOffline('error');
    await renderWithQuery(<CryptoList />);
    expect(
      screen.getByText(/^Çevrimdışı\. .+ tarihli kayıtlı fiyatlar gösteriliyor\.$/),
    ).toBeOnTheScreen();
  });
});

describe('display currency', () => {
  test('uses the direct pair when there is one, otherwise the USD price times the FX rate', async () => {
    useSettings.setState({ displayCurrency: 'EUR' });
    goLive();
    await renderWithQuery(<CryptoList />);

    // BTC/EUR trades directly at 46,000, not 50,000 / 1.1.
    expect(priceOf('BTC')).toHaveTextContent('€46,000.00');
    // ETH has no EUR pair: 2,500 / 1.1.
    expect(priceOf('ETH')).toHaveTextContent('€2,272.73');
    expect(screen.getByText('Sources: Binance, ECB via Frankfurter')).toBeOnTheScreen();
  });

  test('changing the currency in settings changes the list prices', async () => {
    goLive();
    await renderWithQuery(<CryptoList />);
    expect(priceOf('ETH')).toHaveTextContent('$2,500.00');

    await act(() => useSettings.getState().setDisplayCurrency('TRY'));

    // English writes the lira as a code, often with a no-break space.
    expect(priceOf('ETH')).toHaveTextContent(/^TRY\s100,000\.00$/);
    expect(priceOf('BTC')).toHaveTextContent(/^TRY\s2,000,000\.00$/);
  });

  test('a live direct-pair update changes the price in that currency', async () => {
    useSettings.setState({ displayCurrency: 'EUR' });
    goLive();
    await renderWithQuery(<CryptoList />);

    await act(() =>
      applyUpdates([
        {
          assetId: asset('BTC'),
          quote: currency('EUR'),
          price: decimal('47000'),
          change24hPct: null,
          volume24h: null,
          updatedAt: 1,
        },
      ]),
    );

    expect(priceOf('BTC')).toHaveTextContent('€47,000.00');
  });

  test('shows a dash, not a wrong price, while FX rates are missing', async () => {
    useSettings.setState({ displayCurrency: 'TRY' });
    goLive();
    await renderWithQuery(<CryptoList />, null);

    expect(priceOf('ETH')).toHaveTextContent('–');
    expect(screen.getByLabelText('ETH, price unavailable, -1.50%')).toBeOnTheScreen();
  });
});
