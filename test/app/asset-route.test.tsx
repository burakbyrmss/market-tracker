import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import AssetRoute from '@/app/asset/[id]';
import MarketsScreen from '@/app/index';
import { resetLivePrices } from '@/services/market-data/live-prices';

import { goLive } from '../market-fixtures';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const routes = { index: MarketsScreen, 'asset/[id]': AssetRoute };

afterEach(() => resetLivePrices());

test('tapping a coin opens its detail screen', async () => {
  goLive();
  await renderRouter(routes, { wrapper });

  await fireEvent.press(screen.getByTestId('crypto-row-ETH'));

  expect(screen).toHavePathname('/asset/ETH');
  expect(await screen.findByText('ETH/USDT price on Binance.')).toBeOnTheScreen();
});

test('a deep link with an invalid asset ID shows not found', async () => {
  goLive();
  await renderRouter(routes, { wrapper, initialUrl: '/asset/not-a-coin' });
  expect(screen.getByText('This asset does not exist.')).toBeOnTheScreen();
});

test('the detail screen has a titled header whose back button returns to the list', async () => {
  goLive();
  await renderRouter(routes, { wrapper });
  await fireEvent.press(screen.getByTestId('crypto-row-ETH'));

  expect(screen.getByRole('header', { name: 'ETH' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

  expect(screen).toHavePathname('/');
});

test('back from a deep-linked detail screen goes to the markets list', async () => {
  goLive();
  await renderRouter(routes, { wrapper, initialUrl: '/asset/BTC' });

  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

  expect(screen).toHavePathname('/');
  expect(screen.getByRole('header', { name: 'Markets' })).toBeOnTheScreen();
});
