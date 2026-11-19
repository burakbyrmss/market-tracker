# Market Tracker

Expo (React Native) app for tracking crypto and FX markets. V1 has no backend.
Product and plans live in `docs/`. Read the relevant doc before changing an area.

## Status
Current milestone: see `docs/roadmap.md`. Do not start a milestone before the previous one's exit check passes.

## Commands
Added at M1 (install, start dev client, typecheck, lint, test, e2e).

## Architecture rules
- Layers: `app/` (routes, thin) → `features/` → market-data service → `providers/*` → external APIs. `domain/` is pure TS, imported by all, imports nothing app-specific.
- `features/` never import `providers/*`. Go through the market-data service.
- Parse external data (API, storage, deep links) with Zod once, in `providers/` or `shared/storage`. Inside, trust the types.
- Asset and currency IDs are ours (`AssetId`, `CurrencyCode`), never provider symbols.
- One crypto provider per session. Never mix provider prices on one screen. Always show the data source.
- All money arithmetic goes through `domain/money` (decimal). Plain numbers only for chart plotting and display.
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
- Comments explain why, never what.
- Small, single-purpose commits. Conventional commit messages.
