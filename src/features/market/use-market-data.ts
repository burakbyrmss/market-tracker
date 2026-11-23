import { useEffect } from 'react';

import { useWatchlists } from '@/features/watchlist/store';
import { marketData } from '@/services/market-data';

// Starts live prices for the app's lifetime. The service closes the socket in the background.
// Watchlisted coins get live prices too, also outside the top of the market list.
export function useMarketData() {
  useEffect(() => {
    marketData.watch(useWatchlists.getState().crypto);
    const unsubscribe = useWatchlists.subscribe((state, previous) => {
      if (state.crypto !== previous.crypto) marketData.watch(state.crypto);
    });
    void marketData.start();
    return () => {
      unsubscribe();
      marketData.stop();
    };
  }, []);
}
