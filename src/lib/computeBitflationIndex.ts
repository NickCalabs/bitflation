/**
 * Computes the Bitflation Index — a 50/50 blend of CPI and M2 growth,
 * normalized to ~1.0 at the anchor year. The result is a synthetic deflator
 * Map that plugs directly into adjustPrices().
 */
export function computeBitflationIndex(
  dailyCpi: Map<string, number>,
  dailyM2: Map<string, number>,
  anchorYear: number
): Map<string, number> {
  const anchorPrefix = String(anchorYear);

  // Compute anchor-year averages for CPI and M2
  let cpiSum = 0, cpiCount = 0;
  let m2Sum = 0, m2Count = 0;

  for (const [date, value] of dailyCpi) {
    if (date.startsWith(anchorPrefix)) {
      cpiSum += value;
      cpiCount++;
    }
  }
  for (const [date, value] of dailyM2) {
    if (date.startsWith(anchorPrefix)) {
      m2Sum += value;
      m2Count++;
    }
  }

  if (cpiCount === 0 || m2Count === 0) return new Map();

  const cpiAnchor = cpiSum / cpiCount;
  const m2Anchor = m2Sum / m2Count;

  // For each date present in BOTH maps, compute blended index
  const result = new Map<string, number>();
  for (const [date, cpi] of dailyCpi) {
    const m2 = dailyM2.get(date);
    if (m2 === undefined) continue;
    result.set(date, 0.5 * (cpi / cpiAnchor) + 0.5 * (m2 / m2Anchor));
  }

  return result;
}
