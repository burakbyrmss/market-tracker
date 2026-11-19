# Architecture overview

This document explains how Market Tracker V1 is structured and why. Decisions behind each part are in [`docs/decisions/`](../decisions/).

## Stack

| Area | Choice | ADR |
| --- | --- | --- |
| Runtime | Expo with development builds. Expo Go is not supported. | [0001](../decisions/0001-expo-development-builds.md) |
| Language | TypeScript with `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` | — |
| Navigation | Expo Router | [0002](../decisions/0002-expo-router.md) |
| REST data | TanStack Query | [0003](../decisions/0003-state-query-zustand-mmkv.md) |
| Live prices and app state | Zustand | [0003](../decisions/0003-state-query-zustand-mmkv.md) |
| Storage | MMKV | [0003](../decisions/0003-state-query-zustand-mmkv.md) |
| Crypto data | Binance, with Kraken as fallback, behind one provider contract | [0004](../decisions/0004-provider-independent-market-data.md) |
| FX data | Frankfurter, ECB source only | [0005](../decisions/0005-fx-frankfurter-ecb.md) |
| Money arithmetic | A decimal library behind `domain/money` | [0006](../decisions/0006-decimal-money-module.md) |
| Validation | Zod, at boundaries only | — |
| Charts | Victory Native XL, provisional until M2 | [0011](../decisions/0011-charts-victory-native-xl.md) |
| Translations | i18next, `expo-localization`, and `Intl.NumberFormat` | — |
| Crash reporting | Sentry, crash reports only | [0009](../decisions/0009-sentry-crash-only.md) |
| Updates | EAS Build, EAS Submit, and EAS Update | [0010](../decisions/0010-eas-update.md) |
| Tests | Jest, React Native Testing Library, and Maestro | — |

## Layers

```
src/app/            Expo Router routes. Screens stay thin.
src/features/       crypto, fx, watchlist, converter, settings
src/services/       market-data service: picks the provider, exposes hooks
src/providers/      binance, kraken, frankfurter: REST and WebSocket clients, Zod schemas, mappers
src/domain/         Types, money, conversion rules. Pure TypeScript.
src/shared/         UI kit, formatting, storage, i18n
scripts/            Generators for coin names, logos, and test data
```

Imports point one way. `app` imports `features`. `features` import `services`, `domain`, and `shared`. `services` import `providers` and `domain`. `providers` import `domain`. `domain` imports only the decimal library. An ESLint import-boundary rule enforces this order from M1.

Each provider module is the only code that knows its API's raw shape. Nothing outside `providers/` sees a Binance symbol or a Kraken pair name.

## Data shape

| Type | Fields | Notes |
| --- | --- | --- |
| `AssetId` | Branded string, such as `BTC` | Our ID. It never changes when the provider changes. |
| `CurrencyCode` | Branded ISO 4217 string, such as `EUR` | |
| `CryptoAsset` | `id`, `name`, `logo` (optional) | Names and logos come from bundled files |
| `FxCurrency` | `code`, `name` | |
| `Quote` | `assetId`, `price`, `change24hPct`, `volume24h`, `updatedAt`, `source` | One shape for both markets. For FX, `updatedAt` is the ECB date. |
| `PricePoint` | `time`, `price` | Chart data |
| `Watchlists` | `crypto: AssetId[]`, `fx: CurrencyCode[]` | Ordered. V2 sync moves these IDs without change. |
| `Settings` | `displayCurrency`, `language`, `theme` | `displayCurrency` is USD, EUR, or TRY |

Prices from the network are plain numbers for display and charts. Any arithmetic on money uses `domain/money`. See [ADR 0006](../decisions/0006-decimal-money-module.md).

## Data flow

```
Crypto provider REST (Binance or Kraken)
	asset list   -> coin universe, cached for one day
	snapshot     -> first prices and the top-100 ranking
	history      -> chart data, cached per range

Crypto provider WebSocket, one connection
	-> live price store -> each row subscribes to its own asset only
	- closed when the app goes to background, reopened on foreground
	- reconnects with backoff, and before any provider connection limit

Frankfurter, ECB source
	latest       -> FX list and display-currency conversion, cached for one day
	time series  -> FX charts

TanStack Query cache and Zustand stores -> MMKV
	-> offline: last values with a "stale since" label
```

## Provider selection

At startup the market-data service checks the primary crypto provider, Binance. On HTTP 451 or a network failure it selects Kraken and stores that choice. One provider serves the whole session, so prices never mix sources on one screen. The UI always shows the active source. See [ADR 0004](../decisions/0004-provider-independent-market-data.md) and [Market data providers](providers.md).

## Display currency conversion

1. If the active provider lists a direct pair for the coin and the display currency, such as `BTCEUR`, the app uses that pair.
2. Otherwise the app multiplies the coin's USD or USDT price by the ECB rate from USD to the display currency.

The app treats 1 USDT as 1 USD. This is an assumption. The deviation is normally under 0.1%, and the detail screen shows the method used.
