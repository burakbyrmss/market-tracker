import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { parseAssetId, parseCurrencyCode, type AssetId, type CurrencyCode } from '@/domain/ids';
import { persistOptions } from '@/shared/storage';

export type WatchMarket = 'crypto' | 'fx';

// Ordered lists of our own IDs. V2 sync moves these IDs unchanged (docs/architecture/overview.md).
export type Watchlists = {
  crypto: AssetId[];
  fx: CurrencyCode[];
};

export const EMPTY_WATCHLISTS: Watchlists = { crypto: [], fx: [] };

// Keeps the valid, unique IDs of a stored list. One bad entry does not cost the user the rest.
function idList<Id extends string>(parse: (raw: string) => Id | null) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((items) => [
      ...new Set(items.flatMap((item) => (typeof item === 'string' ? (parse(item) ?? []) : []))),
    ]);
}

const watchlistsSchema = z.object({
  crypto: idList(parseAssetId),
  fx: idList(parseCurrencyCode),
});

function toggled<Id>(list: readonly Id[], id: Id): Id[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function moved<Id>(list: readonly Id[], from: number, to: number): Id[] {
  const item = list[from];
  if (item === undefined || to < 0 || to >= list.length) return [...list];
  const next = list.filter((_, index) => index !== from);
  next.splice(to, 0, item);
  return next;
}

type WatchlistState = Watchlists & {
  toggleCrypto: (id: AssetId) => void;
  toggleFx: (code: CurrencyCode) => void;
  move: (market: WatchMarket, from: number, to: number) => void;
};

export const useWatchlists = create<WatchlistState>()(
  persist(
    (set) => ({
      ...EMPTY_WATCHLISTS,
      toggleCrypto: (id) => set((state) => ({ crypto: toggled(state.crypto, id) })),
      toggleFx: (code) => set((state) => ({ fx: toggled(state.fx, code) })),
      move: (market, from, to) =>
        set((state) =>
          market === 'crypto'
            ? { crypto: moved(state.crypto, from, to) }
            : { fx: moved(state.fx, from, to) },
        ),
    }),
    persistOptions({
      name: 'watchlists',
      version: 1,
      schema: watchlistsSchema,
      pick: ({ crypto, fx }): Watchlists => ({ crypto, fx }),
    }),
  ),
);
