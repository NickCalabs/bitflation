export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface DeflatorPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface AdjustedPricePoint {
  date: string; // YYYY-MM-DD
  nominalPrice: number;
  adjustedPrice: number;
}

export type Timeframe = '1Y' | '5Y' | 'ALL';

export type InflationMetric = 'CPI' | 'M2' | 'GOLD' | 'DXY';

export interface GoldPricePoint {
  date: string; // YYYY-MM-DD
  nominalPrice: number;   // BTC in USD
  goldOunces: number;     // BTC in oz of gold
  goldPriceUsd: number;   // price of 1 oz gold that day
}
