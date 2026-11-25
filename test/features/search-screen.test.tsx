import { fireEvent, screen } from '@testing-library/react-native';

import { SearchScreen } from '@/features/search/search-screen';
import { EMPTY_WATCHLISTS, useWatchlists } from '@/features/watchlist/store';
import { resetLivePrices } from '@/services/market-data/live-prices';
import i18n from '@/shared/i18n';
import { storage } from '@/shared/storage';

import { goLive, renderWithQuery } from '../market-fixtures';

async function type(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Search coins and currencies'), text);
}

afterEach(async () => {
  resetLivePrices();
  useWatchlists.setState(EMPTY_WATCHLISTS);
  storage.clearAll();
  await i18n.changeLanguage('en');
});

test('starts with a hint, and says when nothing matches', async () => {
  goLive();
  await renderWithQuery(<SearchScreen />);
  expect(screen.getByText('Type a ticker, a currency code, or a currency name.')).toBeOnTheScreen();

  await type('zzzz');
  expect(screen.getByText('No matches.')).toBeOnTheScreen();
});

test('finds coins the market list hides, such as stablecoins', async () => {
  goLive();
  await renderWithQuery(<SearchScreen />);
  await type('usdc');
  expect(screen.getByTestId('search-crypto-USDC')).toBeOnTheScreen();
});

test('finds a coin by its name', async () => {
  goLive();
  await renderWithQuery(<SearchScreen />);
  await type('bitco');
  expect(screen.getByTestId('search-crypto-BTC')).toHaveTextContent(/Bitcoin/);
  expect(screen.queryByTestId('search-crypto-ETH')).toBeNull();
});

test('finds a currency by its name in the app language', async () => {
  await i18n.changeLanguage('tr');
  goLive();
  await renderWithQuery(<SearchScreen />);
  await fireEvent.changeText(screen.getByLabelText('Coin ve para birimi ara'), 'lirasi');

  expect(screen.getByTestId('search-fx-TRY')).toHaveTextContent(/Türk lirası/);
});

test('the star adds a coin or currency to its watchlist, and removes it again', async () => {
  goLive();
  await renderWithQuery(<SearchScreen />);
  await type('eth');
  await fireEvent.press(screen.getByRole('button', { name: 'Add ETH to watchlist' }));

  expect(useWatchlists.getState().crypto).toEqual(['ETH']);
  expect(
    screen.getByRole('button', { name: 'Remove ETH from watchlist', selected: true }),
  ).toBeOnTheScreen();

  await type('usd');
  await fireEvent.press(screen.getByRole('button', { name: 'Add USD to watchlist' }));
  expect(useWatchlists.getState().fx).toEqual(['USD']);

  await type('eth');
  await fireEvent.press(screen.getByRole('button', { name: 'Remove ETH from watchlist' }));
  expect(useWatchlists.getState().crypto).toEqual([]);
});
