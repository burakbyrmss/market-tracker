import { act, renderHook } from '@testing-library/react-native';

import type { AssetId } from '@/domain/ids';
import { useMarketData } from '@/features/market/use-market-data';
import { EMPTY_WATCHLISTS, useWatchlists } from '@/features/watchlist/store';
import { marketData } from '@/services/market-data';
import { storage } from '@/shared/storage';

afterEach(() => {
  jest.restoreAllMocks();
  useWatchlists.setState(EMPTY_WATCHLISTS);
  storage.clearAll();
});

test('watched coins get live prices, including ones added later', async () => {
  jest.spyOn(marketData, 'start').mockResolvedValue();
  jest.spyOn(marketData, 'stop').mockReturnValue();
  const watch = jest.spyOn(marketData, 'watch').mockReturnValue();
  useWatchlists.setState({ crypto: ['SOL' as AssetId] });

  const hook = await renderHook(() => useMarketData());
  expect(watch).toHaveBeenLastCalledWith(['SOL']);

  await act(() => useWatchlists.getState().toggleCrypto('PEPE' as AssetId));
  expect(watch).toHaveBeenLastCalledWith(['SOL', 'PEPE']);

  await hook.unmount();
  expect(marketData.stop).toHaveBeenCalled();
});
