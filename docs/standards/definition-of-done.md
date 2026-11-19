# Definition of Done

A task is done when it meets every item in the task checklist. A version ships to the stores when it meets every item in the production gate.

## Task checklist

1. The acceptance criteria are met and shown on a real device. Check UI changes on both the iPhone 13 and the Android 12 device.
2. Tests cover the new or changed behavior. A bug fix starts with a failing test.
3. CI passes.
4. Every affected screen handles loading, error, empty, and offline or stale states.
5. Every new string exists in English and Turkish. Prices and controls have screen reader labels. The screen works in light mode, dark mode, and with large text.
6. The change adds no lint suppressions, no `any`, and no import-boundary violations.
7. The docs reflect the change. A new decision has an ADR. A changed architecture updates `docs/architecture/`.
8. The commits are small and single-purpose.

## Production gate for each version

V1, V1.5, and V2 each pass this gate before a store release.

1. Every milestone exit check for the version has passed.
2. All Maestro flows pass on the iPhone 13 and the Android 12 device. From V1 on, they also pass on one low-end Android device.
3. The performance limits recorded at M2 hold on the low-end Android device.
4. The live smoke script passes against the real APIs.
5. Data licensing is resolved and recorded in [ADR 0007](../decisions/0007-data-licensing-release-gate.md).
6. The privacy policy is live at its public URL. The App Store privacy label and the Google Play Data safety form match it.
7. Internal testing on TestFlight and the Play internal track has run for at least 7 days with no unresolved crash in Sentry.
8. The rollout uses phased release on iOS and staged rollout on Android. The steps to halt each rollout are written down.
9. The version number, release notes, and changelog are updated.
