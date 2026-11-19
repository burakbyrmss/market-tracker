# Market data providers

This reference lists each external data provider, the contract every crypto adapter implements, and the facts behind each choice. Each fact carries a label.

- **Confirmed** means an official source says so.
- **Inferred** means secondary sources agree.
- **Assumption** means nobody has verified it yet.

Recheck a fact against the official source before you build on it. Update this file when a fact changes.

## Crypto provider contract

Every crypto adapter in `src/providers/` implements these capabilities. Every adapter passes the shared contract test suite.

| Capability        | Returns                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| List assets       | `CryptoAsset[]` keyed by `AssetId`. The adapter maps provider symbols to our IDs. |
| Snapshot          | `Quote[]` with price, 24-hour change, and 24-hour volume                          |
| Subscribe         | Live `Quote` updates for a set of assets, plus a function that unsubscribes       |
| History           | `PricePoint[]` for a range                                                        |
| Quote currency    | The currency the adapter's prices are in, such as USDT or USD                     |
| Direct fiat pairs | The fiat currencies the adapter can price a coin in directly                      |

## Binance (primary crypto provider)

| Fact                                                                                                                                        | Label       | Source                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Public market data uses `https://data-api.binance.vision` with no API key. It serves spot data only.                                        | Confirmed   | [Binance market data only URLs](https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only) |
| A WebSocket connection lasts at most 24 hours. The server pings every 20 seconds and drops the connection without a pong within one minute. | Confirmed   | [Binance WebSocket streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)        |
| A client may send at most 5 messages per second on one connection.                                                                          | Confirmed   | [Binance WebSocket streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)        |
| The all-market mini-ticker stream `!miniTicker@arr` updates every 1000 ms.                                                                  | Confirmed   | [Binance WebSocket streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)        |
| Some locations get HTTP 451, including US IPs, even on public endpoints.                                                                    | Inferred    | [Forum report](https://dev.binance.vision/t/api-error-451-unavailable-for-legal-reasons/13828)                   |
| Restricted locations include the US, Canada, and the Netherlands. The list changes.                                                         | Inferred    | [Datawallet](https://www.datawallet.com/crypto/binance-restricted-countries)                                     |
| binance.com serves Türkiye. Lira trading moved to Binance TR, a separate company.                                                           | Inferred    | [Buy Bitcoin Smart](https://www.buybitcoinsmart.com/exchanges/binance-tr/turkey)                                 |
| Whether a market-data-only WebSocket host exists                                                                                            | Assumption  | Verify at M6                                                                                                     |
| Display of Binance data in a public third-party app is permitted                                                                            | Not settled | See [ADR 0007](../decisions/0007-data-licensing-release-gate.md)                                                 |

## Kraken (fallback crypto provider)

| Fact                                                                                                             | Label                | Source                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Public WebSocket v2 is at `wss://ws.kraken.com/v2` with no authentication. Channels include `ticker` and `ohlc`. | Confirmed            | [Kraken WebSocket v2](https://docs.kraken.com/websockets-v2)                                                 |
| Public REST OHLC is at `GET /0/public/OHLC` with no authentication. Kraken suggests about one call per second.   | Confirmed            | [Kraken historical data](https://docs.kraken.com/exchange/guides/general/historical-data)                    |
| Older REST endpoints use `XBT` for bitcoin.                                                                      | Inferred             | Verify at M5                                                                                                 |
| Non-personal commercial use of public endpoints needs prior authorization. Contact is `marketdata@kraken.com`.   | Inferred, secondhand | [GitHub issue quoting Kraken](https://github.com/leandrosilveiradepaula/crypto-intelligence-agent/issues/48) |
| Exact public rate limits                                                                                         | Assumption           | Verify at M5                                                                                                 |

## Frankfurter (FX provider)

| Fact                                                                     | Label       | Source                                                                                            |
| ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| No API key is needed.                                                    | Confirmed   | [Frankfurter](https://frankfurter.dev/)                                                           |
| The ECB source updates once per business day. It has no weekend rates.   | Confirmed   | [Frankfurter ECB provider](https://frankfurter.dev/providers/ecb/)                                |
| ECB data includes TRY, with history back to 1999.                        | Inferred    | [Frankfurter ECB provider](https://frankfurter.dev/providers/ecb/)                                |
| Blended v2 rates draw on many central banks. We use the ECB source only. | Confirmed   | [Frankfurter](https://frankfurter.dev/)                                                           |
| ECB data terms                                                           | Not settled | [ECB disclaimer](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html) |

## Providers rejected

| Provider                | Reason                                                                               | Source                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Coinbase                | Its market data terms forbid apps for end users outside the licensee's organization. | [Coinbase Market Data Terms](https://www.coinbase.com/legal/market_data)                                                |
| CoinGecko Demo          | Requires an API key with a shared quota. No commercial license.                      | [CoinGecko pricing](https://www.coingecko.com/en/api/pricing)                                                           |
| CoinCap v3              | Requires an API key. WebSocket is paid only.                                         | [CoinCap](https://splash.coincap.io/)                                                                                   |
| CoinPaprika free tier   | Personal use only, per its official API page                                         | [CoinPaprika API](https://coinpaprika.com/api)                                                                          |
| CoinMarketCap free tier | Requires an API key with a shared quota. License terms conflict across sources.      | [CoinMarketCap comparison](https://coinmarketcap.com/academy/article/best-free-crypto-api-in-2026-free-tier-comparison) |

A free tier that needs an API key fails in a backend-free app. Every device shares one key and one quota, and anyone can extract the key from the app. Keyless providers limit by IP address, so each device has its own limit.

A paid aggregator behind a small caching proxy stays available as Option C in [ADR 0007](../decisions/0007-data-licensing-release-gate.md).
