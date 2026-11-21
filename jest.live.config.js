// Smoke tests against the live provider APIs. Run by hand with `npm run smoke`, never in CI:
// they depend on the network and on where the machine is (Binance answers HTTP 451 in some
// locations). Plain Node, without the jest-expo preset, whose React Native setup replaces fetch.

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/live/**/*.live.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testTimeout: 30_000,
};
