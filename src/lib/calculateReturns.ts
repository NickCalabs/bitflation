import type { PricePoint, CalculatorResult } from './types';

/**
 * Computes real returns for a BTC investment.
 * Returns null if the purchase date is before data range.
 */
export function calculateReturns(
  purchaseDate: string,
  investmentUsd: number,
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
  const btcAmount = investmentUsd / btcPriceThen;

  // Nominal
  const nominalValue = btcAmount * btcPriceNow;
  const nominalReturn = (nominalValue - investmentUsd) / investmentUsd;

  // CPI-adjusted
  const cpiThen = cpiMap.get(entry.date);
  const cpiNow = cpiMap.get(latest.date);
  const cpiRatio = cpiThen && cpiNow ? cpiThen / cpiNow : 1;
  const cpiAdjustedValue = nominalValue * cpiRatio;
  const cpiAdjustedReturn = (cpiAdjustedValue - investmentUsd) / investmentUsd;

  // M2-adjusted
  const m2Then = m2Map.get(entry.date);
  const m2Now = m2Map.get(latest.date);
  const m2Ratio = m2Then && m2Now ? m2Then / m2Now : 1;
  const m2AdjustedValue = nominalValue * m2Ratio;
  const m2AdjustedReturn = (m2AdjustedValue - investmentUsd) / investmentUsd;

  // Gold
  const goldThen = goldMap.get(entry.date);
  const goldNow = goldMap.get(latest.date);
  const goldOuncesThen = goldThen ? investmentUsd / goldThen : 0;
  const goldOuncesNow = goldNow ? nominalValue / goldNow : 0;
  const goldReturn = goldOuncesThen > 0 ? (goldOuncesNow - goldOuncesThen) / goldOuncesThen : 0;

  return {
    purchaseDate: entry.date,
    investmentUsd,
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
