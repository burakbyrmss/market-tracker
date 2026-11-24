import { createMMKV } from 'react-native-mmkv';
import type { z } from 'zod';
import { createJSONStorage, type PersistOptions } from 'zustand/middleware';

// One MMKV file for the app. Reads are synchronous, so persisted stores are ready before the first render.
export const storage = createMMKV({ id: 'market-tracker' });

function mmkvJsonStorage<Persisted>() {
  return createJSONStorage<Persisted>(() => ({
    getItem: (name: string) => storage.getString(name) ?? null,
    setItem: (name: string, value: string) => storage.set(name, value),
    removeItem: (name: string) => {
      storage.remove(name);
    },
  }));
}

// Persist options for a Zustand store. Stored data may come from an older app version or a
// damaged file, so it passes through `schema` before it reaches the store. Data that fails to
// parse is dropped and the store keeps its defaults.
export function persistOptions<State extends Persisted, Persisted extends object>(options: {
  name: string;
  version: number;
  schema: z.ZodType<Persisted>;
  pick: (state: State) => Persisted;
}): PersistOptions<State, Persisted> {
  const jsonStorage = mmkvJsonStorage<Persisted>();
  return {
    name: options.name,
    version: options.version,
    ...(jsonStorage ? { storage: jsonStorage } : {}),
    partialize: options.pick,
    merge: (persisted, current) => {
      const parsed = options.schema.safeParse(persisted);
      return parsed.success ? { ...current, ...parsed.data } : current;
    },
  };
}

// A stored JSON value checked against `schema`. Missing, unreadable, or invalid data reads as
// null, as if nothing was stored: it may come from an older app version or a damaged file.
export function readStored<Value>(key: string, schema: z.ZodType<Value>): Value | null {
  const raw = storage.getString(key);
  if (raw === undefined) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function writeStored(key: string, value: unknown) {
  storage.set(key, JSON.stringify(value));
}
