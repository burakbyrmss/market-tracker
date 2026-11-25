# Accessibility and translations

The rules behind M15. Lint and tests check what they can. The rest is a manual pass on a device.

## Checked automatically

- **Untranslated text.** `no-restricted-syntax` in `eslint.config.js` fails on letters written straight into JSX: text, `{'literals'}`, conditionals, templates, and props a screen reader reads (`accessibilityLabel`, `placeholder`, `title`, and others). `test/lint/untranslated-text.test.ts` proves the rule catches each case.
- **Missing Turkish.** The compiler rejects a key that is in `en.json` but not in `tr.json`. `test/shared/locales.test.ts` fails on English copied into `tr.json` and on placeholders that differ between the languages. A string that really reads the same in both goes on its `SAME_IN_BOTH` list.
- **Labels.** RNTL tests find controls by role and name, so a missing label fails a test.

## Rules for new UI

- **Large text.** Rows, headers, and buttons take a minimum height (`min-h-16`, `min-h-12`, `min-h-11`), never a fixed `h-*` around text, so text up to the largest system size is not clipped. Only decorative glyphs cap their scale (`maxFontSizeMultiplier`).
- **Touch targets.** At least 44 by 44 points: `h-11 w-11` or `min-h-11`, with `hitSlop` for small glyphs.
- **Contrast.** Text meets 4.5:1 in both themes. Pairs that do: `text-gray-500 dark:text-gray-400`, `text-red-600 dark:text-red-400`, `text-green-700 dark:text-green-500`, `text-blue-600 dark:text-blue-400`. Plain `text-green-600` is 3.3:1 on white, and `text-gray-500` is 4.3:1 on black.
- **Screen readers.** A pressable has a role and a name. A row that reads as one item is one accessible element with a label that says the name, the price, and the change. Logos and letter circles are hidden: the label already names the coin. State goes in `accessibilityState` (selected tab, checked radio, starred coin), not only in color.

## Manual pass (M15 exit check)

On a preview or development build, once with VoiceOver on iOS and once with TalkBack on Android. Repeat the large-text and theme steps in Turkish.

1. Markets: swipe through the header, the tabs, and five rows. Each row says the coin name, ticker, price, and change. The tab says it is selected.
2. Open a coin. The header, the price, the method lines, and the chart summary are read. Range tabs say which is selected.
3. Search "bitcoin", star it, and go to the watchlist. The star button says add or remove, and its state.
4. Converter: both unit buttons say what they hold. Swap says what it does.
5. Settings: theme, language, and currency are read as radio buttons with their checked state.
6. Largest text size (iOS Settings → Accessibility → Larger Text at maximum; Android font size and display size at maximum). Every screen above: no text cut off or overlapping, and the header links wrap.
7. Dark and light theme: every screen above stays readable, including the offline notice (airplane mode).
