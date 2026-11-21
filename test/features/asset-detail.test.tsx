import { screen, within } from '@testing-library/react-native';

import { AssetDetail } from '@/features/market/asset-detail';
import { DEFAULT_SETTINGS, useSettings } from '@/features/settings/store';
import { resetLivePrices, setMarketStatus } from '@/services/market-data/live-prices';
import i18n from '@/shared/i18n';

import { asset, goLive, renderWithQuery } from '../market-fixtures';

const method = () => within(screen.getByTestId('price-method'));

afterEach(async () => {
  resetLivePrices();
  useSettings.setState(DEFAULT_SETTINGS);
  await i18n.changeLanguage('en');
});

test('a USD price names the pair and says USDT counts as USD', async () => {
  goLive();
  await renderWithQuery(<AssetDetail assetId={asset('BTC')} />);

  expect(screen.getByTestId('detail-price')).toHaveTextContent('$50,000.00');
  expect(method().getByText('BTC/USDT price on Binance.')).toBeOnTheScreen();
  expect(method().getByText('The app counts 1 USDT as 1 USD.')).toBeOnTheScreen();
});

test('a direct pair price names the pair', async () => {
  useSettings.setState({ displayCurrency: 'EUR' });
  goLive();
  await renderWithQuery(<AssetDetail assetId={asset('BTC')} />);

  expect(screen.getByTestId('detail-price')).toHaveTextContent('€46,000.00');
  expect(method().getByText('Direct BTC/EUR price on Binance.')).toBeOnTheScreen();
});

test('an FX-converted price shows the USD price, the rate, its source, and its date', async () => {
  useSettings.setState({ displayCurrency: 'TRY' });
  goLive();
  await renderWithQuery(<AssetDetail assetId={asset('ETH')} />);

  expect(screen.getByTestId('detail-price')).toHaveTextContent(/^TRY\s100,000\.00$/);
  expect(method().getByText('ETH/USDT price on Binance: $2,500.00')).toBeOnTheScreen();
  expect(
    method().getByText('× USD/TRY rate 40.0000 from ECB via Frankfurter, Nov 14, 2023'),
  ).toBeOnTheScreen();
  expect(method().getByText('The app counts 1 USDT as 1 USD.')).toBeOnTheScreen();
});

test('says why a price is missing', async () => {
  useSettings.setState({ displayCurrency: 'TRY' });
  goLive();
  await renderWithQuery(<AssetDetail assetId={asset('ETH')} />, null);

  expect(screen.getByTestId('detail-price')).toHaveTextContent('–');
  expect(method().getByText('The USD/TRY rate has not loaded yet.')).toBeOnTheScreen();
});

test('explains the method in Turkish', async () => {
  await i18n.changeLanguage('tr');
  useSettings.setState({ displayCurrency: 'EUR' });
  goLive();
  await renderWithQuery(<AssetDetail assetId={asset('BTC')} />);

  expect(screen.getByTestId('detail-price')).toHaveTextContent('€46.000,00');
  expect(method().getByText('Binance üzerindeki doğrudan BTC/EUR fiyatı.')).toBeOnTheScreen();
});

test('a coin the provider does not list says so', async () => {
  goLive();
  await renderWithQuery(<AssetDetail assetId={asset('XRP')} />);
  expect(screen.getByText('XRP is not listed on Binance.')).toBeOnTheScreen();
});

test('waits for prices before the first snapshot', async () => {
  setMarketStatus('loading');
  await renderWithQuery(<AssetDetail assetId={asset('BTC')} />);
  expect(screen.getByText('Loading prices…')).toBeOnTheScreen();
});
