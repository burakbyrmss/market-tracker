import type { PricePoint } from '@/domain/market';
import { decimal, div, mul, sub, toDisplayNumber } from '@/domain/money';

export type ChartBox = { width: number; height: number; padding: number };
export type Position = { x: number; y: number };

export type ChartGeometry = {
  path: string;
  positions: Position[];
  lowIndex: number;
  highIndex: number;
};

// Chart prices are plain numbers (docs/architecture/overview.md): they place pixels only.
// Points sit by time, not by index, so gaps (weekends in FX data) stay gaps.
export function chartGeometry(points: readonly PricePoint[], box: ChartBox): ChartGeometry | null {
  if (points.length < 2) return null;
  const values = points.map((point) => point.price);
  let lowIndex = 0;
  let highIndex = 0;
  values.forEach((value, index) => {
    if (value < (values[lowIndex] ?? value)) lowIndex = index;
    if (value > (values[highIndex] ?? value)) highIndex = index;
  });
  const low = values[lowIndex] ?? 0;
  const high = values[highIndex] ?? 0;
  const start = points[0]?.time ?? 0;
  const span = (points.at(-1)?.time ?? start) - start;
  const innerWidth = box.width - 2 * box.padding;
  const innerHeight = box.height - 2 * box.padding;

  const positions = points.map((point, index): Position => {
    const value = values[index] ?? low;
    return {
      x: box.padding + (span === 0 ? 0 : ((point.time - start) / span) * innerWidth),
      // A flat series draws through the middle instead of dividing by zero.
      y:
        box.padding +
        (high === low ? innerHeight / 2 : ((high - value) / (high - low)) * innerHeight),
    };
  });
  const path = positions
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  return { path, positions, lowIndex, highIndex };
}

// The point under a finger at `x`. Positions are sorted by x.
export function nearestIndex(positions: readonly Position[], x: number): number {
  let lo = 0;
  let hi = positions.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if ((positions[mid]?.x ?? 0) < x) lo = mid + 1;
    else hi = mid;
  }
  const before = positions[lo - 1];
  const at = positions[lo];
  if (before && at && x - before.x < at.x - x) return lo - 1;
  return lo;
}

// Percent change from the first to the last point, as 2.5 for 2.5 %. Null without a base.
export function rangeChange(points: readonly PricePoint[]): number | null {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return null;
  // Through domain/money, so 0.1 to 0.12 is exactly 20 %.
  const base = decimal(first.price);
  const ratio = div(sub(decimal(last.price), base), base);
  return ratio ? toDisplayNumber(mul(ratio, decimal(100))) : null;
}
