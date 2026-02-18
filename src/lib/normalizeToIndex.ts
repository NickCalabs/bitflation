import type { AdjustedPricePoint, ComparisonAsset, ComparisonPoint } from './types';

/**
 * Normalizes multiple adjusted price series to index 100 at their first point
 * and merges by date. Only includes dates where BTC has data.
 */
export function normalizeToIndex(
  btcData: AdjustedPricePoint[],
  assetSeries: { key: ComparisonAsset; data: AdjustedPricePoint[] }[]
): ComparisonPoint[] {
  if (btcData.length === 0) return [];

  const btcBase = btcData[0].adjustedPrice;
  if (btcBase === 0) return [];

  // Build lookup maps for each asset
  const assetMaps = assetSeries.map(({ key, data }) => {
    const map = new Map<string, number>();
    const base = data.length > 0 ? data[0].adjustedPrice : 0;
    if (base === 0) return { key, map, base: 0 };
    for (const d of data) {
      map.set(d.date, (d.adjustedPrice / base) * 100);
    }
    return { key, map, base };
  });

  return btcData.map((d) => {
    const point: ComparisonPoint = {
      date: d.date,
      btc: (d.adjustedPrice / btcBase) * 100,
    };

    for (const { key, map, base } of assetMaps) {
      if (base === 0) continue;
      const val = map.get(d.date);
      if (val !== undefined) {
        point[key] = val;
      }
    }

    return point;
  });
}
