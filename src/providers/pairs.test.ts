import { buildPairTable, cachedPairTable, type PairTable } from './pairs';

describe('buildPairTable', () => {
  test('does not list a coin that only has a fiat pair', () => {
    const table = buildPairTable(
      [
        { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' },
        { symbol: 'AAAEUR', base: 'AAA', quote: 'EUR' },
      ],
      'USDT',
    );
    expect(table.assets.map((a) => a.id)).toEqual(['BTC']);
    expect(table.bySymbol.has('AAAEUR')).toBe(false);
  });

  test('skips symbols that are not valid asset IDs', () => {
    const table = buildPairTable([{ symbol: 'AAPLxUSD', base: 'AAPLx', quote: 'USD' }], 'USD');
    expect(table.assets).toEqual([]);
  });
});

describe('cachedPairTable', () => {
  const empty: PairTable = { assets: [], usdSymbol: new Map(), bySymbol: new Map() };

  test('retries after a failed load instead of caching the failure', async () => {
    const load = jest
      .fn<Promise<PairTable>, []>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(empty);
    const table = cachedPairTable(load, () => 0);

    await expect(table()).rejects.toThrow('offline');
    await expect(table()).resolves.toBe(empty);
  });

  test('reloads after a day', async () => {
    let now = 0;
    const load = jest.fn(async () => empty);
    const table = cachedPairTable(load, () => now);

    await table();
    now = 60_000;
    await table();
    expect(load).toHaveBeenCalledTimes(1);
    now = 24 * 60 * 60_000 + 1;
    await table();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
