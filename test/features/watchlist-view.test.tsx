import { fireEvent, screen, within } from '@testing-library/react-native';

import { DEFAULT_SETTINGS, useSettings } from '@/features/settings/store';
import { EMPTY_WATCHLISTS, useWatchlists } from '@/features/watchlist/store';
import { WatchlistView } from '@/features/watchlist/watchlist-view';
import { resetLivePrices } from '@/services/market-data/live-prices';
import i18n from '@/shared/i18n';
import { storage } from '@/shared/storage';

import { asset, currency, goLive, renderWithQuery } from '../market-fixtures';

const editRows = () => screen.getAllByTestId(/^edit-crypto-/).map((row) => row.props.testID);

afterEach(async () => {
  resetLivePrices();
  useWatchlists.setState(EMPTY_WATCHLISTS);
  useSettings.setState(DEFAULT_SETTINGS);
  storage.clearAll();
  await i18n.changeLanguage('en');
});

test('an empty watchlist points to search', async () => {
  await renderWithQuery(<WatchlistView />);
  expect(
    screen.getByText('Your watchlist is empty. Find coins and currencies in Search.'),
  ).toBeOnTheScreen();
  expect(screen.getByRole('link', { name: 'Search' })).toBeOnTheScreen();
});

test('shows watched coins and currencies in the display currency, with sources', async () => {
  useSettings.setState({ displayCurrency: 'EUR' });
  useWatchlists.setState({ crypto: [asset('ETH')], fx: [currency('TRY')] });
  goLive();
  await renderWithQuery(<WatchlistView />);

  expect(screen.getByTestId('price-ETH')).toHaveTextContent('€2,272.73');
  // 1 TRY = 1 / 44 EUR.
  expect(within(screen.getByTestId('fx-row-TRY')).getByText('€0.02273')).toBeOnTheScreen();
  expect(screen.getByText('Sources: Binance, ECB via Frankfurter')).toBeOnTheScreen();
});

test('a coin the provider does not list stays, marked unavailable', async () => {
  useWatchlists.setState({ crypto: [asset('XRP')] });
  goLive();
  await renderWithQuery(<WatchlistView />);
  expect(
    within(screen.getByTestId('crypto-row-XRP')).getByText('Unavailable from Binance'),
  ).toBeOnTheScreen();
});

test('edit mode reorders and removes items', async () => {
  useWatchlists.setState({ crypto: [asset('BTC'), asset('ETH'), asset('DOGE')] });
  goLive();
  await renderWithQuery(<WatchlistView />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit' }));

  expect(screen.queryByRole('button', { name: 'Move BTC up' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Move DOGE up' }));
  expect(editRows()).toEqual(['edit-crypto-BTC', 'edit-crypto-DOGE', 'edit-crypto-ETH']);

  await fireEvent.press(screen.getByRole('button', { name: 'Remove BTC' }));
  expect(useWatchlists.getState().crypto).toEqual(['DOGE', 'ETH']);

  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(screen.getByTestId('price-DOGE')).toBeOnTheScreen();
});
