# 0007: Gate the store release on data licensing

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Keyless exchange APIs are free and work without a backend. Their terms for display in a public third-party app are restrictive or unclear:

- Coinbase forbids it (confirmed).
- Kraken reportedly requires prior authorization for non-personal commercial use, with contact `marketdata@kraken.com` (inferred, secondhand).
- Binance terms are ambiguous for this use (not settled).

For a public, backend-free app, no option is free, backend-free, and clearly licensed at once.

| Option                                          | Free                            | No backend                          | Licensed                                     |
| ----------------------------------------------- | ------------------------------- | ----------------------------------- | -------------------------------------------- |
| A. Keyless exchange APIs (Binance and Kraken)   | Yes                             | Yes                                 | Unclear                                      |
| B. Free aggregator tier with an API key         | Yes                             | Yes                                 | Unclear, and the shared quota fails at scale |
| C. Paid aggregator behind a small caching proxy | No, about $35 per month or more | No. The proxy is a stateless cache. | Yes                                          |

## Decision

- Use Option A during development.
- Send licensing requests to Kraken and Binance at M1.
- Before the V1 store release (M16), either hold written permission from at least one provider, or switch to Option C.
- Record the outcome in this ADR.

## Alternatives considered

- **Option C from the start.** It costs money and adds a proxy before the product is proven. Option A keeps it available as one more adapter.
- **Option B.** One key and one quota for every user fail at public scale.

## Consequences

- The release has a hard dependency on a reply from a third party. Send the requests early.
- Option C would add a Cloudflare Worker or similar. That is the only change to the "no backend" rule for V1.

## Outcome

Pending. Record the reply from each provider here with the date.

## Sources

- [Coinbase Market Data Terms](https://www.coinbase.com/legal/market_data)
- [GitHub issue quoting Kraken API notices](https://github.com/leandrosilveiradepaula/crypto-intelligence-agent/issues/48)
- [Exchange API terms guide](https://cryptomarkets.tools/guides/exchange-api-terms)
- [Binance public API commercial use thread](https://dev.binance.vision/t/public-rest-api-for-commercial-use-case/23067)
- [CoinGecko pricing](https://www.coingecko.com/en/api/pricing)
