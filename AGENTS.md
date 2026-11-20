# Market Tracker

Expo (React Native) app for tracking crypto and FX markets. V1 has no backend.
Product and plans live in `docs/`. Read the relevant doc before changing an area.

## Status

Current milestone: see `docs/roadmap.md`. Do not start a milestone before the previous one's exit check passes.

## Commands

```bash
npm ci                 # install
npx expo install <pkg> # add a dependency (never plain npm install): picks SDK-compatible versions
npm start              # start Metro for the development build
npm run check          # typecheck + lint + format check + tests (run before declaring done)
npm run doctor         # expo-doctor
npx eas-cli@latest build --profile development --platform <ios|android>
```

## Expo

- Expo SDK 58. Expo changes every SDK. Read `https://docs.expo.dev/versions/v58.0.0/` for the API you touch. Do not trust memory.
- `ios/` and `android/` are generated. Never create or edit them. Configure native behavior in `app.json` and config plugins.
- Expo Go is not supported. A new native dependency needs a new development build.
- Routes live in `src/app/`. Tests live in `test/` or next to source as `*.test.ts(x)`, never in `src/app/`.

## Architecture rules

- Layers: `app/` (routes, thin) → `features/` → market-data service → `providers/*` → external APIs. `domain/` is pure TS, imported by all, imports nothing app-specific.
- `features/` never import `providers/*`. Go through the market-data service.
- Parse external data (API, storage, deep links) with Zod once, in `providers/` or `shared/storage`. Inside, trust the types.
- Asset and currency IDs are ours (`AssetId`, `CurrencyCode`), never provider symbols.
- One crypto provider per session. Never mix provider prices on one screen. Always show the data source.
- All money arithmetic goes through `src/domain/money.ts` (big.js behind an opaque `Decimal`). Plain numbers only for chart plotting and display, via `toDisplayNumber`. ESLint blocks `big.js` imports elsewhere.
- Crypto prices in the display currency come from `cryptoDisplayPrice` in `src/domain/conversion.ts`. Do not reimplement the rule.
- Persisted Zustand stores use `persistOptions` from `src/shared/storage` with a Zod schema. A change to a persisted shape bumps `version` and adds a `migrate`.
- Settings (theme, language, display currency) live in `useSettings` (`src/features/settings/store.ts`). Change them through the store, never by calling `i18n.changeLanguage` or `colorScheme.set` directly.
- Format prices, percentages, and rates with `src/shared/format`. Never call `toFixed` on a price for display.
- No new dependency without a reason in the PR. Architectural changes need an ADR in `docs/decisions/`.

## External APIs

- Never assume endpoints, limits, or terms. Check current official docs and cite them in `docs/architecture/providers.md`.
- Never use Coinbase market data (its terms forbid it).
- Test data from real APIs is trimmed and its values replaced before it is committed. The repo is public.

## Testing

- Test behavior through public interfaces. RNTL queries by role/text. No snapshot tests.
- Bug fixes start with a failing test. Every provider adapter passes the shared contract suite.
- "Done" means shown on a real device, not "it compiles". See `docs/standards/definition-of-done.md`.

## Security and privacy

- No secrets in the app or repo. Build secrets live in EAS.
- Sentry: crash reports only. No PII, no replay, no tracing, no analytics SDKs.
- HTTPS/WSS only. No `console` output in production builds.

## Style

- Strict TS: no `any`, no `@ts-ignore`, no lint suppressions.
- Style with NativeWind `className` only. No `StyleSheet`, no inline `style` objects. Every screen renders inside `Screen` (`src/shared/ui/screen.tsx`) for safe areas.
- Register third-party components that take `className` in `src/shared/ui/interop.ts`.
- `expo-router` `Link` ignores `className` on native. Use `<Link href asChild>` around a `Pressable` with a styled `Text`.
- Every user-facing string goes through `t()` from `react-i18next`. Add each key to both `src/shared/i18n/locales/en.json` and `tr.json`. The compiler rejects a missing Turkish key or an unknown key.
- Comments explain why, never what.
- Small, single-purpose commits. Conventional commit messages.
