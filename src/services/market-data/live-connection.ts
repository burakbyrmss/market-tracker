import type { LiveUpdate } from '@/domain/market';
import type { LiveFeed } from '@/providers/contract';

// The subset of the WebSocket API the connection uses, so tests can pass a fake.
export type SocketLike = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
};

export type LiveConnectionOptions = {
  feed: LiveFeed;
  onUpdates: (updates: LiveUpdate[]) => void;
  // The connection failed and will retry. Prices on screen stop updating until a message arrives.
  onDisconnect?: () => void;
  openSocket?: (url: string) => SocketLike;
  random?: () => number;
};

// Both providers send at least one message a second (Binance ticks, Kraken heartbeats). A minute of
// silence means the connection is dead even if the socket has not noticed.
export const SILENCE_LIMIT_MS = 60_000;
// Reconnect delay grows 1 s, 2 s, 4 s ... up to 60 s, with full jitter so many phones do not
// reconnect in step. Kraken bans an IP for 10 minutes after about 150 reconnects in 10 minutes.
export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_CAP_MS = 60_000;

export type LiveConnection = {
  start(): void;
  stop(): void;
  // Sends messages now if the socket is open, and again after every reconnect.
  send(messages: readonly string[]): void;
};

export function createLiveConnection(options: LiveConnectionOptions): LiveConnection {
  const { feed, onUpdates } = options;
  const openSocket =
    options.openSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
  const random = options.random ?? Math.random;

  let socket: SocketLike | null = null;
  // The socket once it has opened. Messages sent before then wait for onopen.
  let openedSocket: SocketLike | null = null;
  const added: string[] = [];
  let running = false;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let ageTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers() {
    for (const timer of [reconnectTimer, silenceTimer, ageTimer]) {
      if (timer) clearTimeout(timer);
    }
    reconnectTimer = silenceTimer = ageTimer = null;
  }

  function dropSocket() {
    if (!socket) return;
    const old = socket;
    socket = null;
    openedSocket = null;
    old.onopen = old.onmessage = old.onclose = old.onerror = null;
    old.close();
  }

  function watchSilence() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => reconnectLater(), SILENCE_LIMIT_MS);
  }

  function reconnectLater() {
    clearTimers();
    dropSocket();
    if (!running) return;
    options.onDisconnect?.();
    const delay = random() * Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** attempt);
    attempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect() {
    reconnectTimer = null;
    if (!running) return;
    const next = openSocket(feed.url);
    socket = next;

    next.onopen = () => {
      openedSocket = next;
      for (const message of [...feed.subscribeMessages, ...added]) next.send(message);
      if (feed.maxAgeMs !== null) {
        // A planned reconnect, not a failure, so it skips the backoff.
        ageTimer = setTimeout(() => {
          clearTimers();
          dropSocket();
          connect();
        }, feed.maxAgeMs);
      }
    };
    next.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      // A message proves the connection works, so the next failure starts the backoff over.
      attempt = 0;
      watchSilence();
      const updates = feed.parse(event.data);
      if (updates.length > 0) onUpdates(updates);
    };
    next.onclose = () => reconnectLater();
    next.onerror = () => reconnectLater();
    watchSilence();
  }

  return {
    start() {
      if (running) return;
      running = true;
      attempt = 0;
      connect();
    },
    stop() {
      running = false;
      clearTimers();
      dropSocket();
    },
    send(messages) {
      added.push(...messages);
      if (openedSocket) for (const message of messages) openedSocket.send(message);
    },
  };
}
