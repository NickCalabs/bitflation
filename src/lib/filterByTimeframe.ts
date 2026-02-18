import type { Timeframe } from './types';

/**
 * Filters data with a `date` field to the selected timeframe.
 */
export function filterByTimeframe<T extends { date: string }>(
  data: T[],
  timeframe: Timeframe
): T[] {
  if (timeframe === 'ALL' || data.length === 0) return data;

  const lastDate = new Date(data[data.length - 1].date);
  let cutoff: Date;

  if (timeframe === '1Y') {
    cutoff = new Date(lastDate);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  } else {
    // 5Y
    cutoff = new Date(lastDate);
    cutoff.setFullYear(cutoff.getFullYear() - 5);
  }

  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.filter((d) => d.date >= cutoffStr);
}
