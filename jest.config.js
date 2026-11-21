const expoPreset = require('jest-expo/jest-preset');

// nitro-core (loaded by react-native-mmkv) and FlashList ship ES modules, so Jest transforms them too.
const [nodeModules, ...otherIgnores] = expoPreset.transformIgnorePatterns;

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}', '<rootDir>/test/**/*.test.{ts,tsx}'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transformIgnorePatterns: [
    nodeModules.replace('(?!(', '(?!(nitro-core|@shopify/flash-list|'),
    ...otherIgnores,
  ],
};
