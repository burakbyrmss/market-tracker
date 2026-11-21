import { useMemo } from 'react';

import { cryptoDisplayPrice, type DisplayPrice } from '@/domain/conversion';
import type { FxRates } from '@/domain/fx';
import { displayCurrencyCode, type AssetId, type DisplayCurrency } from '@/domain/ids';
import { useDirectPrices, useLiveQuote, type LiveQuote } from '@/services/market-data';
import { formatPrice } from '@/shared/format';

export type AssetPrice = { quote: LiveQuote | undefined; display: DisplayPrice };

// One coin's price in the display currency. Reads only that coin's live data, so a tick on
// another coin does not re-render the caller.
export function useDisplayPrice(
  assetId: AssetId,
  currency: DisplayCurrency,
  fx: FxRates | null,
): AssetPrice {
  const quote = useLiveQuote(assetId);
  const directPrices = useDirectPrices(assetId);
  const usdPrice = quote?.price ?? null;
  const display = useMemo(
    () => cryptoDisplayPrice({ usdPrice, directPrices, fx }, currency),
    [usdPrice, directPrices, fx, currency],
  );
  return { quote, display };
}

// Null when the price cannot be made in the display currency yet, such as before FX rates load.
export function formatDisplayPrice(
  price: DisplayPrice,
  currency: DisplayCurrency,
  locale: string,
): string | null {
  if (price.method === 'unavailable') return null;
  return formatPrice(price.price, displayCurrencyCode(currency), locale);
}
