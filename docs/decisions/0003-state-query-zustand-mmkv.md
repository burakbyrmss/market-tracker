# 0003: Split state between TanStack Query, Zustand, and MMKV

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The app has three kinds of state:

- REST data that is fetched, cached, and refetched: asset lists, snapshots, chart history, and FX rates.
- Live prices that arrive every second for up to 100 rows.
- App state that the user owns: watchlists and settings.

## Decision

- **TanStack Query** owns REST data. Its cache persists to MMKV so the app works offline.
- **Zustand** owns the live price store. One WebSocket writes to it. Each list row subscribes to its own asset, so one price change re-renders one row.
- **Zustand with MMKV persistence** owns watchlists and settings.

## Alternatives considered

- **Live prices in TanStack Query.** Writing 100 quotes per second into the query cache re-renders every observer. A store with per-asset selectors avoids that.
- **One global store for everything.** It loses TanStack Query's caching, refetch, and stale handling for REST data.

## Consequences

- Two state libraries to learn. Each has one clear job.
- Persisted data shapes are stored on devices. A change to a persisted shape needs a migration.
- MMKV is `react-native-mmkv` 4, which runs on Nitro Modules (`react-native-nitro-modules`). Both are native, so adding them needed a new development build. Under Jest, MMKV uses its own in-memory mock and `test/setup.ts` stubs Nitro.
- Every persisted store uses `persistOptions` from `src/shared/storage`. Stored data passes a Zod schema on load. Each settings field falls back to its default on its own, so one invalid value does not reset the rest.
