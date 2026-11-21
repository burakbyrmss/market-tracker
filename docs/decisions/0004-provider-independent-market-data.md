# 0004: Use a provider-independent market data layer with Binance and Kraken

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The app must serve international users, including users in the Netherlands and the US. Binance restricts some locations, and the Netherlands is on its list (inferred). Some US users get HTTP 451 even on public endpoints (inferred).

A backend-free app calls providers directly from each device. A provider that needs an API key shares one quota across all devices, and anyone can extract the key from the app. A keyless provider limits by IP, so each device has its own limit.

## Decision

- Define one crypto provider contract. It is described in [Market data providers](../architecture/providers.md).
- Build two adapters: Binance is primary and Kraken is the fallback. Both are keyless and have public WebSockets.
- At startup, the market-data service checks Binance by fetching its snapshot. On any failure, including HTTP 451 and network errors, it selects Kraken and stores the choice. (Amended at M6: a provider that cannot return a snapshot cannot serve the session, whatever the reason.)
- One provider serves the whole session. Prices never mix sources on one screen.
- The UI always shows the active source.
- Asset IDs belong to the app, such as `BTC`. Adapters map provider symbols to them.
- Build the Kraken adapter right after the Binance adapter (M5), so the contract does not take on Binance's shape.
- A watchlisted coin that the active provider does not list shows "Unavailable from <provider>" and stays in the list.

## Alternatives considered

- **Binance only.** It fails for users in restricted locations.
- **Coinbase as fallback.** Its terms forbid this use.
- **Aggregators with free keyed tiers, such as CoinGecko, CoinMarketCap, CoinCap, or CoinPaprika.** A shared quota and an exposed key break at public scale. Their free licenses are personal or unclear.
- **Mixing providers per asset.** Prices would jump between sources and disagree on one screen.

## Consequences

- Coin coverage depends on the active provider. Kraken lists fewer coins than Binance.
- The top-100 ranking follows the active provider's volume.
- A third adapter, such as a paid aggregator, plugs in without screen changes.
- Licensing for display remains open. See [ADR 0007](0007-data-licensing-release-gate.md).

## Sources

- [Binance market data only URLs](https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only)
- [Binance HTTP 451 forum report](https://dev.binance.vision/t/api-error-451-unavailable-for-legal-reasons/13828)
- [Datawallet: Binance restricted countries](https://www.datawallet.com/crypto/binance-restricted-countries)
- [Kraken WebSocket v2](https://docs.kraken.com/websockets-v2)
- [Coinbase Market Data Terms](https://www.coinbase.com/legal/market_data)
