# 0014: Style with NativeWind 4 and wrap screens in safe areas

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The owner asked to replace `StyleSheet` with NativeWind. On npm, the `latest` tag of `nativewind` is 4.2.7, which requires Tailwind CSS 3 (confirmed). NativeWind 5 is a release candidate (`5.0.0-rc.1`) on Tailwind CSS 4. Its docs say that version 4 remains the stable release (confirmed).

Screens also ran under the status bar and the home indicator. The owner asked for `SafeAreaView`.

## Decision

- Use NativeWind 4.2.7 with Tailwind CSS 3.4. Style every component with `className`.
- Do not use `StyleSheet` or inline `style` objects. An ESLint rule bans `StyleSheet` imports from `react-native`.
- Props that are not styles stay as props. Examples are Skia and Victory Native colors and stroke widths.
- `src/shared/ui/screen.tsx` exports `Screen`, which wraps `SafeAreaView` from `react-native-safe-area-context`. Every route renders inside `Screen`.
- The root stack hides the native header. Each screen owns its own top area inside `Screen`.
- Register each third-party component that takes `className` with `cssInterop` in `src/shared/ui/interop.ts`, once.
- `prettier-plugin-tailwindcss` sorts class names.

## Alternatives considered

- **NativeWind 5 release candidate.** Its maintainers do not recommend it for production. Move to version 5 when it reaches the `latest` tag, in a new ADR.
- **Keep `StyleSheet`.** The owner chose NativeWind.
- **Unistyles or Tamagui.** Not requested, and each adds its own build setup.

## Consequences

- Dark mode uses the `dark:` variant.
- `babel.config.js`, `metro.config.js`, `tailwind.config.js`, and `src/global.css` are now part of the build.
- Upgrading to NativeWind 5 means a move to Tailwind CSS 4 and new configuration.

## Sources

- [NativeWind v5 installation](https://www.nativewind.dev/v5/getting-started/installation)
- [NativeWind versions guide](https://www.issoh.co.jp/md/tech/9630)
