import { QueryClient } from '@tanstack/react-query';

import type { FxRates } from '@/domain/fx';
import type { CurrencyCode } from '@/domain/ids';
import type { PricePoint } from '@/domain/market';
import { decimal, toDecimalString } from '@/domain/money';
import { fxPersisted } from '@/services/fx';
import { cryptoPersisted } from '@/services/market-data';
import { MAX_SAVED_QUERIES, OFFLINE_MAX_AGE_MS, persistQueryCache } from '@/shared/query/persist';
import { storage } from '@/shared/storage';

const families = [...fxPersisted, ...cryptoPersisted];
const DAY = 24 * 60 * 60_000;
const NOW = 100 * DAY;

const fx: FxRates = {
  base: 'EUR' as CurrencyCode,
  date: '2026-11-20',
  rates: new Map([
    ['USD' as CurrencyCode, decimal('1.0512')],
    ['TRY' as CurrencyCode, decimal('44.123456789012345678')],
  ]),
};
const points: PricePoint[] = [
  { time: 1, price: 100.5 },
  { time: 2, price: 101 },
];

function startCache() {
  const client = new QueryClient();
  const stop = persistQueryCache(client, families, () => NOW);
  return { client, stop };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  storage.clearAll();
});

test('FX rates and charts survive a restart, exactly and with their fetch time', () => {
  const first = startCache();
  first.client.setQueryData(['fx', 'latest'], fx, { updatedAt: NOW - DAY });
  first.client.setQueryData(['crypto', 'history', 'binance', 'BTC', '1D'], points, {
    updatedAt: NOW - 1_000,
  });
  jest.advanceTimersByTime(5_000);
  first.stop();

  const { client } = startCache();
  const restored = client.getQueryData<FxRates>(['fx', 'latest'])!;
  expect(restored.base).toBe('EUR');
  expect(restored.date).toBe('2026-11-20');
  expect(toDecimalString(restored.rates.get('TRY' as CurrencyCode)!)).toBe('44.123456789012345678');
  expect(client.getQueryState(['fx', 'latest'])?.dataUpdatedAt).toBe(NOW - DAY);
  expect(client.getQueryData(['crypto', 'history', 'binance', 'BTC', '1D'])).toEqual(points);
});

test('queries outside the saved families are not stored', () => {
  const { client, stop } = startCache();
  client.setQueryData(['fx', 'latest'], fx);
  client.setQueryData(['something', 'else'], { secret: 1 });
  stop();
  expect(storage.getString('query-cache.v1')).not.toContain('something');
});

test('saved data older than the offline limit is dropped', () => {
  storage.set(
    'query-cache.v1',
    JSON.stringify([
      {
        key: ['fx', 'history', 'EUR', 'USD', '1M'],
        updatedAt: NOW - OFFLINE_MAX_AGE_MS - 1,
        data: points,
      },
      { key: ['fx', 'history', 'EUR', 'TRY', '1M'], updatedAt: NOW - DAY, data: points },
    ]),
  );
  const { client } = startCache();
  expect(client.getQueryData(['fx', 'history', 'EUR', 'USD', '1M'])).toBeUndefined();
  expect(client.getQueryData(['fx', 'history', 'EUR', 'TRY', '1M'])).toEqual(points);
});

test('an entry in the wrong shape is dropped and the others still load', () => {
  storage.set(
    'query-cache.v1',
    JSON.stringify([
      {
        key: ['fx', 'latest'],
        updatedAt: NOW,
        data: { base: 'EUR', date: 'x', rates: [['USD', '1e3']] },
      },
      { key: ['crypto', 'history', 'binance', 'ETH', '1W'], updatedAt: NOW, data: [{ time: 'a' }] },
      { key: ['crypto', 'history', 'binance', 'BTC', '1W'], updatedAt: NOW, data: points },
    ]),
  );
  const { client } = startCache();
  expect(client.getQueryData(['fx', 'latest'])).toBeUndefined();
  expect(client.getQueryData(['crypto', 'history', 'binance', 'ETH', '1W'])).toBeUndefined();
  expect(client.getQueryData(['crypto', 'history', 'binance', 'BTC', '1W'])).toEqual(points);
});

test('a damaged file loads nothing and does not throw', () => {
  storage.set('query-cache.v1', '{broken');
  const { client } = startCache();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
});

test('keeps only the most recent charts', () => {
  const { client, stop } = startCache();
  for (let index = 0; index < MAX_SAVED_QUERIES + 5; index += 1) {
    client.setQueryData(['crypto', 'history', 'binance', `C${index}`, '1D'], points, {
      updatedAt: NOW - DAY + index,
    });
  }
  stop();

  const saved = JSON.parse(storage.getString('query-cache.v1')!) as { key: string[] }[];
  expect(saved).toHaveLength(MAX_SAVED_QUERIES);
  expect(saved.map((entry) => entry.key[3])).not.toContain('C0');
  expect(saved.map((entry) => entry.key[3])).toContain(`C${MAX_SAVED_QUERIES + 4}`);
});

test('a burst of updates is written once, after a short wait', () => {
  const write = jest.spyOn(storage, 'set');
  const { client, stop } = startCache();
  client.setQueryData(['fx', 'latest'], fx);
  client.setQueryData(['fx', 'history', 'EUR', 'USD', '1M'], points);
  expect(write).not.toHaveBeenCalled();
  jest.advanceTimersByTime(5_000);
  expect(write).toHaveBeenCalledTimes(1);
  stop();
  write.mockRestore();
});

test('restored queries outlive the default five-minute garbage collection', () => {
  const first = startCache();
  first.client.setQueryData(['fx', 'latest'], fx, { updatedAt: NOW });
  first.stop();

  const { client } = startCache();
  jest.advanceTimersByTime(60 * 60_000);
  expect(client.getQueryData(['fx', 'latest'])).toBeDefined();
});
