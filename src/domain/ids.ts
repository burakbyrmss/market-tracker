// Our own identifiers. Provider symbols (BTCUSDT, XBT) never leave the provider adapters.
export type AssetId = string & { readonly __brand: 'AssetId' };
export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

const ASSET_ID = /^[A-Z0-9]{1,20}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

export function parseAssetId(raw: string): AssetId | null {
  return ASSET_ID.test(raw) ? (raw as AssetId) : null;
}

export function parseCurrencyCode(raw: string): CurrencyCode | null {
  return CURRENCY_CODE.test(raw) ? (raw as CurrencyCode) : null;
}

export const DISPLAY_CURRENCIES = ['USD', 'EUR', 'TRY'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export function displayCurrencyCode(currency: DisplayCurrency): CurrencyCode {
  return currency as CurrencyCode;
}
