import type { SocketLike } from '@/services/market-data/live-connection';

export class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(readonly url: string) {}

  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }

  // Test controls: what the server or network does.
  serverOpens() {
    this.onopen?.();
  }
  serverSends(data: unknown) {
    this.onmessage?.({ data });
  }
  networkDrops() {
    this.onclose?.();
  }
}

export function socketFactory() {
  const sockets: FakeSocket[] = [];
  return {
    sockets,
    open: (url: string) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    latest: () => {
      const socket = sockets.at(-1);
      if (!socket) throw new Error('No socket opened');
      return socket;
    },
  };
}
