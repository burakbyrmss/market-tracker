# 0011: Use Victory Native XL for charts

- **Status:** Provisional until M2
- **Date:** 2026-11-19

## Context

V1 needs line charts only. Victory Native XL renders with React Native Skia and supports gestures through Reanimated and Gesture Handler. Its performance claims come from blogs, not reproducible benchmarks.

## Decision

Use Victory Native XL, pending the M2 spike. The spike draws a line chart with one year of daily data and a 100-row list that updates every second, on the Android 12 device. Record the measured frame rate and scroll smoothness here. Then mark this ADR accepted, or replace it.

## Alternatives considered

- **React Native Chart Kit.** SVG based. Fine for simple charts, weaker for gestures.
- **ECharts for React Native.** Runs in a WebView.
- **react-native-wagmi-charts.** A candidate if the spike fails. Check its maintenance status first.

## Consequences

- The chart library needs a development build. See [ADR 0001](0001-expo-development-builds.md).

## Measurements

Pending M2.

## Sources

- [Victory Native XL](https://github.com/FormidableLabs/victory-native-xl)
- [Victory Native in Expo](https://reactnativerelay.com/article/react-native-charts-victory-native-interactive-data-visualizations-expo)
