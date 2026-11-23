import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import type { FxRates } from '@/domain/fx';
import type { CurrencyCode } from '@/domain/ids';
import type { FxRange } from '@/domain/market';
import { toDecimalString } from '@/domain/money';
import { createFrankfurterProvider } from '@/providers/frankfurter';
import { OFFLINE_MAX_AGE_MS, persisted } from '@/shared/query/persist';
import { storedCurrencyCode, storedDecimal, storedPricePoints } from '@/shared/storage/schemas';

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
      gcTime: OFFLINE_MAX_AGE_MS,
    }),
  history: (base: CurrencyCode, quote: CurrencyCode, range: FxRange) =>
    queryOptions({
      queryKey: ['fx', 'history', base, quote, range],
      queryFn: ({ signal }) => fxProvider.history(base, quote, range, signal),
      staleTime: 12 * HOUR,
      gcTime: OFFLINE_MAX_AGE_MS,
    }),
};

const storedFxRates = z
  .object({
    base: storedCurrencyCode,
    date: z.string(),
    rates: z.array(z.tuple([storedCurrencyCode, storedDecimal])),
  })
  .transform((stored): FxRates => ({ ...stored, rates: new Map(stored.rates) }));

// Saved on the device, so FX rates and charts show offline with their ECB date.
export const fxPersisted = [
  persisted({
    key: ['fx', 'latest'],
    schema: storedFxRates,
    toStored: (fx: FxRates) => ({
      base: fx.base,
      date: fx.date,
      rates: [...fx.rates].map(([code, rate]) => [code, toDecimalString(rate)]),
    }),
  }),
  persisted({ key: ['fx', 'history'], schema: storedPricePoints, toStored: (points) => points }),
];
