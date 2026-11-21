# Market data providers

This reference lists each external data provider, the contract every crypto adapter implements, and the facts behind each choice. Each fact carries a label.

- **Confirmed** means an official source says so.
- **Inferred** means secondary sources agree.
- **Assumption** means nobody has verified it yet.

Recheck a fact against the official source before you build on it. Update this file when a fact changes.

## Crypto provider contract

Every crypto adapter in `src/providers/` implements `CryptoProvider` (`src/providers/contract.ts`) and passes the shared contract suite in `test/providers/contract-suite.ts`.

| Capability   | Returns                                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `listAssets` | `ListedAsset[]`: coins with a USD or USDT pair, under our `AssetId`, each with its direct fiat pairs (EUR, TRY)                  |
| `snapshot`   | `MarketSnapshot`: a `Quote` per coin (price as `Decimal`, rolling 24-hour change or null, 24-hour volume) and direct fiat prices |
| `history`    | `PricePoint[]` for a chart range, oldest first. Candle sizes per range are shared (`RANGE_CANDLES`).                             |
| `quoteAsset` | `USDT` (Binance) or `USD` (Kraken). The app treats USDT as USD.                                                                  |
| Subscribe    | Live quote updates. Joins the contract in M6.                                                                                    |

Errors: a non-2xx answer throws `ProviderHttpError` with its `status` (the service reads 451 to fall back). A response with an unexpected shape throws `ProviderDataError`. One malformed entry in a long list is skipped, but a snapshot with no USD prices at all is an error.

Test data: `npm run record-fixtures` records trimmed responses with synthetic values (ADR 0012). `npm run smoke` runs the adapters against the live APIs. It is manual, not part of CI.

## Binance (primary crypto provider)

| Fact                                                                                                                                                                                                      | Label       | Source                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Public market data uses `https://data-api.binance.vision` with no API key. It serves spot data only.                                                                                                      | Confirmed   | [Binance market data only URLs](https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only)          |
| A WebSocket connection lasts at most 24 hours. The server pings every 20 seconds and drops the connection without a pong within one minute.                                                               | Confirmed   | [Binance WebSocket streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)                 |
| A client may send at most 5 messages per second on one connection.                                                                                                                                        | Confirmed   | [Binance WebSocket streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)                 |
| The all-market mini-ticker stream `!miniTicker@arr` updates every 1000 ms.                                                                                                                                | Confirmed   | [Binance WebSocket streams](https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams)                 |
| Some locations get HTTP 451, including US IPs, even on public endpoints.                                                                                                                                  | Inferred    | [Forum report](https://dev.binance.vision/t/api-error-451-unavailable-for-legal-reasons/13828)                            |
| Restricted locations include the US, Canada, and the Netherlands. The list changes.                                                                                                                       | Inferred    | [Datawallet](https://www.datawallet.com/crypto/binance-restricted-countries)                                              |
| binance.com serves Türkiye. Lira trading moved to Binance TR, a separate company.                                                                                                                         | Inferred    | [Buy Bitcoin Smart](https://www.buybitcoinsmart.com/exchanges/binance-tr/turkey)                                          |
| `exchangeInfo?symbolStatus=TRADING&showPermissionSets=false` is about 2.6 MB raw and 55 KB gzipped. `ticker/24hr?type=MINI` for all symbols is about 1 MB raw and 170 KB gzipped. Measured on 2026-11-21. | Confirmed   | Measured with curl                                                                                                        |
| The `MINI` ticker has `openPrice` and `lastPrice` over a rolling 24 hours, but no `priceChangePercent`. The adapter computes the change.                                                                  | Confirmed   | [Binance market data endpoints](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints) |
| Whether a market-data-only WebSocket host exists                                                                                                                                                          | Assumption  | Verify at M6                                                                                                              |
| Display of Binance data in a public third-party app is permitted                                                                                                                                          | Not settled | See [ADR 0007](../decisions/0007-data-licensing-release-gate.md)                                                          |

## Kraken (fallback crypto provider)

| Fact                                                                                                                                                              | Label                | Source                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Public WebSocket v2 is at `wss://ws.kraken.com/v2` with no authentication. Channels include `ticker` and `ohlc`.                                                  | Confirmed            | [Kraken WebSocket v2](https://docs.kraken.com/websockets-v2)                                                   |
| Public REST OHLC is at `GET /0/public/OHLC` with no authentication. Kraken suggests about one call per second.                                                    | Confirmed            | [Kraken historical data](https://docs.kraken.com/exchange/guides/general/historical-data)                      |
| REST uses `XBT` for bitcoin and `XDG` for dogecoin, in `wsname` (`XBT/USD`) and in result keys (`XXBTZUSD`, `XDGUSD`). The adapter maps them to `BTC` and `DOGE`. | Confirmed            | Live responses, 2026-11-21                                                                                     |
| Ticker `o` is today's opening price at 00:00 UTC, not a rolling 24-hour open. REST has no rolling 24-hour change, so Kraken snapshots report the change as null.  | Confirmed            | [Get Ticker Information](https://docs.kraken.com/api/docs/rest-api/get-ticker-information/)                    |
| OHLC returns at most the 720 most recent candles. Intervals are 1, 5, 15, 30, 60, 240, 1440, 10080, and 21600 minutes.                                            | Confirmed            | [Get OHLC Data](https://docs.kraken.com/api/docs/rest-api/get-ohlc-data)                                       |
| Non-personal commercial use of public endpoints needs prior authorization. Contact is `marketdata@kraken.com`.                                                    | Inferred, secondhand | [GitHub issue quoting Kraken](https://github.com/leandrosilveiradepaula/crypto-intelligence-agent/issues/48)   |
| Public endpoints are limited per IP. About one call per second stays within the limits. OHLC is also limited per pair. No exact number is published.              | Confirmed            | [Kraken support: API rate limits](https://support.kraken.com/articles/206548367-what-are-the-api-rate-limits-) |

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
