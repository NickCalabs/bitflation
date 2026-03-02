/**
 * DCA simulation: amount per period (daily/weekly/monthly), start date, daily series per asset.
 * Returns total invested, current value, return %, and series for chart. Deposito compounds at BI rate.
 */
import type { DepositoRate } from './types';

export interface DailyPoint {
  date: string;
  price: number;
}

function getCloseOnOrBefore(series: DailyPoint[], date: string): number | null {
  if (series.length === 0) return null;
  let lo = 0;
  let hi = series.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date <= date) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best >= 0 ? series[best].price : null;
}

function getDepositoRate(rates: DepositoRate[], date: string): number {
  for (const r of rates) {
    if (date >= r.startDate && date <= r.endDate) return r.ratePercent / 100;
  }
  return 0.035;
}

function getWeeklyDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let d = new Date(start);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function getMonthlyDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function getDailyDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const d = new Date(start);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export type DcaFrequency = 'daily' | 'weekly' | 'monthly';

function getScheduleDates(frequency: DcaFrequency, startDate: string, endDate: string): string[] {
  switch (frequency) {
    case 'daily':
      return getDailyDates(startDate, endDate);
    case 'weekly':
      return getWeeklyDates(startDate, endDate);
    case 'monthly':
      return getMonthlyDates(startDate, endDate);
    default:
      return getWeeklyDates(startDate, endDate);
  }
}

export interface DcaInputs {
  amountPerPeriodIdr: number;
  frequency: DcaFrequency;
  yearsAgo: number;
  btcDaily: DailyPoint[];
  ihsgDaily: DailyPoint[];
  goldDaily: DailyPoint[];
  depositoRates: DepositoRate[];
}

export interface DcaResult {
  totalInvested: number;
  currentValue: number;
  returnPct: number;
  series: { date: string; portfolioValue: number }[];
}

export function runDcaBtc(inputs: DcaInputs): DcaResult {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - inputs.yearsAgo);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const dates = getScheduleDates(inputs.frequency, startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalUnits = 0;

  for (const date of dates) {
    const close = getCloseOnOrBefore(inputs.btcDaily, date);
    if (close != null && close > 0) {
      totalUnits += inputs.amountPerPeriodIdr / close;
    }
    const latestPrice = getCloseOnOrBefore(inputs.btcDaily, endStr) ?? 0;
    series.push({ date, portfolioValue: Math.round(totalUnits * latestPrice) });
  }

  const totalInvested = inputs.amountPerPeriodIdr * dates.length;
  const currentValue = totalUnits * (getCloseOnOrBefore(inputs.btcDaily, endStr) ?? 0);
  const returnPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalInvested,
    currentValue: Math.round(currentValue),
    returnPct,
    series,
  };
}

export function runDcaIhsg(inputs: DcaInputs): DcaResult {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - inputs.yearsAgo);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const dates = getScheduleDates(inputs.frequency, startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalUnits = 0;

  for (const date of dates) {
    const close = getCloseOnOrBefore(inputs.ihsgDaily, date);
    if (close != null && close > 0) {
      totalUnits += inputs.amountPerPeriodIdr / close;
    }
    const latestPrice = getCloseOnOrBefore(inputs.ihsgDaily, endStr) ?? 0;
    series.push({ date, portfolioValue: Math.round(totalUnits * latestPrice) });
  }

  const totalInvested = inputs.amountPerPeriodIdr * dates.length;
  const currentValue = totalUnits * (getCloseOnOrBefore(inputs.ihsgDaily, endStr) ?? 0);
  const returnPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalInvested,
    currentValue: Math.round(currentValue),
    returnPct,
    series,
  };
}

export function runDcaGold(inputs: DcaInputs): DcaResult {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - inputs.yearsAgo);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const dates = getScheduleDates(inputs.frequency, startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalGrams = 0;

  for (const date of dates) {
    const close = getCloseOnOrBefore(inputs.goldDaily, date);
    if (close != null && close > 0) {
      totalGrams += inputs.amountPerPeriodIdr / close;
    }
    const latestPrice = getCloseOnOrBefore(inputs.goldDaily, endStr) ?? 0;
    series.push({ date, portfolioValue: Math.round(totalGrams * latestPrice) });
  }

  const totalInvested = inputs.amountPerPeriodIdr * dates.length;
  const currentValue = totalGrams * (getCloseOnOrBefore(inputs.goldDaily, endStr) ?? 0);
  const returnPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalInvested,
    currentValue: Math.round(currentValue),
    returnPct,
    series,
  };
}

export function runDcaDeposito(inputs: DcaInputs): DcaResult {
  const end = new Date();
  const endStr = end.toISOString().slice(0, 10);
  const start = new Date();
  start.setFullYear(start.getFullYear() - inputs.yearsAgo);
  const startStr = start.toISOString().slice(0, 10);
  const dates = getScheduleDates(inputs.frequency, startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalValue = 0;

  for (const date of dates) {
    const rate = getDepositoRate(inputs.depositoRates, date);
    const yearsHeld = (end.getTime() - new Date(date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    totalValue += inputs.amountPerPeriodIdr * Math.pow(1 + rate, yearsHeld);
    series.push({ date, portfolioValue: Math.round(totalValue) });
  }

  const totalInvested = inputs.amountPerPeriodIdr * dates.length;
  const returnPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalInvested,
    currentValue: Math.round(totalValue),
    returnPct,
    series,
  };
}
