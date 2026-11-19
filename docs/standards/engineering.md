# Engineering standards

These standards apply to every change. CI enforces the rules that a tool can check. Review covers the rest.

## Code

| Rule                                                                                                                                                                                                                                                                           | Enforcement                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| TypeScript runs with `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`. Do not use `any` or `@ts-ignore`.                                                                                                                                                 | tsconfig and ESLint in CI                                           |
| Give IDs and currency codes their own branded types: `AssetId` and `CurrencyCode`. Only parse functions create them.                                                                                                                                                           | Types                                                               |
| Parse external data with Zod once, at the boundary. External data means API responses, MMKV reads, and deep link parameters. Inside the app, trust the types and do not validate again.                                                                                        | Zod schemas live only in `src/providers/` and `src/shared/storage/` |
| Keep `src/domain/` pure TypeScript. It imports no React, React Native, or network code.                                                                                                                                                                                        | ESLint import-boundary rule                                         |
| `src/features/` never imports `src/providers/`. Features use the market-data service.                                                                                                                                                                                          | ESLint import-boundary rule                                         |
| Do all money arithmetic in `domain/money`. Plain number arithmetic on prices is allowed only for chart plotting.                                                                                                                                                               | ESLint rule where possible, and review                              |
| Give a reason in the pull request for each new dependency. Write an ADR for any architectural change.                                                                                                                                                                          | Pull request template                                               |
| Write comments that explain why. Do not write comments that restate what the code does.                                                                                                                                                                                        | Review                                                              |
| Style with NativeWind `className`. Do not use `StyleSheet` or inline `style` objects. Wrap every screen in `Screen` from `src/shared/ui/screen.tsx` so content stays inside safe areas. Register a third-party component that takes `className` in `src/shared/ui/interop.ts`. | ESLint bans `StyleSheet` imports. Review covers the rest.           |
| Do not suppress a lint rule. Fix the code or change the rule in an ADR.                                                                                                                                                                                                        | ESLint `--report-unused-disable-directives` and review              |

## Testing

| Layer             | Tool                         | Scope                                                                                                                                 |
| ----------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Unit              | Jest                         | `domain/`, `money`, conversion rules, and formatting. Derive every expected value from the requirement, not from the code under test. |
| Provider contract | Jest with recorded test data | One shared suite runs against every crypto adapter.                                                                                   |
| Component         | React Native Testing Library | Query by role and visible text. Cover loading, error, empty, and stale states.                                                        |
| End to end        | Maestro                      | Launch, search and watchlist, detail and range, converter, and settings with currency change                                          |
| Live smoke        | Script                       | Calls the live Binance, Kraken, and Frankfurter APIs. Run it before each release. CI does not run it.                                 |

Rules:

- Test behavior through the public interface. A test must fail when the behavior breaks and pass when only the internals change.
- Do not write snapshot tests.
- Do not assert that an internal function was called. What an external service receives is behavior and may be asserted.
- Start every bug fix with a failing test.
- The project has no coverage percentage target. Every requirement and every fixed bug has a test.

### Recorded test data

The repository is public, so recorded API data must not redistribute provider data. The recorder script trims each response to a few entries and replaces real values with synthetic ones. Commit only the output of that script. See [ADR 0012](../decisions/0012-public-repo-and-test-data.md).

## Security and privacy

- Do not put secrets in the app or the repository. Keyless data APIs need none. The Sentry DSN is public by design. The Sentry auth token is an EAS build secret.
- Use HTTPS and WSS only. Do not add cleartext exceptions on either platform.
- Configure Sentry for crash reports only, as [ADR 0009](../decisions/0009-sentry-crash-only.md) defines.
- Do not log personal data. Production builds have no `console` output.
- Commit the lock file. CI runs `npm audit` and fails on high-severity issues.
- Keep the App Store privacy label and the Google Play Data safety form in line with what the app collects: crash data only, not linked to identity.

## CI gates

Every push to a pull request runs these checks:

1. Type check
2. Lint, including import boundaries
3. Unit, contract, and component tests
4. `expo-doctor`
5. `npm audit` at high severity

Maestro flows run on the owner's iPhone 13 and Android 12 device before each release.

## Git workflow

- Work on short branches. Merge to `main` through a pull request after CI passes.
- Write conventional commit messages, such as `feat: add FX list`.
- Keep each commit small and single-purpose.
