# 0005: Use Frankfurter with the ECB source for FX

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Free FX data is not real time. Frankfurter needs no key and serves ECB reference rates once per business day (confirmed). ECB data includes TRY, with history back to 1999 (inferred). Several other free FX tiers forbid commercial use (inferred).

## Decision

Use Frankfurter with the ECB source only. Show each FX rate with its ECB date and credit the ECB as the source. Do not build a provider interface for FX until a second FX provider exists. FX data still flows through the domain types, so a second provider can plug in later.

## Alternatives considered

- **Frankfurter blended rates.** They mix many central banks. The ECB source is one clear, citable source.
- **ExchangeRate-API or Open Exchange Rates.** Both need keys, and their commercial terms conflict across sources.
- **Fixer, currencylayer, or ExchangeRatesAPI.io.** Their free plans are non-commercial (inferred).

## Consequences

- FX rates are daily. The UI must never style them as live.
- Weekend and holiday values repeat the last business day.
- The ECB data terms are still open. See [Risks](../risks.md).

## Sources

- [Frankfurter](https://frankfurter.dev/)
- [Frankfurter ECB provider](https://frankfurter.dev/providers/ecb/)
- [ECB disclaimer](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html)
- [Free currency API comparison](https://allratestoday.com/blog/best-free-currency-exchange-api-2026/)
