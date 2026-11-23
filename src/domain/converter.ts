import { cryptoPriceIn } from './conversion';
import { fxRate, type FxRates } from './fx';
import type { AssetId, CurrencyCode } from './ids';
import { decimal, div, mul, ONE, type Decimal } from './money';

export type Unit = { kind: 'crypto'; id: AssetId } | { kind: 'fiat'; code: CurrencyCode };

export type CryptoPrices = {
  // The provider's USD or USDT price. 1 USDT counts as 1 USD (docs/architecture/overview.md).
  usdPrice: Decimal | null;
  directPrices: ReadonlyMap<CurrencyCode, Decimal>;
};

export type ConversionInputs = {
  crypto: (id: AssetId) => CryptoPrices;
  fx: FxRates | null;
};

// How the result was made, so the screen can name its sources.
export type ConversionMethod = 'same' | 'ecb' | 'direct' | 'usd-fx' | 'usd' | 'cross';

export type Conversion =
  | {
      ok: true;
      amount: Decimal;
      // Units of `to` for one unit of `from`.
      rate: Decimal;
      method: ConversionMethod;
      // Set when an ECB rate took part.
      fxDate: string | null;
    }
  | { ok: false; reason: 'no-usd-price' | 'no-fx-rate' };

function sameUnit(a: Unit, b: Unit): boolean {
  return a.kind === 'crypto'
    ? b.kind === 'crypto' && a.id === b.id
    : b.kind === 'fiat' && a.code === b.code;
}

// A coin's price in a fiat currency, by the display-currency rule (cryptoPriceIn).
function coinPrice(prices: CryptoPrices, fx: FxRates | null, currency: CurrencyCode) {
  const price = cryptoPriceIn({ ...prices, fx }, currency);
  if (price.method === 'unavailable') return { ok: false as const, reason: price.reason };
  return {
    ok: true as const,
    price: price.price,
    method: price.method === 'fx' ? ('usd-fx' as const) : price.method,
    fxDate: price.method === 'fx' ? price.fxDate : null,
  };
}

// Multiplication and division run on the amount itself, never on a rounded rate, so a large
// amount does not multiply the rounding of 1 / price.
export function convert(
  amount: Decimal,
  from: Unit,
  to: Unit,
  inputs: ConversionInputs,
): Conversion {
  if (sameUnit(from, to)) return { ok: true, amount, rate: ONE, method: 'same', fxDate: null };

  if (from.kind === 'fiat' && to.kind === 'fiat') {
    const rate = inputs.fx ? fxRate(inputs.fx, from.code, to.code) : null;
    if (!rate || !inputs.fx) return { ok: false, reason: 'no-fx-rate' };
    return { ok: true, amount: mul(amount, rate), rate, method: 'ecb', fxDate: inputs.fx.date };
  }

  if (from.kind === 'crypto' && to.kind === 'fiat') {
    const price = coinPrice(inputs.crypto(from.id), inputs.fx, to.code);
    if (!price.ok) return price;
    return {
      ok: true,
      amount: mul(amount, price.price),
      rate: price.price,
      method: price.method,
      fxDate: price.fxDate,
    };
  }

  if (from.kind === 'fiat' && to.kind === 'crypto') {
    const price = coinPrice(inputs.crypto(to.id), inputs.fx, from.code);
    if (!price.ok) return price;
    const result = div(amount, price.price);
    const rate = div(ONE, price.price);
    if (!result || !rate) return { ok: false, reason: 'no-usd-price' };
    return { ok: true, amount: result, rate, method: price.method, fxDate: price.fxDate };
  }

  // Crypto to crypto: both prices come from the same provider in the same quote, so the quote
  // cancels and no FX rate is involved.
  const fromUsd = from.kind === 'crypto' ? inputs.crypto(from.id).usdPrice : null;
  const toUsd = to.kind === 'crypto' ? inputs.crypto(to.id).usdPrice : null;
  if (!fromUsd || !toUsd) return { ok: false, reason: 'no-usd-price' };
  const result = div(mul(amount, fromUsd), toUsd);
  const rate = div(fromUsd, toUsd);
  if (!result || !rate) return { ok: false, reason: 'no-usd-price' };
  return { ok: true, amount: result, rate, method: 'cross', fxDate: null };
}

const AMOUNT = /^(\d{0,15})(?:[.,](\d{0,18}))?$/;

// What a person types. One "." or "," is the decimal separator, since decimal keypads show
// either by locale. Grouping is not accepted: "1.234,5" has two separators and is rejected
// rather than guessed at. Empty input is 'empty', not an error.
export function parseAmount(text: string): Decimal | 'empty' | null {
  const trimmed = text.trim();
  if (trimmed === '') return 'empty';
  const match = AMOUNT.exec(trimmed);
  if (!match) return null;
  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  if (whole === '' && fraction === '') return null;
  return decimal(`${whole || '0'}${fraction ? `.${fraction}` : ''}`);
}
