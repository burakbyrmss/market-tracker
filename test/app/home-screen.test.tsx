import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import MarketsScreen from '@/app/index';
import i18n from '@/shared/i18n';

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  await render(
    <QueryClientProvider client={client}>
      <MarketsScreen />
    </QueryClientProvider>,
  );
}

afterEach(async () => {
  await i18n.changeLanguage('en');
});

test('markets screen shows its title as a header', async () => {
  await renderScreen();
  expect(screen.getByRole('header', { name: 'Markets' })).toBeOnTheScreen();
});

test('markets screen shows Turkish text when the language is Turkish', async () => {
  await i18n.changeLanguage('tr');
  await renderScreen();
  expect(screen.getByRole('header', { name: 'Piyasalar' })).toBeOnTheScreen();
  expect(screen.getByRole('link', { name: 'Ayarlar' })).toBeOnTheScreen();
});

test('switches between the crypto and FX lists', async () => {
  await renderScreen();
  expect(screen.getByRole('tab', { name: 'Crypto', selected: true })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('tab', { name: 'FX' }));

  expect(screen.getByRole('tab', { name: 'FX', selected: true })).toBeOnTheScreen();
  expect(await screen.findByText(/Loading rates|Rates are unavailable/)).toBeOnTheScreen();
});
