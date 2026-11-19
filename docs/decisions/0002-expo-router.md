# 0002: Use Expo Router for navigation

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The original preference was React Navigation. Expo Router is built on React Navigation and is the default in Expo's templates (inferred).

## Decision

Use Expo Router. Routes live in `src/app/`. Screens there stay thin and render components from `src/features/`.

## Alternatives considered

- **React Navigation directly.** It works, but needs manual route typing and manual deep link setup. Expo Router provides both and keeps React Navigation underneath.

## Consequences

- Deep links to an asset detail screen work with no extra setup.
- Typed routes catch broken links at compile time.
- Deep link parameters are external input. Parse them at the route, as the engineering standards require.
