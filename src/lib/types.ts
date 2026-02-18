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

export type LiveDataStatus = 'all' | 'partial' | 'none';

export interface CalculatorResult {
  purchaseDate: string;
  investmentUsd: number;
  btcAmount: number;
  btcPriceThen: number;
  btcPriceNow: number;
  nominalValue: number;
  nominalReturn: number;       // e.g. 2.5 = 250% gain
  cpiAdjustedValue: number;
  cpiAdjustedReturn: number;
  m2AdjustedValue: number;
  m2AdjustedReturn: number;
  goldOuncesThen: number;
  goldOuncesNow: number;
  goldReturn: number;          // ratio of gold ounces now vs then
}

export interface GoldPricePoint {
  date: string; // YYYY-MM-DD
  nominalPrice: number;   // BTC in USD
  goldOunces: number;     // BTC in oz of gold
  goldPriceUsd: number;   // price of 1 oz gold that day
}
