# Product requirements

Market Tracker shows cryptocurrency and foreign exchange (FX) prices on iOS and Android. V1 is a complete, backend-free market tracker published on the Apple App Store and Google Play.

## Vision

The long-term product supports user accounts, portfolio management, transaction history, and cloud sync. Each version ships to the stores only after it passes the production gate in [Definition of Done](../standards/definition-of-done.md).

## Users and markets

- Public release, free, with no ads.
- Türkiye and the EU first, with international users supported, including the Netherlands and the US.
- Languages are English and Turkish.
- Platforms are iOS and Android. The minimum OS versions are the ones the current Expo SDK supports. They are recorded at M1.

## V1 scope

1. **Crypto market list.** The top 100 coins by 24-hour volume, with live prices and 24-hour change.
2. **FX market list.** About 30 currencies from the European Central Bank (ECB). Each rate shows its date.
3. **Search.** Search covers every coin that the active provider lists and every FX currency.
4. **Two watchlists.** One list holds crypto and one list holds FX. Each list is reorderable and stored on the device.
5. **Asset detail with chart.** Crypto ranges are 1D, 1W, 1M, 1Y, and All. FX ranges are 1M, 1Y, and 5Y on daily data. V1 uses line charts only.
6. **Converter.** The converter supports fiat to fiat, crypto to fiat, and crypto to crypto.
7. **Display currency.** The user picks USD, EUR, or TRY. A crypto price uses the provider's direct fiat pair when one exists. Otherwise the price is the USD-quoted price multiplied by the FX rate. The detail screen shows which method and source produced the price.
8. **Offline.** Without a network, the app shows the last cached prices with a "stale since" label. No screen is ever blank.
9. **Settings.** The user sets display currency, language, and theme (light, dark, or system).
10. **Accessibility.** The app supports dynamic type and screen reader labels on every price.
11. **Legal.** The app shows a "not investment advice" disclaimer and credits every data source.
12. **Coin identity.** Each coin shows its full name. Coins in the bundled CC0 icon set show their logo. Other coins show a lettered circle.

## How a coin is defined

A coin is one row per asset, not one row per trading pair. Bitcoin appears once, as "Bitcoin", even though exchanges list `BTCUSDT`, `BTCEUR`, and other pairs. A coin appears only if the active provider lists an active pair against USD or USDT. Stablecoins, fiat currencies listed as coins (such as EUR/USD), and tokenized stocks (such as Binance's NVDAB) are hidden from the top-100 list and stay searchable. The curated list lives in `src/domain/asset-classes.ts`. The ranking is set from each snapshot, so rows do not reorder with every live tick.

## Non-goals for V1

- Accounts, a backend, cloud sync, push notifications, and price alerts. These belong to V2.
- Portfolio and profit and loss. These belong to V1.5.
- Trading, order books, futures, and leverage data.
- Intraday and weekend FX rates.
- More than one watchlist per market.
- News, social features, home screen widgets, and tablet-specific layouts.
- Ads and analytics SDKs. Sentry crash reporting is the only telemetry.

## Later versions

These outlines stay coarse on purpose. Each version gets detailed planning when its work starts.

- **V1.5: local portfolio.** The user records transactions on the device. The app shows holdings and profit and loss. All calculations go through the decimal money module.
- **V2: accounts and cloud.** A backend is chosen in its own ADR. V2 adds authentication, sync of watchlists and the portfolio, and server-side price alerts.
