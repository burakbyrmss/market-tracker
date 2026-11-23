import type { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react-native';

import type { CurrencyCode } from '@/domain/ids';
import { FxDetail } from '@/features/fx/fx-detail';
import { DEFAULT_SETTINGS, useSettings } from '@/features/settings/store';
import { fxQueries } from '@/services/fx';
import i18n from '@/shared/i18n';

import { currency, renderWithQuery } from '../market-fixtures';

function seedHistory(base: CurrencyCode, quote: CurrencyCode, prices: number[]) {
  return (client: QueryClient) =>
    client.setQueryData(
      fxQueries.history(base, quote, '1M').queryKey,
      prices.map((price, index) => ({ time: Date.UTC(2023, 10, 1 + index), price })),
    );
}

afterEach(async () => {
  useSettings.setState(DEFAULT_SETTINGS);
  await i18n.changeLanguage('en');
});

test('values a currency in the display currency and charts that pair', async () => {
  useSettings.setState({ displayCurrency: 'TRY' });
  await renderWithQuery(
    <FxDetail code={currency('USD')} />,
    undefined,
    seedHistory(currency('USD'), currency('TRY'), [38, 40]),
  );

  expect(screen.getByTestId('fx-detail-rate')).toHaveTextContent(/^1 USD = TRY\s40\.00$/);
  expect(screen.getByText('US dollar')).toBeOnTheScreen();
  expect(screen.getByText('ECB reference rate of Nov 14, 2023')).toBeOnTheScreen();
  expect(screen.getByText('Chart: USD/TRY on ECB via Frankfurter')).toBeOnTheScreen();
  expect(screen.getByTestId('chart-value')).toHaveTextContent(/^TRY\s40\.00$/);
});

test('the display currency itself is valued in US dollars', async () => {
  useSettings.setState({ displayCurrency: 'TRY' });
  await renderWithQuery(
    <FxDetail code={currency('TRY')} />,
    undefined,
    seedHistory(currency('TRY'), currency('USD'), [0.026, 0.025]),
  );

  expect(screen.getByTestId('fx-detail-rate')).toHaveTextContent('1 TRY = $0.025');
  expect(screen.getByText('Chart: TRY/USD on ECB via Frankfurter')).toBeOnTheScreen();
});

test('a code the ECB does not publish says so', async () => {
  await renderWithQuery(<FxDetail code={currency('XYZ')} />);
  expect(screen.getByText('XYZ is not in the ECB reference rates.')).toBeOnTheScreen();
});
