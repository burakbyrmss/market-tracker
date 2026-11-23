import type { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { readStored, writeStored } from '@/shared/storage';

// How long saved REST data is kept. Cached queries also stay in memory this long, so a screen
// opened offline still finds them.
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60_000;

// Charts add up: one entry per coin and range. Older entries beyond this are dropped.
export const MAX_SAVED_QUERIES = 60;

const KEY = 'query-cache.v1';
const SAVE_DELAY_MS = 2_000;

// How one family of queries is stored. `schema` reads the stored form back, so data that a
// newer or older app version wrote in another shape is dropped instead of reaching a screen.
export type PersistedQueries<Data> = {
  key: readonly string[];
  schema: z.ZodType<Data, unknown>;
  toStored: (data: Data) => unknown;
};

// Erases the data type, so families with different data fit in one list.
export function persisted<Data>(family: PersistedQueries<Data>): PersistedQueries<unknown> {
  return family as PersistedQueries<unknown>;
}

const savedSchema = z.array(
  z.object({ key: z.array(z.string()), updatedAt: z.number(), data: z.unknown() }),
);

type SavedQuery = z.infer<typeof savedSchema>[number];

function familyOf(families: readonly PersistedQueries<unknown>[], key: readonly unknown[]) {
  return families.find((family) => family.key.every((part, index) => key[index] === part));
}

// Puts saved queries back into the cache, then keeps saving it. Restored data keeps its old
// update time, so it is stale and refetches as soon as a screen uses it.
export function persistQueryCache(
  client: QueryClient,
  families: readonly PersistedQueries<unknown>[],
  now: () => number = Date.now,
): () => void {
  for (const family of families) {
    client.setQueryDefaults(family.key, { gcTime: OFFLINE_MAX_AGE_MS });
  }

  for (const saved of readStored(KEY, savedSchema) ?? []) {
    if (now() - saved.updatedAt > OFFLINE_MAX_AGE_MS) continue;
    const family = familyOf(families, saved.key);
    const data = family?.schema.safeParse(saved.data);
    if (data?.success) client.setQueryData(saved.key, data.data, { updatedAt: saved.updatedAt });
  }

  function save() {
    const entries: SavedQuery[] = [];
    for (const query of client.getQueryCache().getAll()) {
      const { data, dataUpdatedAt } = query.state;
      const family = familyOf(families, query.queryKey);
      if (!family || data === undefined || now() - dataUpdatedAt > OFFLINE_MAX_AGE_MS) continue;
      entries.push({
        key: query.queryKey.map(String),
        updatedAt: dataUpdatedAt,
        data: family.toStored(data),
      });
    }
    entries.sort((a, b) => b.updatedAt - a.updatedAt);
    writeStored(KEY, entries.slice(0, MAX_SAVED_QUERIES));
  }

  // A refetch of several charts or the FX list lands in one write.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    const changed =
      (event.type === 'updated' && event.action.type === 'success') || event.type === 'removed';
    if (!changed || !familyOf(families, event.query.queryKey) || timer) return;
    timer = setTimeout(() => {
      timer = null;
      save();
    }, SAVE_DELAY_MS);
  });

  return () => {
    unsubscribe();
    if (timer) {
      clearTimeout(timer);
      timer = null;
      save();
    }
  };
}
