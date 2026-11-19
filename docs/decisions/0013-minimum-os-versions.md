# 0013: Support the Expo SDK 58 minimum OS versions

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The owner chose the current Expo SDK's minimum OS versions as the starting point. The project starts on Expo SDK 58 with React Native 0.88. Secondary sources state that SDK 58 supports Android 7 and later and iOS 16.4 and later, and needs Xcode 26.4 (inferred). The official table at `docs.expo.dev/versions/latest` is the authority.

## Decision

- Support iOS 16.4 and later.
- Support Android 7 (API level 24) and later.
- Raise the minimums only when an Expo SDK upgrade raises them. Record each change in a new ADR.
- iPad runs the app as an iPhone app. `ios.supportsTablet` is `false`, because tablet layouts are a V1 non-goal.

## Consequences

- The owner's test devices, an iPhone 13 and an Android 12 phone, are inside the supported range.
- The low-end Android test device for the production gate must run Android 7 or later.

## Sources

- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0)
- [Expo SDK 58 changelog](https://expo.dev/changelog/sdk-58.md)
- [Expo SDK 58 breaking changes summary](https://www.buildmvpfast.com/blog/expo-sdk-58-ios-27-react-native-088-breaking-changes-2026)
