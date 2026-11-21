import { queryOptions } from '@tanstack/react-query';

import type { CurrencyCode } from '@/domain/ids';
import type { FxRange } from '@/domain/market';
import { createFrankfurterProvider } from '@/providers/frankfurter';

const fxProvider = createFrankfurterProvider();

export const FX_SOURCE_NAME = fxProvider.name;

const HOUR = 60 * 60_000;

// The ECB publishes once per business day, around 16:00 CET. An hour of freshness catches the
// new rates the same afternoon without refetching on every screen visit.
export const fxQueries = {
  latest: () =>
    queryOptions({
      queryKey: ['fx', 'latest'],
      queryFn: ({ signal }) => fxProvider.latest(signal),
      staleTime: HOUR,
      gcTime: 24 * HOUR,
    }),
  history: (base: CurrencyCode, quote: CurrencyCode, range: FxRange) =>
    queryOptions({
      queryKey: ['fx', 'history', base, quote, range],
      queryFn: ({ signal }) => fxProvider.history(base, quote, range, signal),
      staleTime: 12 * HOUR,
      gcTime: 24 * HOUR,
    }),
};
