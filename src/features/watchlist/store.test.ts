import type { AssetId, CurrencyCode } from '@/domain/ids';
import { storage } from '@/shared/storage';

import { EMPTY_WATCHLISTS, useWatchlists } from './store';

const a = (id: string) => id as AssetId;
const c = (code: string) => code as CurrencyCode;
const stored = () =>
  (JSON.parse(storage.getString('watchlists') ?? 'null') as { state: unknown } | null)?.state;

afterEach(() => {
  useWatchlists.setState(EMPTY_WATCHLISTS);
  storage.clearAll();
});

test('adding twice removes, and the lists are saved on the device', () => {
  const { toggleCrypto, toggleFx } = useWatchlists.getState();
  toggleCrypto(a('BTC'));
  toggleCrypto(a('ETH'));
  toggleFx(c('TRY'));
  toggleCrypto(a('BTC'));

  expect(useWatchlists.getState().crypto).toEqual(['ETH']);
  expect(stored()).toEqual({ crypto: ['ETH'], fx: ['TRY'] });
});

test('moves an item and ignores moves past either end', () => {
  useWatchlists.setState({ crypto: [a('BTC'), a('ETH'), a('SOL')] });
  const { move } = useWatchlists.getState();

  move('crypto', 2, 0);
  expect(useWatchlists.getState().crypto).toEqual(['SOL', 'BTC', 'ETH']);
  move('crypto', 0, -1);
  move('crypto', 2, 3);
  expect(useWatchlists.getState().crypto).toEqual(['SOL', 'BTC', 'ETH']);
});

test('loading keeps valid, unique IDs and drops the rest', async () => {
  storage.set(
    'watchlists',
    JSON.stringify({
      state: { crypto: ['BTC', 'btc', 42, 'BTC', 'ETH'], fx: 'not a list' },
      version: 1,
    }),
  );
  await useWatchlists.persist.rehydrate();

  expect(useWatchlists.getState().crypto).toEqual(['BTC', 'ETH']);
  expect(useWatchlists.getState().fx).toEqual([]);
});
