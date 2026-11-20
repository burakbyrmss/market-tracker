import { add, compare, decimal, div, mul, sub, toDecimalString } from './money';

const s = toDecimalString;

describe('money', () => {
  test('adds without floating-point error', () => {
    expect(s(add(decimal('0.1'), decimal('0.2')))).toBe('0.3');
  });

  test('keeps tiny crypto amounts exact when multiplying', () => {
    expect(s(mul(decimal('0.000000012345'), decimal('40000')))).toBe('0.0004938');
  });

  test('subtracts exactly', () => {
    expect(s(sub(decimal('1'), decimal('0.9')))).toBe('0.1');
  });

  test('divides to 18 decimal places, rounding half up', () => {
    const third = div(decimal(1), decimal(3));
    expect(third && s(third)).toBe('0.333333333333333333');
    const twoThirds = div(decimal(2), decimal(3));
    expect(twoThirds && s(twoThirds)).toBe('0.666666666666666667');
  });

  test('returns null when dividing by zero', () => {
    expect(div(decimal(1), decimal(0))).toBeNull();
  });

  test('compares values', () => {
    expect(compare(decimal('2.50'), decimal('2.5'))).toBe(0);
    expect(compare(decimal('1'), decimal('2'))).toBe(-1);
  });

  test('rejects input that is not a finite decimal', () => {
    expect(() => decimal('1e5')).toThrow(RangeError);
    expect(() => decimal('abc')).toThrow(RangeError);
    expect(() => decimal(Number.NaN)).toThrow(RangeError);
    expect(() => decimal(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
