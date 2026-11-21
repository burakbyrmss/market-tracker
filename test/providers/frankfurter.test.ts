import type { CurrencyCode } from '@/domain/ids';
import { toDecimalString } from '@/domain/money';
import { createFrankfurterProvider } from '@/providers/frankfurter';
import { ProviderDataError, ProviderHttpError } from '@/providers/http';

import history from '../fixtures/frankfurter/history.json';
import latest from '../fixtures/frankfurter/latest.json';
import values from '../fixtures/synthetic-values.json';
import { fakeFetch, type Route } from './fake-fetch';

const c = (code: string) => code as CurrencyCode;
const NOW = Date.parse('2024-01-10T12:00:00Z');

function make(routes: Record<string, Route> = {}) {
  const fake = fakeFetch({
    'quotes=': { body: history },
    '/rates?base=EUR': { body: latest },
    ...routes,
  });
  return { provider: createFrankfurterProvider({ fetch: fake.fetch, now: () => NOW }), fake };
}

describe('Frankfurter adapter', () => {
  test('latest returns ECB rates per euro, with their date', async () => {
    const { provider } = make();
    const fx = await provider.latest();
    expect(fx.base).toBe('EUR');
    expect(fx.date).toBe(values.fx.date);
    const usd = fx.rates.get(c('USD'));
    expect(usd && toDecimalString(usd)).toBe(values.fx.rates.USD);
    expect([...fx.rates.keys()].sort()).toEqual(['GBP', 'JPY', 'TRY', 'USD']);
  });

  test('latest asks for the ECB dataset, not the blended rates', async () => {
    const { provider, fake } = make();
    await provider.latest();
    expect(fake.calls[0]).toContain('/v2/providers/ECB/rates');
  });

  test('history returns daily rates oldest first', async () => {
    const { provider } = make();
    const points = await provider.history(c('EUR'), c('USD'), '1M');
    expect(points.map((p) => p.price)).toEqual(values.fx.historyUsd.map(Number));
    expect(points[0]?.time).toBe(Date.parse(`${values.fx.historyDates[0]}T00:00:00Z`));
  });

  test('history keeps one point per date when the provider repeats one', async () => {
    const repeated = [...history, history[history.length - 1]];
    const { provider } = make({ 'quotes=': { body: repeated } });
    const points = await provider.history(c('EUR'), c('USD'), '5Y');
    expect(points).toHaveLength(history.length);
  });

  test('history asks for the range start and groups five years by week', async () => {
    const { provider, fake } = make();
    await provider.history(c('USD'), c('TRY'), '1M');
    await provider.history(c('USD'), c('TRY'), '5Y');
    const [month, fiveYears] = fake.calls.map((u) => new URL(u).searchParams);
    expect(month?.get('base')).toBe('USD');
    expect(month?.get('quotes')).toBe('TRY');
    expect(month?.get('from')).toBe('2023-12-10');
    expect(month?.has('group')).toBe(false);
    expect(fiveYears?.get('group')).toBe('week');
  });

  test('reports the HTTP status of a refused request', async () => {
    const { provider } = make({ '/rates?base=EUR': { body: {}, status: 503 } });
    const error = await provider.latest().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderHttpError);
    expect((error as ProviderHttpError).status).toBe(503);
  });

  test('rejects an empty or malformed answer', async () => {
    await expect(
      make({ '/rates?base=EUR': { body: [] } }).provider.latest(),
    ).rejects.toBeInstanceOf(ProviderDataError);
    await expect(
      make({ '/rates?base=EUR': { body: { rates: {} } } }).provider.latest(),
    ).rejects.toBeInstanceOf(ProviderDataError);
  });
});
