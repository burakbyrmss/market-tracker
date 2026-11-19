# 0012: Keep the repository public and use synthetic test data

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The repository is public under the MIT license. Contract tests need recorded API responses. Committing real Binance or Kraken responses would publish their market data.

## Decision

- A recorder script in `scripts/` calls the live APIs, trims each response to a few entries, and replaces every price, volume, and timestamp with synthetic values. The response shape stays real.
- Commit only the recorder's output.
- Commit no secrets. Build secrets live in EAS.
- Add `SECURITY.md` at M1 with instructions for reporting a vulnerability.

## Consequences

- Tests check shape and behavior, not real market values.
- When a provider changes its response shape, running the recorder again updates the test data.
