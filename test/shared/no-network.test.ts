// The guard in test/setup.ts: a test that reaches the network fails at once and names the URL.
test('fetch in a test fails at once with the URL', async () => {
  await expect(fetch('https://api.example.test/prices')).rejects.toThrow(
    'Test tried to fetch https://api.example.test/prices',
  );
}, 1_000);
