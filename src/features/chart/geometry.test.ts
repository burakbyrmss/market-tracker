import type { PricePoint } from '@/domain/market';

import { chartGeometry, nearestIndex, rangeChange } from './geometry';

const series = (...pairs: [number, number][]): PricePoint[] =>
  pairs.map(([time, price]) => ({ time, price }));

const box = { width: 104, height: 54, padding: 2 };

test('places points by time and scales prices between low and high', () => {
  const geometry = chartGeometry(series([0, 10], [50, 20], [100, 15]), box);
  expect(geometry?.positions).toEqual([
    { x: 2, y: 52 },
    { x: 52, y: 2 },
    { x: 102, y: 27 },
  ]);
  expect(geometry?.path).toBe('M2.0 52.0 L52.0 2.0 L102.0 27.0');
  expect(geometry?.lowIndex).toBe(0);
  expect(geometry?.highIndex).toBe(1);
});

test('a gap in time stays a gap', () => {
  const geometry = chartGeometry(series([0, 1], [10, 2], [100, 3]), box);
  expect(geometry?.positions.map((p) => p.x)).toEqual([2, 12, 102]);
});

test('a flat series draws through the middle, and one point is no chart', () => {
  expect(chartGeometry(series([0, 5], [1, 5]), box)?.positions.map((p) => p.y)).toEqual([27, 27]);
  expect(chartGeometry(series([0, 5]), box)).toBeNull();
});

test('finds the point nearest a finger', () => {
  const positions = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 30, y: 0 },
  ];
  expect(nearestIndex(positions, -5)).toBe(0);
  expect(nearestIndex(positions, 4)).toBe(0);
  expect(nearestIndex(positions, 6)).toBe(1);
  expect(nearestIndex(positions, 21)).toBe(2);
  expect(nearestIndex(positions, 99)).toBe(2);
});

test('change over the range, exactly, from first to last', () => {
  expect(rangeChange(series([0, 0.1], [1, 0.3], [2, 0.12]))).toBe(20);
  expect(rangeChange(series([0, 0], [1, 1]))).toBeNull();
  expect(rangeChange(series([0, 1]))).toBeNull();
});
