import type { CurrencyCode } from './ids';
import { div, ONE, type Decimal } from './money';

// Rates as published by the FX provider: units of each currency per one unit of `base`.
// ECB data has EUR as the base, so USD to TRY is a cross rate.
export type FxRates = {
  base: CurrencyCode;
  date: string;
  rates: ReadonlyMap<CurrencyCode, Decimal>;
};

// How many units of `to` one unit of `from` buys. Null when a rate is missing.
export function fxRate(fx: FxRates, from: CurrencyCode, to: CurrencyCode): Decimal | null {
  if (from === to) return ONE;
  const perBase = (code: CurrencyCode) => (code === fx.base ? ONE : fx.rates.get(code));
  const fromRate = perBase(from);
  const toRate = perBase(to);
  if (!fromRate || !toRate) return null;
  return div(toRate, fromRate);
}
