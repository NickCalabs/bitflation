import type { PricePoint, AdjustedPricePoint } from './types';

/**
 * Adjusts nominal prices using a deflator (e.g., CPI).
 * adjustedPrice = nominalPrice × (deflatorAnchor / deflatorCurrent)
 *
 * deflatorAnchor is the average deflator value for the anchor year.
 */
export function adjustPrices(
  prices: PricePoint[],
  deflator: Map<string, number>,
  anchorYear: number
): AdjustedPricePoint[] {
  // Compute anchor deflator: average of all deflator values in anchor year
  const anchorValues: number[] = [];
  for (const [date, value] of deflator) {
    if (date.startsWith(String(anchorYear))) {
      anchorValues.push(value);
    }
  }

  if (anchorValues.length === 0) {
    // Fallback: return nominal prices as-is
    return prices.map((p) => ({
      date: p.date,
      nominalPrice: p.price,
      adjustedPrice: p.price,
    }));
  }

  const deflatorAnchor =
    anchorValues.reduce((sum, v) => sum + v, 0) / anchorValues.length;

  return prices
    .map((p) => {
      const deflatorCurrent = deflator.get(p.date);
      if (deflatorCurrent === undefined) return null;

      return {
        date: p.date,
        nominalPrice: p.price,
        adjustedPrice: p.price * (deflatorAnchor / deflatorCurrent),
      };
    })
    .filter((p): p is AdjustedPricePoint => p !== null);
}
