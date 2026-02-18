import type { PricePoint, GoldPricePoint } from './types';

/**
 * Converts BTC/USD prices to BTC/gold-ounces.
 * goldOunces = btcPrice / goldPriceUsd
 */
export function convertToGold(
  prices: PricePoint[],
  goldPrices: Map<string, number>
): GoldPricePoint[] {
  const result: GoldPricePoint[] = [];

  for (const p of prices) {
    const goldPriceUsd = goldPrices.get(p.date);
    if (goldPriceUsd === undefined || goldPriceUsd <= 0) continue;

    result.push({
      date: p.date,
      nominalPrice: p.price,
      goldOunces: p.price / goldPriceUsd,
      goldPriceUsd,
    });
  }

  return result;
}
