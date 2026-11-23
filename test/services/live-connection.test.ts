import type { LiveUpdate } from '@/domain/market';
import type { LiveFeed } from '@/providers/contract';
import { createLiveConnection, SILENCE_LIMIT_MS } from '@/services/market-data/live-connection';

import { socketFactory } from './fake-socket';

const feed = (overrides: Partial<LiveFeed> = {}): LiveFeed => ({
  url: 'wss://example.test/live',
  subscribeMessages: ['subscribe'],
  maxAgeMs: null,
  parse: (message) => (message === 'tick' ? [{ assetId: 'BTC' } as LiveUpdate] : []),
  addAssets: () => [],
  ...overrides,
});

function setup(overrides: Partial<LiveFeed> = {}) {
  const factory = socketFactory();
  const onUpdates = jest.fn();
  // random() = 1 makes the jittered delay its upper bound: 1 s, 2 s, 4 s ...
  const connection = createLiveConnection({
    feed: feed(overrides),
    onUpdates,
    openSocket: factory.open,
    random: () => 1,
  });
  return { factory, onUpdates, connection };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('subscribes when the socket opens and passes on parsed updates', () => {
  const { factory, onUpdates, connection } = setup();
  connection.start();
  const socket = factory.latest();
  socket.serverOpens();
  expect(socket.sent).toEqual(['subscribe']);

  socket.serverSends('tick');
  socket.serverSends('heartbeat');
  expect(onUpdates).toHaveBeenCalledTimes(1);
  connection.stop();
});

test('reconnects with growing delays after the network drops', () => {
  const { factory, connection } = setup();
  connection.start();
  factory.latest().networkDrops();

  jest.advanceTimersByTime(999);
  expect(factory.sockets).toHaveLength(1);
  jest.advanceTimersByTime(1);
  expect(factory.sockets).toHaveLength(2);

  factory.latest().networkDrops();
  jest.advanceTimersByTime(1999);
  expect(factory.sockets).toHaveLength(2);
  jest.advanceTimersByTime(1);
  expect(factory.sockets).toHaveLength(3);
  connection.stop();
});

test('a working connection resets the delay', () => {
  const { factory, connection } = setup();
  connection.start();
  factory.latest().networkDrops();
  jest.advanceTimersByTime(1000);
  factory.latest().networkDrops();
  jest.advanceTimersByTime(2000);

  factory.latest().serverSends('tick');
  factory.latest().networkDrops();
  jest.advanceTimersByTime(1000);
  expect(factory.sockets).toHaveLength(4);
  connection.stop();
});

test('reconnects when the connection goes silent', () => {
  const { factory, connection } = setup();
  connection.start();
  const first = factory.latest();
  first.serverOpens();
  jest.advanceTimersByTime(SILENCE_LIMIT_MS);
  expect(first.closed).toBe(true);
  jest.advanceTimersByTime(1000);
  expect(factory.sockets).toHaveLength(2);
  connection.stop();
});

test('reconnects right away before the provider age limit', () => {
  const { factory, connection } = setup({ maxAgeMs: 30_000 });
  connection.start();
  const first = factory.latest();
  first.serverOpens();
  first.serverSends('tick');
  jest.advanceTimersByTime(30_000);
  expect(first.closed).toBe(true);
  expect(factory.sockets).toHaveLength(2);
  connection.stop();
});

test('stop closes the socket and never reconnects', () => {
  const { factory, connection } = setup();
  connection.start();
  const socket = factory.latest();
  connection.stop();
  expect(socket.closed).toBe(true);
  socket.networkDrops();
  jest.advanceTimersByTime(10 * 60_000);
  expect(factory.sockets).toHaveLength(1);
});

test('sends added subscriptions at once when open, and again after a reconnect', () => {
  const { factory, connection } = setup();
  connection.start();
  factory.latest().serverOpens();

  connection.send(['add ETH']);
  expect(factory.latest().sent).toEqual(['subscribe', 'add ETH']);

  factory.latest().networkDrops();
  jest.advanceTimersByTime(1_000);
  factory.latest().serverOpens();
  expect(factory.latest().sent).toEqual(['subscribe', 'add ETH']);
  connection.stop();
});

test('holds added subscriptions until the socket opens', () => {
  const { factory, connection } = setup();
  connection.start();
  connection.send(['add ETH']);
  expect(factory.latest().sent).toEqual([]);

  factory.latest().serverOpens();
  expect(factory.latest().sent).toEqual(['subscribe', 'add ETH']);
  connection.stop();
});
