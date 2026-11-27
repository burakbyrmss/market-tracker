# 0001: Use Expo with development builds

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The app needs native modules. MMKV v4 is a Nitro module and needs `react-native-nitro-modules` (confirmed). Victory Native XL needs React Native Skia, Reanimated, and Gesture Handler (inferred). Expo Go does not include these modules.

## Decision

Use the current Expo SDK with development builds from M1. EAS Build produces the development, preview, and production builds. Expo Go is not supported.

## Alternatives considered

- **Expo Go.** It cannot load MMKV.
- **Bare React Native without Expo.** It loses EAS Build, EAS Submit, EAS Update, and config plugins, and gains nothing this app needs.
- **AsyncStorage instead of MMKV, to keep Expo Go.** Charts still need a development build, so this trade gains nothing.

## Consequences

- Each native dependency change needs a new development build. CI (`scripts/eas-dev-build.mjs`) queues one, when started by hand on `main` (Run workflow), only when the platform's native fingerprint has no queued, running, or finished development build. Changes that only touch JavaScript or docs spend no build quota.
- The minimum iOS and Android versions follow the Expo SDK. M1 records them in an ADR.

## Sources

- [react-native-mmkv README](https://raw.githubusercontent.com/mrousavy/react-native-mmkv/main/README.md)
- [MMKV Expo configuration](https://deepwiki.com/mrousavy/react-native-mmkv/6.3-expo-configuration)
- [Victory Native XL](https://github.com/FormidableLabs/victory-native-xl)
- EAS's Android build machine has 4 vCPUs and 15.6 GB of RAM. Development and preview builds compile only `arm64-v8a`. Their `GRADLE_OPTS` in `eas.json` turn off parallel Gradle tasks, allow one worker, and run the Kotlin compiler in the Gradle process with a 4 GB heap. One worker means one native library compiles at a time. Debug C++ builds of Skia and Reanimated at the same time killed Gradle, even with two workers. Even with one worker, Skia's debug C++ build failed on its own (`2a991291`), so Skia was removed (see [ADR 0011](0011-charts-victory-native-xl.md)). Release builds of Skia had passed (`e0fa01c1`). Production builds keep all architectures and may need the same limits.
