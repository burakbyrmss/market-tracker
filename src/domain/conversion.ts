import { fxRate, type FxRates } from './fx';
import { displayCurrencyCode, type CurrencyCode, type DisplayCurrency } from './ids';
import { mul, type Decimal } from './money';

const USD = 'USD' as CurrencyCode;

export type CryptoPriceInputs = {
  // The provider's USD or USDT price. The app treats 1 USDT as 1 USD (docs/architecture/overview.md).
  usdPrice: Decimal | null;
  // Prices from direct fiat pairs on the active provider, such as BTCEUR.
  directPrices: ReadonlyMap<CurrencyCode, Decimal>;
  fx: FxRates | null;
};

// Each method carries the inputs it used, so the detail screen can show where a price came from.
export type DisplayPrice =
  | { method: 'usd'; price: Decimal }
  | { method: 'direct'; price: Decimal; currency: CurrencyCode }
  | { method: 'fx'; price: Decimal; usdPrice: Decimal; rate: Decimal; fxDate: string }
  | { method: 'unavailable'; reason: 'no-usd-price' | 'no-fx-rate' };

// Rule from docs/product/requirements.md: use the provider's direct fiat pair when it exists,
// otherwise multiply the USD price by the FX rate.
export function cryptoDisplayPrice(
  inputs: CryptoPriceInputs,
  display: DisplayCurrency,
): DisplayPrice {
  const target = displayCurrencyCode(display);

  if (target === USD) {
    return inputs.usdPrice
      ? { method: 'usd', price: inputs.usdPrice }
      : { method: 'unavailable', reason: 'no-usd-price' };
  }

  const direct = inputs.directPrices.get(target);
  if (direct) return { method: 'direct', price: direct, currency: target };

  if (!inputs.usdPrice) return { method: 'unavailable', reason: 'no-usd-price' };
  const rate = inputs.fx ? fxRate(inputs.fx, USD, target) : null;
  if (!rate || !inputs.fx) return { method: 'unavailable', reason: 'no-fx-rate' };

  return {
    method: 'fx',
    price: mul(inputs.usdPrice, rate),
    usdPrice: inputs.usdPrice,
    rate,
    fxDate: inputs.fx.date,
  };
}
