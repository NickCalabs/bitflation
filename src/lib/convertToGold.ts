import type { PricePoint, GoldPricePoint } from './types';

/**
 * Converts BTC/USD prices to BTC/gold-ounces.
 * goldOunces = btcPrice / goldPriceLocal
 */
export function convertToGold(
  prices: PricePoint[],
  goldPrices: Map<string, number>
): GoldPricePoint[] {
  const result: GoldPricePoint[] = [];

  for (const p of prices) {
    const goldPriceLocal = goldPrices.get(p.date);
    if (goldPriceLocal === undefined || goldPriceLocal <= 0) continue;

    result.push({
      date: p.date,
      nominalPrice: p.price,
      goldOunces: p.price / goldPriceLocal,
      goldPriceLocal,
    });
  }

  return result;
}
