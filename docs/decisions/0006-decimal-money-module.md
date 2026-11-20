# 0006: Do all money arithmetic in a decimal module

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Floating-point arithmetic gives wrong results for money, such as `0.1 + 0.2 !== 0.3`. V1 already calculates with money: the converter and the display currency conversion. V1.5 adds stored holdings and profit and loss.

## Decision

All arithmetic on money goes through `src/domain/money.ts`. Plain numbers are allowed only for chart plotting and for formatted display of a value that no code calculates with.

At M3 (2026-11-20) the library became **big.js 7**:

- `Decimal` is an opaque type. Only `money.ts` can do arithmetic on it, through `add`, `sub`, `mul`, `div`, and `compare`.
- Division keeps 18 decimal places and rounds half up. `div` returns `null` for division by zero.
- `decimal()` accepts only plain decimal strings and finite numbers. Exponent notation such as `1e5` is rejected.
- `toDisplayNumber` is the only exit to a JavaScript number. It is lossy and used only for formatting and charts.
- An ESLint rule rejects any import of `big.js` outside `src/domain/money.ts`.

## Alternatives considered

- **Plain numbers in V1, decimals from V1.5.** That gives two rules, and V1 already converts money.
- **decimal.js.** It has more features than V1 needs, and its package is about five times larger than big.js (unpacked size on npm).
- **Integer minor units.** Crypto amounts need up to 18 decimal places, and each asset has a different scale. A decimal library handles this directly.

## Consequences

- One rule covers every version.
- The converter and the conversion rules are tested for decimal edge cases at M3 and M12.
- The decimal library adds a small dependency to `domain/`.
