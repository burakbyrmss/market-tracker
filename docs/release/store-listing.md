# Store listings and privacy answers

**Draft.** The owner enters these in App Store Connect and Play Console. Items marked **TODO** need the owner.

## Listing

|                              | English                                                                  | Türkçe                                                                        |
| ---------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Name                         | Market Tracker                                                           | Market Tracker                                                                |
| Subtitle (iOS, 30)           | Crypto and currency prices                                               | Kripto ve döviz fiyatları                                                     |
| Short description (Play, 80) | Live crypto prices, exchange rates, charts, and a converter. No account. | Canlı kripto fiyatları, döviz kurları, grafikler ve çevirici. Hesap gerekmez. |
| Category                     | Finance                                                                  | Finans                                                                        |

**Description (English)**

Follow cryptocurrency and currency markets in one simple app.

- Live prices for hundreds of coins, ranked by trading volume
- European Central Bank reference rates for over 30 currencies
- Charts from one day to five years
- A converter between any coin and currency
- Watchlists for the coins and currencies you follow
- Prices in US dollars, euros, or Turkish lira
- Works offline with the last saved prices
- English and Turkish, light and dark theme

No account, no ads, no tracking. Every price shows its source.

Market Tracker is for information only and is not investment advice.

**Açıklama (Türkçe)**

Kripto para ve döviz piyasalarını tek, sade bir uygulamada takip edin.

- İşlem hacmine göre sıralanmış yüzlerce coin için canlı fiyatlar
- 30'dan fazla para birimi için Avrupa Merkez Bankası referans kurları
- Bir günden beş yıla kadar grafikler
- Herhangi bir coin ve para birimi arasında çevirici
- Takip ettiğiniz coin ve para birimleri için izleme listeleri
- ABD doları, euro veya Türk lirası cinsinden fiyatlar
- Son kaydedilen fiyatlarla çevrimdışı çalışır
- Türkçe ve İngilizce, açık ve koyu tema

Hesap yok, reklam yok, takip yok. Her fiyat kaynağını gösterir.

Market Tracker yalnızca bilgi amaçlıdır, yatırım tavsiyesi değildir.

**Keywords (iOS, 100 characters):** `crypto,bitcoin,price,exchange rate,currency,converter,watchlist,chart,euro,lira`

**URLs:** support: `https://github.com/burakbyrmss/market-tracker/issues`. Privacy policy: TODO (the GitHub Pages URL).

**Before submitting, check:**

- **Feature list:** every feature above is in the build being submitted.
- **Currency count:** the "over 30 currencies" figure matches today's ECB list.

## App Store privacy label

- **Tracking:** No. The app does not track users.
- **Data linked to you:** none.
- **Data not linked to you:** Diagnostics → Crash Data. Purpose: App Functionality.
- **Everything else:** not collected. That covers contact info, identifiers, usage data, location and the other categories.

Apple counts data that a third-party SDK collects (Sentry here), which is why crash data is declared.

## Google Play Data safety

- **Does the app collect or share user data?** Yes, it collects data. It shares none: Sentry processes crash data on our behalf as a service provider, which Play does not count as sharing.
- **Data type:** App info and performance → Crash logs.
  - Collected: yes.
  - Shared: no.
  - Processed ephemerally: no.
  - Required: yes. There is no switch in the app.
  - Purpose: App functionality.
- **Encrypted in transit:** yes (HTTPS only).
- **Users can request deletion:** TODO. The answer depends on the privacy contact and Sentry's retention.
- **Diagnostics:** TODO. Decide whether Play's Diagnostics type also applies, since crash reports carry the device model and OS version.

## Other forms

- **Play financial features declaration:** the app shows market data only. It offers no trading, wallet, exchange, loans or payments.
- **Play content rating questionnaire and App Store age rating:** no objectionable content. The app has no user-generated content and no gambling.
- **App Store export compliance:** `ITSAppUsesNonExemptEncryption` is false in `app.json`, because the app uses HTTPS only.
