# 0011: Use Victory Native XL 42 for charts

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

V1 needs line charts only. Victory Native XL renders with React Native Skia and supports gestures through Reanimated and Gesture Handler. Its performance claims come from blogs, not reproducible benchmarks, so milestone M2 tested it.

Victory Native 43 depends on the renamed `react-native-skia` package, version 2.15 or later. Expo SDK 58 pins `@shopify/react-native-skia` 2.14.0. Installing version 43 puts two copies of Skia in the app (confirmed from npm metadata). Victory Native 42.0.1 declares `@shopify/react-native-skia` `>=2.6.0 <3.0.0` as its peer, so it works with the pinned Skia (confirmed).

## Decision

- Use `victory-native` 42.0.1, pinned exactly, with the Expo-pinned `@shopify/react-native-skia`.
- Add both packages at M11, when the first chart ships. `main` does not carry them before then.
- Move to Victory Native 43 or later when an Expo SDK pins the renamed `react-native-skia`. Record the move in a new ADR.
- Use React Native's `FlatList` for the market lists. Switch to FlashList only if M7 shows a measured problem. This is a judgment call, not a measured result. See the Measurements section.

## Alternatives considered

- **Victory Native 43.** Two Skia copies in one app.
- **React Native Chart Kit.** SVG based. Fine for simple charts, weaker for gestures.
- **ECharts for React Native.** Runs in a WebView.
- **react-native-wagmi-charts.** Not needed, because the spike met the bar.

## Consequences

- The chart library needs a development build. See [ADR 0001](0001-expo-development-builds.md).
- Victory Native stays one major version behind until Expo adopts the renamed Skia package.

## Measurements

The spike lives on the `m2/perf-spike-v2` branch and is never merged. It draws a line chart with 365 daily points and a dot that follows the finger. It also renders a 100-row list in FlatList and FlashList variants, with every price updating once per second. An on-screen meter counts frames per second on the JS thread and on the UI thread, one sample per second over a 15-second run.

Pass bar, set before the run: median of at least 55 fps on both threads for every variant, over 3 runs.

| Run        | Device                                           | Build               | Result                                                                               |
| ---------- | ------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------ |
| 2026-11-19 | Owner's device, Expo Go with `--no-dev --minify` | Production JS       | The owner reported that all variants met the bar. The raw samples were not recorded. |
| Pending    | Android 12 device                                | EAS `preview` build | Not measured yet                                                                     |

The raw numbers were not recorded, and the Android 12 run has not happened. Both gaps are tracked in [Risks](../risks.md). FlatList versus FlashList was not compared on recorded numbers. That is why the list choice above is a judgment call.

## Sources

- [Victory Native XL](https://github.com/FormidableLabs/victory-native-xl)
- [Victory Native in Expo](https://reactnativerelay.com/article/react-native-charts-victory-native-interactive-data-visualizations-expo)
