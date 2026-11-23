import {
  convert,
  parseAmount,
  type ConversionInputs,
  type CryptoPrices,
  type Unit,
} from './converter';
import type { FxRates } from './fx';
import type { AssetId, CurrencyCode } from './ids';
import { decimal, toDecimalString, type Decimal } from './money';

const c = (code: string) => code as CurrencyCode;
const coin = (id: string): Unit => ({ kind: 'crypto', id: id as AssetId });
const fiat = (code: string): Unit => ({ kind: 'fiat', code: c(code) });

// Per euro. USD to TRY is 44 / 1.1 = 40.
const fx: FxRates = {
  base: c('EUR'),
  date: '2023-11-14',
  rates: new Map([
    [c('USD'), decimal('1.1')],
    [c('TRY'), decimal('44')],
  ]),
};

const prices: Record<string, CryptoPrices> = {
  BTC: { usdPrice: decimal('50000'), directPrices: new Map([[c('EUR'), decimal('46000')]]) },
  ETH: { usdPrice: decimal('2500'), directPrices: new Map() },
  THIRD: { usdPrice: decimal('3'), directPrices: new Map() },
};

const inputs: ConversionInputs = {
  crypto: (id) => prices[id] ?? { usdPrice: null, directPrices: new Map() },
  fx,
};

function run(amount: string, from: Unit, to: Unit, given: ConversionInputs = inputs) {
  const result = convert(decimal(amount), from, to, given);
  return result.ok
    ? {
        amount: toDecimalString(result.amount),
        rate: toDecimalString(result.rate),
        method: result.method,
      }
    : result;
}

describe('convert', () => {
  test('fiat to fiat uses the ECB cross rate', () => {
    expect(run('2.5', fiat('USD'), fiat('TRY'))).toEqual({
      amount: '100',
      rate: '40',
      method: 'ecb',
    });
  });

  test('crypto to fiat uses the direct pair when there is one', () => {
    expect(run('2', coin('BTC'), fiat('EUR'))).toMatchObject({ amount: '92000', method: 'direct' });
  });

  test('crypto to fiat otherwise uses the USD price times the ECB rate', () => {
    expect(run('2', coin('ETH'), fiat('TRY'))).toMatchObject({
      amount: '200000',
      method: 'usd-fx',
    });
    expect(run('2', coin('ETH'), fiat('USD'))).toMatchObject({ amount: '5000', method: 'usd' });
  });

  test('fiat to crypto inverts the same rule', () => {
    expect(run('46000', fiat('EUR'), coin('BTC'))).toMatchObject({ amount: '1', method: 'direct' });
    expect(run('100000', fiat('TRY'), coin('ETH'))).toMatchObject({ amount: '1' });
  });

  test('crypto to crypto crosses the two USD prices without an FX rate', () => {
    expect(run('3', coin('ETH'), coin('BTC'), { ...inputs, fx: null })).toEqual({
      amount: '0.15',
      rate: '0.05',
      method: 'cross',
    });
  });

  test('the same unit returns the amount unchanged', () => {
    expect(run('1.5', coin('BTC'), coin('BTC'))).toEqual({
      amount: '1.5',
      rate: '1',
      method: 'same',
    });
  });

  test('says which input is missing', () => {
    expect(run('1', fiat('USD'), fiat('TRY'), { ...inputs, fx: null })).toEqual({
      ok: false,
      reason: 'no-fx-rate',
    });
    expect(run('1', coin('NOPE'), fiat('USD'))).toEqual({ ok: false, reason: 'no-usd-price' });
    expect(run('1', coin('BTC'), coin('NOPE'))).toEqual({ ok: false, reason: 'no-usd-price' });
  });
});

describe('decimal edge cases', () => {
  test('zero converts to zero', () => {
    expect(run('0', coin('BTC'), fiat('TRY'))).toMatchObject({ amount: '0' });
  });

  test('one satoshi stays exact', () => {
    expect(run('0.00000001', coin('BTC'), fiat('USD'))).toMatchObject({ amount: '0.0005' });
  });

  test('a large amount stays exact past the 15 digits a float holds', () => {
    expect(run('123456789012345.678', fiat('USD'), fiat('TRY'))).toMatchObject({
      amount: '4938271560493827.12',
    });
  });

  test('a non-terminating division keeps 18 decimal places, rounded half up', () => {
    expect(run('1', fiat('USD'), coin('THIRD'))).toMatchObject({ amount: '0.333333333333333333' });
    expect(run('2', fiat('USD'), coin('THIRD'))).toMatchObject({ amount: '0.666666666666666667' });
  });

  test('a large amount divides the amount itself, not a rounded rate', () => {
    // Multiplying by 1 / 3 rounded to 18 places would give 333333333333333.333: the rounding
    // error grows with the amount.
    expect(run('1000000000000000', fiat('USD'), coin('THIRD'))).toMatchObject({
      amount: '333333333333333.333333333333333333',
    });
  });

  test('0.1 + 0.2 style values have no float error', () => {
    expect(run('0.1', coin('ETH'), fiat('USD'))).toMatchObject({ amount: '250' });
    expect(run('0.3', fiat('USD'), fiat('TRY'))).toMatchObject({ amount: '12' });
  });
});

describe('parseAmount', () => {
  const parsed = (text: string) => {
    const value = parseAmount(text);
    return value === null || value === 'empty' ? value : toDecimalString(value as Decimal);
  };

  test('takes either decimal separator', () => {
    expect(parsed('1.5')).toBe('1.5');
    expect(parsed('1,5')).toBe('1.5');
    expect(parsed(' 2 ')).toBe('2');
    expect(parsed('.5')).toBe('0.5');
    expect(parsed('5.')).toBe('5');
    expect(parsed('0.000000000000000001')).toBe('0.000000000000000001');
  });

  test('empty is not an error', () => {
    expect(parsed('')).toBe('empty');
    expect(parsed('   ')).toBe('empty');
  });

  test('rejects what is not a plain amount', () => {
    for (const text of ['1.234,5', '1,000.5', '-1', '1e5', 'abc', '.', '1..2', '1 000']) {
      expect(parsed(text)).toBeNull();
    }
  });

  test('rejects more digits than the app keeps', () => {
    expect(parsed('1234567890123456')).toBeNull();
    expect(parsed('0.0000000000000000001')).toBeNull();
  });
});
