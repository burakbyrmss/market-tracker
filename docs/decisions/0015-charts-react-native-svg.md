# 0015: Draw line charts with react-native-svg

- **Status:** Proposed. Accepted when both acceptance checks below pass.
- **Date:** 2026-11-23

## Context

- V1 needs line charts only: crypto ranges 1D to All, FX ranges 1M to 5Y (requirement 5). Confirmed.
- [ADR 0011](0011-charts-victory-native-xl.md) chose Victory Native XL on Skia, then was withdrawn: Android development builds with Skia failed on the EAS free tier (4 vCPUs, 15.6 GB of RAM). Confirmed by builds `2a991291` and earlier.
- The withdrawal set two conditions for M11: a measured choice, and Android development builds that still succeed on the free tier.
- `react-native-svg` 15.16.0 is the version Expo SDK 58 pins (`expo/bundledNativeModules.json`). Confirmed. On Android and iOS its native code is Java, Objective-C, and five small C++ files (Fabric shadow nodes and the JNI entry), not a rendering engine. Confirmed from the package. It builds on the free tier: confirmed by acceptance check 1.
- The heaviest chart is the crypto "All" range at weekly candles or 1D at 288 five-minute candles: a few hundred points. Confirmed from `RANGE_CANDLES`.

## Decision

Use `react-native-svg` at the Expo-pinned version, with our own line drawing in `src/features/chart`. `geometry.ts` places points by time and builds one SVG path. `LineChart` draws the path and a finger readout. The readout uses React Native's touch responder on the JS thread, with no Reanimated worklets. Chart prices stay plain numbers. The range change shown with the chart goes through `domain/money`.

A coin's chart shows the provider's own pair (BTC/USDT on Binance). Converting history with today's FX rate would draw prices that never traded. An FX chart shows the pair it is valued in.

## Acceptance checks

1. An Android development build of a commit with `react-native-svg` succeeds on the EAS free tier. Passed: build `d7e20923` from `cb809cd` on 2026-11-23 finished. The iOS build `f1e4f671` finished too.
2. On a preview build, Perf Monitor (dev menu) shows a median of at least 55 fps on both the UI and JS threads while a finger scrubs the 1Y chart for 15 seconds. Run on the owner's iPhone 13 and on an Android device. Pending.

If check 2 fails, move the readout to Reanimated shared values before changing the library.

## Alternatives considered

- **Victory Native XL, react-native-wagmi-charts.** Both draw with Skia, which broke Android development builds (ADR 0011).
- **react-native-gifted-charts.** Also SVG based. It brings many chart types and props the app does not use, for a line we can draw in about 60 lines.
- **ECharts in a WebView.** A web runtime per chart, slower to appear, and harder to make accessible.
- **Plain views.** Cannot draw a line between points.

## Consequences

- A new native module, so the development build is rebuilt. CI does this on merge.
- We own the chart code: its tests cover geometry, the finger readout, and each load state.
- No axes or gridlines in V1. The readout and the screen-reader summary give values.

## Sources

- [react-native-svg](https://github.com/software-mansion/react-native-svg)
- `node_modules/expo/bundledNativeModules.json` in Expo SDK 58
