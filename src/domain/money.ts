import { Big } from 'big.js';

// The only module that imports big.js (ADR 0006). Decimal is opaque, so code outside this
// module cannot do arithmetic on money except through the functions below.
declare const decimalBrand: unique symbol;
export type Decimal = { readonly [decimalBrand]: true };

// A private constructor keeps our precision settings off the global Big.
const D = Big();
// Division keeps 18 decimal places, enough for the smallest crypto units.
D.DP = 18;
D.RM = Big.roundHalfUp;

const DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

function wrap(value: Big): Decimal {
  return value as unknown as Decimal;
}

function unwrap(value: Decimal): Big {
  return value as unknown as Big;
}

export function isDecimalString(raw: string): boolean {
  return DECIMAL_STRING.test(raw);
}

// Throws on input that is not a finite decimal. Validate external data at the boundary first.
export function decimal(value: string | number): Decimal {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new RangeError(`Not a finite number: ${value}`);
  }
  if (typeof value === 'string' && !isDecimalString(value)) {
    throw new RangeError(`Not a decimal string: ${value}`);
  }
  return wrap(new D(value));
}

export const ZERO = decimal(0);
export const ONE = decimal(1);

export function add(a: Decimal, b: Decimal): Decimal {
  return wrap(unwrap(a).plus(unwrap(b)));
}

export function sub(a: Decimal, b: Decimal): Decimal {
  return wrap(unwrap(a).minus(unwrap(b)));
}

export function mul(a: Decimal, b: Decimal): Decimal {
  return wrap(unwrap(a).times(unwrap(b)));
}

// Returns null for division by zero instead of throwing.
export function div(a: Decimal, b: Decimal): Decimal | null {
  if (unwrap(b).eq(0)) return null;
  return wrap(unwrap(a).div(unwrap(b)));
}

export function compare(a: Decimal, b: Decimal): -1 | 0 | 1 {
  return unwrap(a).cmp(unwrap(b));
}

export function isPositive(value: Decimal): boolean {
  return unwrap(value).gt(0);
}

// Exact decimal text, for storage and tests.
export function toDecimalString(value: Decimal): string {
  return unwrap(value).toFixed();
}

// Lossy. Only for formatting and chart plotting, never for further arithmetic.
export function toDisplayNumber(value: Decimal): number {
  return unwrap(value).toNumber();
}
