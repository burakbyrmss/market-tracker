import { z } from 'zod';

import type { FxRates } from '@/domain/fx';
import { parseCurrencyCode, type CurrencyCode } from '@/domain/ids';
import type { FxRange, PricePoint } from '@/domain/market';
import { decimal, type Decimal } from '@/domain/money';

import type { ProviderOptions } from '../contract';
import { getJson, ProviderDataError } from '../http';

// v2 with the ECB dataset named explicitly. The default v2 rates blend many central banks; we
// use ECB only (ADR 0005, docs/architecture/providers.md).
const BASE = 'https://api.frankfurter.dev/v2/providers/ECB';
const ECB_BASE = 'EUR';

// No shared FX interface until a second FX provider exists (ADR 0005).
export type FrankfurterProvider = {
  // Shown in the UI as the data source.
  readonly name: string;
  // The latest published rates. The ECB publishes once per business day.
  latest(signal?: AbortSignal): Promise<FxRates>;
  // Daily (weekly for 5Y) rates of `quote` per one `base`, oldest first.
  history(
    base: CurrencyCode,
    quote: CurrencyCode,
    range: FxRange,
    signal?: AbortSignal,
  ): Promise<PricePoint[]>;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 24 * 60 * 60_000;

// Rates arrive as JSON numbers. ECB publishes at most 6 significant digits, which a number
// carries exactly to its decimal text.
const rateSchema = z.object({
  date: z.string().regex(DATE),
  base: z.string(),
  quote: z.string(),
  rate: z.number().positive(),
});
const ratesSchema = z.array(rateSchema);

// Days back and downsampling per range. Five years of daily rates is about 1,300 points, more
// than a phone chart can show, so it is grouped by week.
const RANGES: Record<FxRange, { days: number; group: 'week' | null }> = {
  '1M': { days: 31, group: null },
  '1Y': { days: 366, group: null },
  '5Y': { days: 5 * 366, group: 'week' },
};

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function createFrankfurterProvider(options: ProviderOptions = {}): FrankfurterProvider {
  const fetchFn = options.fetch ?? fetch;
  const now = options.now ?? Date.now;

  return {
    name: 'ECB via Frankfurter',

    async latest(signal) {
      const rows = await getJson(fetchFn, `${BASE}/rates?base=${ECB_BASE}`, ratesSchema, signal);
      const base = parseCurrencyCode(ECB_BASE) as CurrencyCode;
      const rates = new Map<CurrencyCode, Decimal>();
      let date: string | null = null;
      for (const row of rows) {
        const quote = parseCurrencyCode(row.quote);
        if (row.base !== ECB_BASE || !quote || quote === base) continue;
        rates.set(quote, decimal(row.rate));
        // The newest date wins. All rows share it on a normal day.
        if (date === null || row.date > date) date = row.date;
      }
      if (rates.size === 0 || date === null) {
        throw new ProviderDataError('Frankfurter returned no ECB rates');
      }
      return { base, date, rates } satisfies FxRates;
    },

    async history(base, quote, range, signal) {
      const { days, group } = RANGES[range];
      const params = new URLSearchParams({
        base,
        quotes: quote,
        from: isoDate(now() - days * DAY),
      });
      if (group) params.set('group', group);
      const rows = await getJson(fetchFn, `${BASE}/rates?${params}`, ratesSchema, signal);
      // Grouped (weekly) data sometimes repeats a date. A chart needs one point per time.
      const byTime = new Map<number, number>();
      for (const row of rows) {
        if (row.quote === quote) byTime.set(Date.parse(`${row.date}T00:00:00Z`), row.rate);
      }
      return [...byTime]
        .map(([time, price]): PricePoint => ({ time, price }))
        .sort((a, b) => a.time - b.time);
    },
  };
}
