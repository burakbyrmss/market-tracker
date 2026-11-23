import type { CurrencyCode } from '@/domain/ids';
import { toDisplayNumber, type Decimal } from '@/domain/money';

// Prices of 1 or more show 2 decimals. Smaller prices keep 4 significant digits so a coin
// worth 0.00001234 does not display as 0.00.
function priceDigits(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1 || abs === 0) return { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const leadingZeros = Math.floor(-Math.log10(abs));
  const digits = Math.min(leadingZeros + 4, 10);
  return { minimumFractionDigits: 2, maximumFractionDigits: digits };
}

export function formatPrice(value: Decimal, currency: CurrencyCode, locale: string): string {
  const n = toDisplayNumber(value);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...priceDigits(n),
  }).format(n);
}

// `percent` is a percentage, so 2.5 means 2.5 %.
export function formatPercentChange(percent: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100);
}

export function formatFxRate(value: Decimal, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(toDisplayNumber(value));
}

// `isoDate` is a calendar date (YYYY-MM-DD), such as an ECB publication date. UTC keeps it from
// shifting a day in time zones west of UTC.
export function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

// A chart point's time. Intraday ranges show the time of day. FX points are ECB dates at
// midnight UTC, so `utc` keeps them on their own day.
export function formatChartTime(
  ms: number,
  locale: string,
  { withTime, utc }: { withTime: boolean; utc: boolean },
): string {
  return new Intl.DateTimeFormat(locale, {
    ...(withTime
      ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { dateStyle: 'medium' }),
    ...(utc ? { timeZone: 'UTC' } : {}),
  }).format(new Date(ms));
}

// A coin amount: up to 8 decimal places (one satoshi), without trailing zeros.
export function formatCryptoAmount(value: Decimal, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }).format(toDisplayNumber(value));
}
