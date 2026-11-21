import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react-native';

import type { FxRates } from '@/domain/fx';
import type { CurrencyCode } from '@/domain/ids';
import { decimal } from '@/domain/money';
import { FxList } from '@/features/fx/fx-list';
import { DEFAULT_SETTINGS, useSettings } from '@/features/settings/store';
import { fxQueries } from '@/services/fx';
import i18n from '@/shared/i18n';

const c = (code: string) => code as CurrencyCode;

// Per euro, as the ECB publishes. USD to TRY is 44 / 1.1 = 40.
const fx: FxRates = {
  base: c('EUR'),
  date: '2023-11-14',
  rates: new Map([
    [c('USD'), decimal('1.1')],
    [c('TRY'), decimal('44')],
    [c('JPY'), decimal('160')],
  ]),
};

async function renderList(data: FxRates | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  if (data) client.setQueryData(fxQueries.latest().queryKey, data);
  await render(
    <QueryClientProvider client={client}>
      <FxList />
    </QueryClientProvider>,
  );
}

afterEach(async () => {
  useSettings.setState(DEFAULT_SETTINGS);
  await i18n.changeLanguage('en');
});

test('values every currency in the display currency, with the ECB date', async () => {
  useSettings.setState({ displayCurrency: 'TRY' });
  await renderList(fx);

  const usd = screen.getByTestId('fx-row-USD');
  // English locales write the lira as a code, often with a no-break space. Turkish uses ₺.
  expect(within(usd).getByText(/^TRY\s40\.00$/)).toBeOnTheScreen();
  expect(within(usd).getByText('US dollar')).toBeOnTheScreen();
  expect(within(screen.getByTestId('fx-row-EUR')).getByText(/^TRY\s44\.00$/)).toBeOnTheScreen();
  expect(screen.queryByTestId('fx-row-TRY')).toBeNull();
  expect(screen.getByText('ECB reference rates of Nov 14, 2023')).toBeOnTheScreen();
  expect(screen.getByText('Source: ECB via Frankfurter')).toBeOnTheScreen();
});

test('keeps small values readable', async () => {
  useSettings.setState({ displayCurrency: 'USD' });
  await renderList(fx);
  // 1 JPY = 1.1 / 160 = 0.006875 USD.
  expect(within(screen.getByTestId('fx-row-JPY')).getByText('$0.006875')).toBeOnTheScreen();
});

test('names currencies in Turkish', async () => {
  await i18n.changeLanguage('tr');
  useSettings.setState({ displayCurrency: 'TRY' });
  await renderList(fx);
  expect(screen.getByLabelText('1 USD, ABD doları, ₺40,00')).toBeOnTheScreen();
});

test('offers a retry when the rates cannot be loaded', async () => {
  await renderList(null);
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeOnTheScreen();
});
