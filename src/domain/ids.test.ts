import { parseAssetId, parseCurrencyCode } from './ids';

describe('ids', () => {
  test('accepts asset tickers in our format', () => {
    expect(parseAssetId('BTC')).toBe('BTC');
    expect(parseAssetId('1INCH')).toBe('1INCH');
  });

  test('rejects provider pair symbols and lowercase tickers', () => {
    expect(parseAssetId('btc')).toBeNull();
    expect(parseAssetId('BTC/USD')).toBeNull();
    expect(parseAssetId('')).toBeNull();
  });

  test('accepts only three-letter uppercase currency codes', () => {
    expect(parseCurrencyCode('TRY')).toBe('TRY');
    expect(parseCurrencyCode('try')).toBeNull();
    expect(parseCurrencyCode('USDT')).toBeNull();
  });
});
