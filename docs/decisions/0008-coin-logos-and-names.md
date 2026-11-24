# 0008: Bundle CC0 coin logos and a name file

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Exchange APIs return tickers such as `BTC`, not full names or logos (assumption). CoinGecko logos need a brand kit request and a license. The Cryptocurrency Icons set by Christopher Downer is CC0 and covers about 483 established coins. It is no longer maintained (inferred).

## Decision

- During development, every coin shows a lettered circle.
- Before the V1 release (M14), bundle the CC0 icons for the coins they cover. Other coins keep the lettered circle.
- A script in `scripts/` builds the bundled name file and icon set. It fills names from the icon set's metadata where it has an entry. Names for the remaining top-100 coins are filled in by hand.
- The script output is committed. Running the script again must produce identical files.

## Implementation (M14)

- `npm run coin-assets` (`scripts/build-coin-assets.mjs`) reads `cryptocurrency-icons` 0.18.1, a pinned dev dependency, and `scripts/coin-assets/overrides.json`. It writes `assets/coins/*.png` and `src/features/coins/generated/`. CI runs it and fails if the committed files differ.
- Icons are the set's 64 px PNGs, drawn at 32 points. A list of 100 rows decodes PNGs more cheaply than it parses SVG markup, which matters for the low-end Android pass in M16. 476 icons, about 2 MB.
- `overrides.json` adds names the set lacks, corrects dated ones (`Filecoin [IOU]`, `Binance Coin`), and excludes entries whose ticker now means another coin (`AMP` was Synereo, now Flexa's Amp) or that are not coins.
- A coin without a name shows its ticker alone. A coin without an icon keeps the lettered circle.
- The exit check "every top-100 coin has a name" runs against the live APIs in `npm run smoke`, because the ranking changes daily.

## Alternatives considered

- **CoinGecko logos and names.** Licensing is unclear without a paid plan.
- **MIT-licensed icon packs.** They are an option if CC0 coverage proves too thin. MIT requires keeping the license notice.

## Consequences

- New coins have no logo until the set is extended by hand.
- The set is unmaintained. A ticker can be reused by a newer coin, and then the bundled icon shows the old one. Only `AMP` is known and excluded. Others are found by looking at the list.
- Hand-written names are not checked against a source. They need a look when a coin rebrands.
- No network call is needed for names or logos.

## Sources

- [Cryptocurrency Icons on libraries.io](https://libraries.io/npm/cryptocurrency-icons)
- [CoinGecko attribution guide](https://brand.coingecko.com/resources/attribution-guide)
