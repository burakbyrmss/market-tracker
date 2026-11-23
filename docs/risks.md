# Risks and open questions

Review this file at the start of each milestone. Close an item by recording the outcome and the source.

## Risks

| Risk                                                                                                                                                                    | Impact                                                             | Mitigation                                                                                                                      | Owner milestone |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| No written data license from Binance or Kraken by release                                                                                                               | The V1 store release is blocked                                    | Licensing emails are drafted but not sent. Send them early, because replies take time. Option C in ADR 0007 is the fallback.    | M1, M16         |
| Kraken terms not confirmed from Kraken's own pages                                                                                                                      | The fallback provider might be unusable                            | Read Kraken's legal pages before building its adapter                                                                           | M5              |
| Binance and Kraken report different 24-hour volumes                                                                                                                     | The top-100 list differs by provider                               | Document the behavior. The list follows the active provider.                                                                    | M7              |
| No Dutch or US IP available for local testing                                                                                                                           | The fallback is not tested against a real block                    | Unit tests force HTTP 451. Run a VPN smoke test before release.                                                                 | M6, M16         |
| Chart and list performance is not measured on any device. The chart library (ADR 0015, `react-native-svg`) builds for Android on the EAS free tier but is not measured. | Charts or lists stutter, or Android development builds break again | ADR 0015 acceptance check 2: Perf Monitor while scrubbing on devices. M16 measures the market list on a low-end Android device. | M11, M16        |
| The CC0 icon set is unmaintained                                                                                                                                        | Newer coins have no logo                                           | Lettered circles cover missing logos                                                                                            | M14             |
| A provider changes its API, limits, or terms                                                                                                                            | Data stops loading                                                 | Run the live smoke script before each release. The provider contract allows a swap.                                             | Each release    |
| USDT drifts from USD                                                                                                                                                    | Converted prices are slightly off                                  | The detail screen shows the conversion method                                                                                   | M9              |
| Hermes formats numbers differently from Node, which runs the formatting tests                                                                                           | Prices show wrong separators or symbols on a phone                 | Check formatted prices in English and Turkish on both devices when M7 shows real prices                                         | M7              |

## Open questions

| Question                                                                          | Label       | Resolve by |
| --------------------------------------------------------------------------------- | ----------- | ---------- |
| Does Binance offer a market-data-only WebSocket host?                             | Assumption  | M6         |
| What are Kraken's exact public rate limits?                                       | Assumption  | M5         |
| What do the ECB data terms allow for caching and display?                         | Not settled | M8         |
| Does the CC0 icon set's metadata provide full coin names?                         | Assumption  | M14        |
| Does Binance or Kraken grant written permission for display in a free public app? | Not settled | M16        |
| Which device is the low-end Android test device?                                  | Open        | M16        |
