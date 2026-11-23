import { search } from './search';

const items = [
  { id: 'ETH', terms: ['ETH'] },
  { id: 'BTC', terms: ['BTC'] },
  { id: 'WBTC', terms: ['WBTC'] },
  { id: 'BTCB', terms: ['BTCB'] },
  { id: 'TRY', terms: ['TRY', 'Türk lirası'] },
  { id: 'USD', terms: ['USD', 'US dollar'] },
];

test('ranks exact, then prefix, then contains', () => {
  expect(search(items, 'btc', 10)).toEqual(['BTC', 'BTCB', 'WBTC']);
});

test('finds a currency by any word of its name, ignoring case and accents', () => {
  expect(search(items, 'LIRASI', 10)).toEqual(['TRY']);
  expect(search(items, 'turk', 10)).toEqual(['TRY']);
  expect(search(items, 'dollar', 10)).toEqual(['USD']);
});

test('equal matches keep the input order', () => {
  expect(search(items, 't', 10)).toEqual(['TRY', 'ETH', 'BTC', 'WBTC', 'BTCB']);
});

test('an empty query finds nothing, and the limit holds', () => {
  expect(search(items, '  ', 10)).toEqual([]);
  expect(search(items, 'b', 2)).toEqual(['BTC', 'BTCB']);
});
