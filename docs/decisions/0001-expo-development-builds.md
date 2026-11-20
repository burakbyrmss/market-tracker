# 0001: Use Expo with development builds

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The app needs native modules. MMKV v4 is a Nitro module and needs `react-native-nitro-modules` (confirmed). Victory Native XL needs React Native Skia, Reanimated, and Gesture Handler (inferred). Expo Go does not include these modules.

## Decision

Use the current Expo SDK with development builds from M1. EAS Build produces the development, preview, and production builds. Expo Go is not supported.

## Alternatives considered

- **Expo Go.** It cannot load MMKV or Skia.
- **Bare React Native without Expo.** It loses EAS Build, EAS Submit, EAS Update, and config plugins, and gains nothing this app needs.
- **AsyncStorage instead of MMKV, to keep Expo Go.** Charts still need a development build, so this trade gains nothing.

## Consequences

- Each native dependency change needs a new development build. CI (`scripts/eas-dev-build.mjs`) queues one on a push to `main` only when the platform's native fingerprint has no queued, running, or finished development build. Changes that only touch JavaScript or docs spend no build quota.
- The minimum iOS and Android versions follow the Expo SDK. M1 records them in an ADR.

## Sources

- [react-native-mmkv README](https://raw.githubusercontent.com/mrousavy/react-native-mmkv/main/README.md)
- [MMKV Expo configuration](https://deepwiki.com/mrousavy/react-native-mmkv/6.3-expo-configuration)
- [Victory Native XL](https://github.com/FormidableLabs/victory-native-xl)
