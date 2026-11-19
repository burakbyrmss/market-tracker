# 0006: Do all money arithmetic in a decimal module

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Floating-point arithmetic gives wrong results for money, such as `0.1 + 0.2 !== 0.3`. V1 already calculates with money: the converter and the display currency conversion. V1.5 adds stored holdings and profit and loss.

## Decision

All arithmetic on money goes through `src/domain/money`, backed by a decimal library. The library is chosen at M3. Plain numbers are allowed only for chart plotting and for formatted display of a value that no code calculates with.

## Alternatives considered

- **Plain numbers in V1, decimals from V1.5.** That gives two rules, and V1 already converts money.
- **Integer minor units.** Crypto amounts need up to 18 decimal places, and each asset has a different scale. A decimal library handles this directly.

## Consequences

- One rule covers every version.
- The converter and the conversion rules are tested for decimal edge cases at M3 and M12.
- The decimal library adds a small dependency to `domain/`.
