import type { PricePoint, DeflatorPoint } from './types';

/**
 * Merges static and live price data.
 * Live data wins on overlapping dates.
 * Result is sorted ascending by date.
 */
export function stitchPrices(
  staticPrices: PricePoint[],
  livePrices: PricePoint[]
): PricePoint[] {
  const map = new Map<string, number>();

  for (const p of staticPrices) {
    map.set(p.date, p.price);
  }

  // Live data overwrites static
  for (const p of livePrices) {
    map.set(p.date, p.price);
  }

  const merged: PricePoint[] = [];
  for (const [date, price] of map) {
    merged.push({ date, price });
  }

  merged.sort((a, b) => a.date.localeCompare(b.date));
  return merged;
}

/**
 * Merges static and live deflator data.
 * Live data wins on overlapping dates.
 * Result is sorted ascending by date.
 */
export function stitchDeflators(
  staticData: DeflatorPoint[],
  liveData: DeflatorPoint[]
): DeflatorPoint[] {
  const map = new Map<string, number>();

  for (const d of staticData) {
    map.set(d.date, d.value);
  }

  for (const d of liveData) {
    map.set(d.date, d.value);
  }

  const merged: DeflatorPoint[] = [];
  for (const [date, value] of map) {
    merged.push({ date, value });
  }

  merged.sort((a, b) => a.date.localeCompare(b.date));
  return merged;
}
