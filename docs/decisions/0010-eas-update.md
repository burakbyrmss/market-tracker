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
