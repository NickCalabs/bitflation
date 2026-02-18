import type { PricePoint, DeflatorPoint } from './types';
import { interpolateMonthlyToDaily } from './interpolateCpi';

/**
 * Converts monthly PricePoint[] to daily PricePoint[] via linear interpolation.
 * Wrapper around interpolateMonthlyToDaily that adapts PricePoint ↔ DeflatorPoint.
 */
export function interpolatePricesToDaily(
  monthlyPrices: PricePoint[]
): PricePoint[] {
  // Convert PricePoint[] → DeflatorPoint[]
  const deflatorPoints: DeflatorPoint[] = monthlyPrices.map((p) => ({
    date: p.date,
    value: p.price,
  }));

  const dailyMap = interpolateMonthlyToDaily(deflatorPoints);

  // Convert Map back to sorted PricePoint[]
  const result: PricePoint[] = [];
  for (const [date, price] of dailyMap) {
    result.push({ date, price });
  }
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}
