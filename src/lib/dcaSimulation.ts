/**
 * DCA (Dollar Cost Averaging) simulation — client-side.
 * Given weekly amount (IDR), start date, and daily close series per asset,
 * computes total units accumulated and current value. For deposito, compounds at BI rate.
 */
import type { DepositoRate } from './types';

export interface DailyPoint {
  date: string;
  price: number;
}

/** Get closing price on or before date from sorted daily series (binary search). */
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

/** Get BI rate for a given date from rate ranges. */
function getDepositoRate(rates: DepositoRate[], date: string): number {
  for (const r of rates) {
    if (date >= r.startDate && date <= r.endDate) return r.ratePercent / 100;
  }
  return 0.035; // fallback 3.5%
}

/** Generate weekly dates from start to end (e.g. every Friday). */
function getWeeklyDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Move to next Friday (5) if not already
  let d = new Date(start);
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

export interface DcaInputs {
  weeklyAmountIdr: number;
  yearsAgo: number; // 1, 2, 3, or 5
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
  const weeks = getWeeklyDates(startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalUnits = 0;

  for (const weekEnd of weeks) {
    const close = getCloseOnOrBefore(inputs.btcDaily, weekEnd);
    if (close != null && close > 0) {
      totalUnits += inputs.weeklyAmountIdr / close;
    }
    const latestPrice = getCloseOnOrBefore(inputs.btcDaily, endStr) ?? 0;
    const value = totalUnits * latestPrice;
    series.push({ date: weekEnd, portfolioValue: Math.round(value) });
  }

  const totalInvested = inputs.weeklyAmountIdr * weeks.length;
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
  const weeks = getWeeklyDates(startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalUnits = 0;

  for (const weekEnd of weeks) {
    const close = getCloseOnOrBefore(inputs.ihsgDaily, weekEnd);
    if (close != null && close > 0) {
      totalUnits += inputs.weeklyAmountIdr / close;
    }
    const latestPrice = getCloseOnOrBefore(inputs.ihsgDaily, endStr) ?? 0;
    series.push({
      date: weekEnd,
      portfolioValue: Math.round(totalUnits * latestPrice),
    });
  }

  const totalInvested = inputs.weeklyAmountIdr * weeks.length;
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
  const weeks = getWeeklyDates(startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalGrams = 0;

  for (const weekEnd of weeks) {
    const close = getCloseOnOrBefore(inputs.goldDaily, weekEnd);
    if (close != null && close > 0) {
      totalGrams += inputs.weeklyAmountIdr / close;
    }
    const latestPrice = getCloseOnOrBefore(inputs.goldDaily, endStr) ?? 0;
    series.push({
      date: weekEnd,
      portfolioValue: Math.round(totalGrams * latestPrice),
    });
  }

  const totalInvested = inputs.weeklyAmountIdr * weeks.length;
  const currentValue = totalGrams * (getCloseOnOrBefore(inputs.goldDaily, endStr) ?? 0);
  const returnPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalInvested,
    currentValue: Math.round(currentValue),
    returnPct,
    series,
  };
}

/** Deposito: each weekly deposit compounds at BI rate from deposit date to today. */
export function runDcaDeposito(inputs: DcaInputs): DcaResult {
  const end = new Date();
  const endStr = end.toISOString().slice(0, 10);
  const start = new Date();
  start.setFullYear(start.getFullYear() - inputs.yearsAgo);
  const startStr = start.toISOString().slice(0, 10);
  const weeks = getWeeklyDates(startStr, endStr);
  const series: { date: string; portfolioValue: number }[] = [];
  let totalValue = 0;

  for (let i = 0; i < weeks.length; i++) {
    const weekEnd = weeks[i];
    const rate = getDepositoRate(inputs.depositoRates, weekEnd);
    const yearsHeld = (end.getTime() - new Date(weekEnd).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    totalValue += inputs.weeklyAmountIdr * Math.pow(1 + rate, yearsHeld);
    series.push({ date: weekEnd, portfolioValue: Math.round(totalValue) });
  }

  const totalInvested = inputs.weeklyAmountIdr * weeks.length;
  const returnPct = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalInvested,
    currentValue: Math.round(totalValue),
    returnPct,
    series,
  };
}
