import { fireEvent, screen } from '@testing-library/react-native';

import { ConverterScreen } from '@/features/converter/converter-screen';
import { DEFAULT_SETTINGS, useSettings } from '@/features/settings/store';
import { resetLivePrices } from '@/services/market-data/live-prices';
import i18n from '@/shared/i18n';

import { goLive, renderWithQuery } from '../market-fixtures';

const result = () => screen.getByTestId('converter-result');

async function pick(side: 'from' | 'to', query: string, key: string) {
  await fireEvent.press(screen.getByTestId(`converter-${side}`));
  await fireEvent.changeText(screen.getByLabelText('Search coins and currencies'), query);
  await fireEvent.press(screen.getByTestId(`unit-${key}`));
}

afterEach(async () => {
  resetLivePrices();
  useSettings.setState(DEFAULT_SETTINGS);
  await i18n.changeLanguage('en');
});

test('starts with 1 BTC in the display currency, with its rate and source', async () => {
  goLive();
  await renderWithQuery(<ConverterScreen />);
  expect(result()).toHaveTextContent('$50,000.00');
  expect(screen.getByTestId('converter-rate')).toHaveTextContent('1 BTC = $50,000.00');
  expect(screen.getByText('Source: Binance')).toBeOnTheScreen();
});

test('uses the direct pair for a currency the provider trades', async () => {
  useSettings.setState({ displayCurrency: 'EUR' });
  goLive();
  await renderWithQuery(<ConverterScreen />);
  expect(result()).toHaveTextContent('€46,000.00');
  expect(screen.getByText('Uses the direct BTC/EUR price on Binance.')).toBeOnTheScreen();
});

test('accepts a decimal comma, and flags input that is not a number', async () => {
  goLive();
  await renderWithQuery(<ConverterScreen />);

  await fireEvent.changeText(screen.getByLabelText('Amount'), '0,5');
  expect(result()).toHaveTextContent('$25,000.00');

  await fireEvent.changeText(screen.getByLabelText('Amount'), '1.2.3');
  expect(screen.getByText('Enter a number such as 1.5.')).toBeOnTheScreen();
  expect(screen.queryByTestId('converter-result')).toBeNull();
});

test('swaps the two sides', async () => {
  goLive();
  await renderWithQuery(<ConverterScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Swap' }));
  expect(result()).toHaveTextContent('0.00002 BTC');
  expect(screen.getByTestId('converter-rate')).toHaveTextContent('1 USD = 0.00002 BTC');
});

test('converts coin to coin, picked through search', async () => {
  goLive();
  await renderWithQuery(<ConverterScreen />);
  await pick('to', 'eth', 'crypto-ETH');

  expect(result()).toHaveTextContent('20 ETH');
  expect(screen.getByText("Crosses both coins' prices on Binance.")).toBeOnTheScreen();
});

test('converts through the ECB rate, and names it with its date', async () => {
  goLive();
  await renderWithQuery(<ConverterScreen />);
  await pick('to', 'lira', 'fiat-TRY');

  expect(result()).toHaveTextContent(/^TRY\s2,000,000\.00$/);
  expect(screen.getByText('Uses the BTC price on Binance and the ECB USD rate.')).toBeOnTheScreen();
  expect(
    screen.getByText('Source: ECB via Frankfurter. ECB reference rate of Nov 14, 2023'),
  ).toBeOnTheScreen();
});

test('converts fiat to fiat', async () => {
  goLive();
  await renderWithQuery(<ConverterScreen />);
  await pick('from', 'eur', 'fiat-EUR');
  await pick('to', 'try', 'fiat-TRY');
  // 1 EUR = 44 TRY, straight from the ECB.
  expect(result()).toHaveTextContent(/^TRY\s44\.00$/);
});

test('says when a pair has no price yet', async () => {
  useSettings.setState({ displayCurrency: 'TRY' });
  goLive();
  await renderWithQuery(<ConverterScreen />, null);
  expect(result()).toHaveTextContent('No price for this pair yet.');
});
