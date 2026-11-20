import { fxRate, type FxRates } from './fx';
import type { CurrencyCode } from './ids';
import { decimal, toDecimalString } from './money';

const c = (code: string) => code as CurrencyCode;

// ECB-style rates: units per 1 EUR.
const ecb: FxRates = {
  base: c('EUR'),
  date: '2026-11-18',
  rates: new Map([
    [c('USD'), decimal('1.05')],
    [c('TRY'), decimal('36.75')],
  ]),
};

const rate = (from: string, to: string) => {
  const r = fxRate(ecb, c(from), c(to));
  return r && toDecimalString(r);
};

describe('fxRate', () => {
  test('reads a rate quoted against the base directly', () => {
    expect(rate('EUR', 'TRY')).toBe('36.75');
  });

  test('inverts a rate into the base', () => {
    // 1 / 36.75, rounded half up at 18 decimal places.
    expect(rate('TRY', 'EUR')).toBe('0.027210884353741497');
  });

  test('computes a cross rate between two non-base currencies', () => {
    // 36.75 / 1.05
    expect(rate('USD', 'TRY')).toBe('35');
  });

  test('returns 1 for the same currency', () => {
    expect(rate('GBP', 'GBP')).toBe('1');
  });

  test('returns null when either rate is missing', () => {
    expect(rate('USD', 'GBP')).toBeNull();
    expect(rate('GBP', 'USD')).toBeNull();
  });
});
