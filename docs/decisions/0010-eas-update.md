# 0010: Enable EAS Update for JavaScript fixes

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

A solo developer needs a fast way to fix a JavaScript bug in production without waiting for store review.

## Decision

Enable EAS Update at M16. Set up code signing for updates. Use runtime versions so an update reaches only builds with matching native code.

## Alternatives considered

- **Store releases only.** Every fix waits for review.

## Consequences

- One more release path to test. Each update goes to the preview channel first.
- Native changes still need a store release.

## Implementation (M16)

- `expo-updates` with `updates.url` for project `7d038f66-…` and the `fingerprint` runtime version policy, so an update reaches only builds whose native code matches.
- Channels: the `preview` build profile uses channel `preview`, `production` uses `production`. Publish with `eas update --channel preview --environment preview` first.
- **Code signing is not set up.** Expo offers update code signing only on the EAS Production and Enterprise plans (https://docs.expo.dev/eas-update/code-signing/). Updates are still served over HTTPS from Expo. Turning signing on later needs a new build with a new runtime version.
