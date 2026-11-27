// Nitro loads its native module on import. Jest has no native side, and react-native-mmkv
// already swaps in its in-memory mock under Jest, so Nitro only needs to import cleanly.
jest.mock('react-native-nitro-modules', () => ({ NitroModules: {} }));

// FlashList measures its container. Jest has no layout, so it uses fixed sizes.
require('@shopify/flash-list/jestSetup');

// Tests never use the network. A query a test forgot to seed fails at once, with the URL,
// instead of waiting on React Native's mock fetch, which never answers and left Jest hanging.
globalThis.fetch = async (input: RequestInfo | URL) => {
  throw new Error(`Test tried to fetch ${String(input)}. Seed the query or pass a fake fetch.`);
};
