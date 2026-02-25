import type { PricePoint, CalculatorResult } from './types';

/**
 * Find the value for a date, falling back to the closest prior date
 * when an exact match doesn't exist (e.g. monthly data with daily queries).
 */
function findNearest(map: Map<string, number>, targetDate: string): number | undefined {
  const exact = map.get(targetDate);
  if (exact !== undefined) return exact;
  let best: string | undefined;
  for (const key of map.keys()) {
    if (key <= targetDate && (!best || key > best)) best = key;
  }
  return best ? map.get(best) : undefined;
}

/**
 * Computes real returns for a BTC investment.
 * Returns null if the purchase date is before data range.
 */
export function calculateReturns(
  purchaseDate: string,
  investmentAmount: number,
  prices: PricePoint[],
  cpiMap: Map<string, number>,
  m2Map: Map<string, number>,
  goldMap: Map<string, number>
): CalculatorResult | null {
  if (prices.length === 0) return null;

  // Find BTC price on or after purchase date
  const entry = prices.find((p) => p.date >= purchaseDate);
  if (!entry) return null;

  const latest = prices[prices.length - 1];
  const btcPriceThen = entry.price;
  const btcPriceNow = latest.price;
  const btcAmount = investmentAmount / btcPriceThen;

  // Nominal
  const nominalValue = btcAmount * btcPriceNow;
  const nominalReturn = (nominalValue - investmentAmount) / investmentAmount;

  // CPI-adjusted
  const cpiThen = findNearest(cpiMap, entry.date);
  const cpiNow = findNearest(cpiMap, latest.date);
  const cpiRatio = cpiThen && cpiNow ? cpiThen / cpiNow : 1;
  const cpiAdjustedValue = nominalValue * cpiRatio;
  const cpiAdjustedReturn = (cpiAdjustedValue - investmentAmount) / investmentAmount;

  // M2-adjusted
  const m2Then = findNearest(m2Map, entry.date);
  const m2Now = findNearest(m2Map, latest.date);
  const m2Ratio = m2Then && m2Now ? m2Then / m2Now : 1;
  const m2AdjustedValue = nominalValue * m2Ratio;
  const m2AdjustedReturn = (m2AdjustedValue - investmentAmount) / investmentAmount;

  // Gold
  const goldThen = findNearest(goldMap, entry.date);
  const goldNow = findNearest(goldMap, latest.date);
  const goldOuncesThen = goldThen ? investmentAmount / goldThen : 0;
  const goldOuncesNow = goldNow ? nominalValue / goldNow : 0;
  const goldReturn = goldOuncesThen > 0 ? (goldOuncesNow - goldOuncesThen) / goldOuncesThen : 0;

  return {
    purchaseDate: entry.date,
    investmentAmount,
    btcAmount,
    btcPriceThen,
    btcPriceNow,
    nominalValue,
    nominalReturn,
    cpiAdjustedValue,
    cpiAdjustedReturn,
    m2AdjustedValue,
    m2AdjustedReturn,
    goldOuncesThen,
    goldOuncesNow,
    goldReturn,
  };
}
