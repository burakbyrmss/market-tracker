import { cryptoDisplayPrice, type CryptoPriceInputs, type DisplayPrice } from './conversion';
import type { FxRates } from './fx';
import type { CurrencyCode } from './ids';
import { decimal, toDecimalString } from './money';

const c = (code: string) => code as CurrencyCode;

const ecb: FxRates = {
  base: c('EUR'),
  date: '2026-11-18',
  rates: new Map([
    [c('USD'), decimal('1.05')],
    [c('TRY'), decimal('36.75')],
  ]),
};

const btc: CryptoPriceInputs = {
  usdPrice: decimal('50000'),
  directPrices: new Map([[c('EUR'), decimal('47000')]]),
  fx: ecb,
};

// Turns Decimals into strings so expectations compare plain values.
function plain(result: DisplayPrice) {
  return Object.fromEntries(
    Object.entries(result).map(([k, v]) => [k, typeof v === 'object' ? toDecimalString(v) : v]),
  );
}

describe('cryptoDisplayPrice', () => {
  test('shows the USD price as is when the display currency is USD', () => {
    expect(plain(cryptoDisplayPrice(btc, 'USD'))).toEqual({ method: 'usd', price: '50000' });
  });

  test('uses the direct fiat pair when the provider lists one', () => {
    expect(plain(cryptoDisplayPrice(btc, 'EUR'))).toEqual({
      method: 'direct',
      price: '47000',
      currency: 'EUR',
    });
  });

  test('multiplies the USD price by the FX rate when no direct pair exists', () => {
    // USD to TRY is 36.75 / 1.05 = 35, so 50000 * 35.
    expect(plain(cryptoDisplayPrice(btc, 'TRY'))).toEqual({
      method: 'fx',
      price: '1750000',
      usdPrice: '50000',
      rate: '35',
      fxDate: '2026-11-18',
    });
  });

  test('prefers the direct pair even when an FX path exists', () => {
    const withTry = { ...btc, directPrices: new Map([[c('TRY'), decimal('1760000')]]) };
    expect(plain(cryptoDisplayPrice(withTry, 'TRY'))).toEqual({
      method: 'direct',
      price: '1760000',
      currency: 'TRY',
    });
  });

  test('reports a missing FX rate', () => {
    expect(cryptoDisplayPrice({ ...btc, fx: null }, 'TRY')).toEqual({
      method: 'unavailable',
      reason: 'no-fx-rate',
    });
    const noTry: FxRates = { ...ecb, rates: new Map([[c('USD'), decimal('1.05')]]) };
    expect(cryptoDisplayPrice({ ...btc, fx: noTry }, 'TRY')).toEqual({
      method: 'unavailable',
      reason: 'no-fx-rate',
    });
  });

  test('reports a missing USD price', () => {
    const noUsd = { ...btc, usdPrice: null };
    expect(cryptoDisplayPrice(noUsd, 'USD')).toEqual({
      method: 'unavailable',
      reason: 'no-usd-price',
    });
    expect(cryptoDisplayPrice(noUsd, 'TRY')).toEqual({
      method: 'unavailable',
      reason: 'no-usd-price',
    });
  });
});
