import { useEffect } from 'react';

import { marketData } from '@/services/market-data';

// Starts live prices for the app's lifetime. The service closes the socket in the background.
export function useMarketData() {
  useEffect(() => {
    void marketData.start();
    return () => marketData.stop();
  }, []);
}
