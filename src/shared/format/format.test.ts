import type { CurrencyCode } from '@/domain/ids';
import { decimal } from '@/domain/money';

import { formatFxRate, formatPercentChange, formatPrice } from './index';

const c = (code: string) => code as CurrencyCode;
// Intl may use a no-break space between number and symbol. Normalize it so expectations stay readable.
const norm = (text: string) => text.replace(/[  ]/g, ' ');

describe('formatPrice', () => {
  test('formats US dollars in English', () => {
    expect(norm(formatPrice(decimal('64321.5'), c('USD'), 'en-US'))).toBe('$64,321.50');
  });

  test('formats lira in Turkish with Turkish separators', () => {
    expect(norm(formatPrice(decimal('2251252.5'), c('TRY'), 'tr-TR'))).toBe('₺2.251.252,50');
  });

  test('formats euros in Turkish', () => {
    expect(norm(formatPrice(decimal('1234.5'), c('EUR'), 'tr-TR'))).toBe('€1.234,50');
  });

  test('keeps four significant digits for prices below 1', () => {
    expect(norm(formatPrice(decimal('0.00001234567'), c('USD'), 'en-US'))).toBe('$0.00001235');
    expect(norm(formatPrice(decimal('0.5'), c('USD'), 'en-US'))).toBe('$0.50');
  });
});

describe('formatPercentChange', () => {
  test('signs gains and losses', () => {
    expect(norm(formatPercentChange(2.5, 'en-US'))).toBe('+2.50%');
    expect(norm(formatPercentChange(-1.234, 'en-US'))).toBe('-1.23%');
  });

  test('puts the percent sign first in Turkish', () => {
    expect(norm(formatPercentChange(2.5, 'tr-TR'))).toBe('+%2,50');
  });

  test('shows no sign for zero', () => {
    expect(norm(formatPercentChange(0, 'en-US'))).toBe('0.00%');
  });
});

describe('formatFxRate', () => {
  test('shows four decimals', () => {
    expect(norm(formatFxRate(decimal('35'), 'tr-TR'))).toBe('35,0000');
    expect(norm(formatFxRate(decimal('0.0272108'), 'en-US'))).toBe('0.0272');
  });
});
