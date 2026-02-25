import type { PricePoint, DeflatorPoint, CurrencyCode } from './types';

export interface CurrencyData {
  btc: PricePoint[];
  cpi: DeflatorPoint[];
  m2: DeflatorPoint[];
  gold: DeflatorPoint[];
  dxy: DeflatorPoint[];
  sp500: PricePoint[];
  housing: PricePoint[];
}

/**
 * Dynamically loads static JSON data for a given currency.
 * Uses Vite's dynamic import for code-splitting — only the active
 * currency's data is loaded into the bundle.
 */
export async function loadCurrencyData(currency: CurrencyCode): Promise<CurrencyData> {
  const loaders: Record<CurrencyCode, () => Promise<CurrencyData>> = {
    USD: async () => {
      const [btc, cpi, m2, gold, dxy, sp500, housing] = await Promise.all([
        import('../data/usd/btc-daily.json').then(m => m.default as PricePoint[]),
        import('../data/usd/cpi-monthly.json').then(m => m.default as DeflatorPoint[]),
        import('../data/usd/m2-monthly.json').then(m => m.default as DeflatorPoint[]),
        import('../data/usd/gold-monthly.json').then(m => m.default as DeflatorPoint[]),
        import('../data/usd/dxy-daily.json').then(m => m.default as DeflatorPoint[]),
        import('../data/usd/sp500-daily.json').then(m => m.default as PricePoint[]),
        import('../data/usd/housing-monthly.json').then(m => m.default as PricePoint[]),
      ]);
      return { btc, cpi, m2, gold, dxy, sp500, housing };
    },
    EUR: async () => {
      const [btc, cpi, m2, gold] = await Promise.all([
        import('../data/eur/btc-daily.json').then(m => m.default as PricePoint[]),
        import('../data/eur/cpi-monthly.json').then(m => m.default as DeflatorPoint[]),
        import('../data/eur/m2-monthly.json').then(m => m.default as DeflatorPoint[]),
        import('../data/eur/gold-monthly.json').then(m => m.default as DeflatorPoint[]),
      ]);
      return { btc, cpi, m2, gold, dxy: [], sp500: [], housing: [] };
    },
    IDR: async () => {
      const [btc, cpi, m2, gold] = await Promise.all([
        import('../data/idr/btc-daily.json').then(m => m.default as PricePoint[]),
        import('../data/idr/cpi-monthly.json').then(m => m.default as DeflatorPoint[]),
        import('../data/idr/m2-monthly.json').then(m => m.default as DeflatorPoint[]),
        import('../data/idr/gold-monthly.json').then(m => m.default as DeflatorPoint[]),
      ]);
      return { btc, cpi, m2, gold, dxy: [], sp500: [], housing: [] };
    },
  };

  return loaders[currency]();
}
