# 0009: Use Sentry for crash reports only

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

A public app needs crash visibility. The owner requires a privacy-conscious setup with no analytics, no session replay, and no unnecessary personal data.

## Decision

Add Sentry at M16 with these settings:

- `sendDefaultPii: false`
- No session replay
- No performance tracing
- No user ID or user context
- No screenshot or view hierarchy attachments
- Data scrubbing on

The Sentry DSN ships in the app, which is normal for Sentry. The Sentry auth token for source map upload is an EAS build secret and never enters the app or the repository.

## Consequences

- The App Store privacy label declares crash data, not linked to identity. The Google Play Data safety form declares the same.
- Crash reports have less context. Release and build tags still identify the version.
