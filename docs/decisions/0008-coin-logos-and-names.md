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

## Alternatives considered

- **CoinGecko logos and names.** Licensing is unclear without a paid plan.
- **MIT-licensed icon packs.** They are an option if CC0 coverage proves too thin. MIT requires keeping the license notice.

## Consequences

- New coins have no logo until the set is extended by hand.
- No network call is needed for names or logos.

## Sources

- [Cryptocurrency Icons on libraries.io](https://libraries.io/npm/cryptocurrency-icons)
- [CoinGecko attribution guide](https://brand.coingecko.com/resources/attribution-guide)
