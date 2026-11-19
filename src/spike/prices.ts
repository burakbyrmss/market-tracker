// THROWAWAY M2 spike code. Never merge.
import { useEffect } from 'react';
import { create } from 'zustand';

export const ROW_IDS = Array.from({ length: 100 }, (_, i) => `COIN${i + 1}`);

type PriceState = { prices: Record<string, number>; changes: Record<string, number> };

const initial = Object.fromEntries(ROW_IDS.map((id, i) => [id, 1000 / (i + 1)]));

export const usePriceStore = create<PriceState>(() => ({
  prices: initial,
  changes: Object.fromEntries(ROW_IDS.map((id) => [id, 0])),
}));

// Mimics Binance !miniTicker@arr: every second, every price changes at once.
export function useFakeTicker(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const { prices } = usePriceStore.getState();
      const next: Record<string, number> = {};
      const changes: Record<string, number> = {};
      for (const key of ROW_IDS) {
        const delta = (Math.random() - 0.5) * 0.004;
        next[key] = (prices[key] ?? 1) * (1 + delta);
        changes[key] = delta * 100;
      }
      usePriceStore.setState({ prices: next, changes });
    }, 1000);
    return () => clearInterval(id);
  }, [enabled]);
}

export function makeYear() {
  let price = 50000;
  return Array.from({ length: 365 }, (_, day) => {
    price *= 1 + (Math.random() - 0.5) * 0.06;
    return { day, price };
  });
}
