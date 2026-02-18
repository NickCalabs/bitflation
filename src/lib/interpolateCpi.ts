import type { DeflatorPoint } from './types';

/**
 * Linearly interpolates monthly CPI data to daily values.
 * Dates beyond the last data point hold the last known value.
 */
export function interpolateMonthlyToDaily(
  monthlyData: DeflatorPoint[]
): Map<string, number> {
  const daily = new Map<string, number>();

  if (monthlyData.length === 0) return daily;

  const sorted = [...monthlyData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const startTime = new Date(current.date).getTime();
    const endTime = new Date(next.date).getTime();
    const totalDays = Math.round((endTime - startTime) / 86_400_000);
    const valueDiff = next.value - current.value;

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(startTime + d * 86_400_000);
      const dateStr = date.toISOString().slice(0, 10);
      const fraction = d / totalDays;
      daily.set(dateStr, current.value + valueDiff * fraction);
    }
  }

  // Last month: hold flat from last data point onward for 90 days
  const last = sorted[sorted.length - 1];
  const lastTime = new Date(last.date).getTime();
  for (let d = 0; d <= 90; d++) {
    const date = new Date(lastTime + d * 86_400_000);
    const dateStr = date.toISOString().slice(0, 10);
    daily.set(dateStr, last.value);
  }

  return daily;
}
