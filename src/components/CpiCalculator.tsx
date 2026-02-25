import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { PricePoint } from '../lib/types';
import staticCpiData from '../data/cpi-monthly.json';
import styles from './CpiCalculator.module.css';

interface CpiCalculatorProps {
  prices: PricePoint[];
}

interface CpiEntry {
  date: string; // YYYY-MM-DD
  value: number;
}

const cpiEntries = staticCpiData as CpiEntry[];

// Build Map<"YYYY-MM", number> for O(1) lookup
const cpiMap = new Map<string, number>();
for (const entry of cpiEntries) {
  cpiMap.set(entry.date.slice(0, 7), entry.value);
}

// Derive available months from actual data
const availableMonths = cpiEntries.map((e) => e.date.slice(0, 7)).sort();
const firstMonth = availableMonths[0]; // "2010-01"
const lastMonth = availableMonths[availableMonths.length - 1];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-');
  return { year: Number(y), month: Number(m) };
}

function toYM(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function formatBtc(value: number): string {
  if (value < 0.01) return value.toFixed(8);
  return value.toFixed(4);
}

// Binary search: find closest price on or before a given "YYYY-MM" date
function findPriceForMonth(prices: PricePoint[], ym: string): number | null {
  if (prices.length === 0) return null;
  // Target: first day of month
  const target = `${ym}-01`;
  // Binary search for the nearest date <= target
  let lo = 0;
  let hi = prices.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (prices[mid].date <= target) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // If no price on or before target, try the first available price after
  if (best === -1) {
    // Check if first price is within same month
    if (prices[0].date.slice(0, 7) === ym) return prices[0].price;
    return null;
  }
  return prices[best].price;
}

// Compute available years from CPI data
const firstYear = parseYearMonth(firstMonth).year;
const lastYear = parseYearMonth(lastMonth).year;
const years: number[] = [];
for (let y = firstYear; y <= lastYear; y++) years.push(y);

function getMonthsForYear(year: number): number[] {
  const months: number[] = [];
  for (let m = 1; m <= 12; m++) {
    if (cpiMap.has(toYM(year, m))) months.push(m);
  }
  return months;
}

export function CpiCalculator({ prices }: CpiCalculatorProps) {
  // Parse URL params for initial state
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const defaultFrom = lastMonth;
  const defaultTo = '2019-01';

  const [fromYM, setFromYM] = useState(() => {
    const f = urlParams.get('from');
    return f && cpiMap.has(f) ? f : defaultFrom;
  });
  const [toYM, setToYM] = useState(() => {
    const t = urlParams.get('to');
    return t && cpiMap.has(t) ? t : defaultTo;
  });
  const [amountStr, setAmountStr] = useState(() => {
    const a = urlParams.get('amount');
    const num = Number(a);
    if (a && num > 0) return String(num);
    // Default to current BTC price
    if (prices.length > 0) return String(Math.round(prices[prices.length - 1].price));
    return '1000';
  });
  const [showToast, setShowToast] = useState(false);

  const fromParsed = parseYearMonth(fromYM);
  const toParsed = parseYearMonth(toYM);

  const fromMonths = getMonthsForYear(fromParsed.year);
  const toMonths = getMonthsForYear(toParsed.year);

  const amount = Number(amountStr);
  const validAmount = amount > 0 && Number.isFinite(amount);

  // Debounced URL sync — always write params (defaults are dynamic)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (amountStr && Number(amountStr) > 0) {
        params.set('amount', amountStr);
      } else {
        params.delete('amount');
      }
      params.set('from', fromYM);
      params.set('to', toYM);
      const search = params.toString();
      const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
      history.replaceState(null, '', url);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [amountStr, fromYM, toYM]);

  // CPI calculation — no auto-swap, formula handles both directions
  const result = useMemo(() => {
    if (!validAmount) return null;

    const cpiFrom = cpiMap.get(fromYM);
    const cpiTo = cpiMap.get(toYM);
    if (cpiFrom === undefined || cpiTo === undefined) return null;

    const adjustedAmount = amount * (cpiTo / cpiFrom);
    const inflationPct = (cpiTo / cpiFrom) - 1;

    // BTC calculation — always buy at earlier date, sell at later (forward-looking)
    const [earlierYM, laterYM] = fromYM <= toYM ? [fromYM, toYM] : [toYM, fromYM];
    const btcPriceBuy = findPriceForMonth(prices, earlierYM);
    const btcPriceSell = findPriceForMonth(prices, laterYM);

    let btcResult: {
      btcAmount: number;
      btcValue: number;
      btcReturnPct: number;
      btcPriceBuy: number;
      btcPriceSell: number;
      buyDate: string;
      sellDate: string;
    } | null = null;

    if (btcPriceBuy !== null && btcPriceSell !== null && btcPriceBuy > 0) {
      const btcAmount = amount / btcPriceBuy;
      const btcValue = btcAmount * btcPriceSell;
      const btcReturnPct = (btcValue / amount) - 1;
      btcResult = { btcAmount, btcValue, btcReturnPct, btcPriceBuy, btcPriceSell, buyDate: earlierYM, sellDate: laterYM };
    }

    return { adjustedAmount, inflationPct, btcResult };
  }, [validAmount, amount, fromYM, toYM, prices]);

  const resultRef = useRef<HTMLDivElement>(null);

  const handleCalculate = useCallback(() => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleShare = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'calculator');
    params.set('amount', amountStr);
    params.set('from', fromYM);
    params.set('to', toYM);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, [amountStr, fromYM, toYM]);

  const formatAmountOnBlur = useCallback(() => {
    const num = Number(amountStr);
    if (num > 0 && Number.isFinite(num)) {
      setAmountStr(String(Math.round(num * 100) / 100));
    }
  }, [amountStr]);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Inflation Calculator</h2>
      <p className={styles.subtitle}>
        See how CPI inflation erodes purchasing power — and how Bitcoin compares.
      </p>

      <div className={styles.inputCard}>
        <div className={styles.inputRow}>
          <label className={styles.inputLabel}>$</label>
          <input
            type="number"
            className={styles.amountInput}
            value={amountStr}
            min="0"
            step="any"
            placeholder="1000"
            onChange={(e) => setAmountStr(e.target.value)}
            onBlur={formatAmountOnBlur}
          />
        </div>

        <div className={styles.dateRow}>
          <span className={styles.dateLabel}>in</span>
          <select
            className={styles.dateSelect}
            value={fromParsed.month}
            onChange={(e) => setFromYM(toYM_fn(fromParsed.year, Number(e.target.value)))}
          >
            {fromMonths.map((m) => (
              <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>
            ))}
          </select>
          <select
            className={styles.dateSelect}
            value={fromParsed.year}
            onChange={(e) => {
              const newYear = Number(e.target.value);
              const months = getMonthsForYear(newYear);
              const m = months.includes(fromParsed.month) ? fromParsed.month : months[months.length - 1];
              setFromYM(toYM_fn(newYear, m));
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <p className={styles.connector}>has the same buying power as...</p>

        <div className={styles.dateRow}>
          <span className={styles.dateLabel}>in</span>
          <select
            className={styles.dateSelect}
            value={toParsed.month}
            onChange={(e) => setToYM(toYM_fn(toParsed.year, Number(e.target.value)))}
          >
            {toMonths.map((m) => (
              <option key={m} value={m}>{MONTH_NAMES[m - 1]}</option>
            ))}
          </select>
          <select
            className={styles.dateSelect}
            value={toParsed.year}
            onChange={(e) => {
              const newYear = Number(e.target.value);
              const months = getMonthsForYear(newYear);
              const m = months.includes(toParsed.month) ? toParsed.month : months[months.length - 1];
              setToYM(toYM_fn(newYear, m));
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          className={styles.calcBtn}
          disabled={!validAmount}
          onClick={handleCalculate}
        >
          Calculate
        </button>
      </div>

      {result && (
        <div className={styles.resultGrid} ref={resultRef}>
          {/* Dollar card */}
          <div className={`${styles.resultCard} ${styles.dollarCard}`}>
            <span className={styles.resultLabel}>Dollar Result</span>
            <span className={`${styles.resultValue} ${result.adjustedAmount < amount ? styles.redText : styles.greenText}`}>
              {formatUsd(result.adjustedAmount)}
            </span>
            <span className={`${styles.resultPct} ${result.inflationPct < 0 ? styles.redText : styles.greenText}`}>
              {result.inflationPct < 0
                ? `${(Math.abs(result.inflationPct) * 100).toFixed(1)}% purchasing power lost`
                : `${formatPct(result.inflationPct)} inflation`}
            </span>
            <p className={styles.resultDesc}>
              {result.adjustedAmount < amount
                ? <>In {formatMonthYear(toYM)} dollars, that{'\u2019'}s only {formatUsd(result.adjustedAmount)}.</>
                : <>{formatUsd(amount)} in {formatMonthYear(fromYM)} has the same buying power as {formatUsd(result.adjustedAmount)} in {formatMonthYear(toYM)}.</>}
            </p>
            <div className={styles.divider} />
            <p className={styles.resultExplain}>
              {result.inflationPct < 0
                ? `Inflation since ${formatMonthYear(toYM)} eroded ${(Math.abs(result.inflationPct / (1 + result.inflationPct)) * 100).toFixed(1)}% of this amount's real value.`
                : `Your dollars lost ${(result.inflationPct / (1 + result.inflationPct) * 100).toFixed(1)}% of their purchasing power.`}
            </p>
          </div>

          {/* BTC card */}
          <div className={`${styles.resultCard} ${styles.btcCard}`}>
            <span className={styles.resultLabel}>Bitcoin Result</span>
            {result.btcResult ? (
              <>
                <span className={`${styles.resultValue} ${result.btcResult.btcReturnPct >= 0 ? styles.greenText : styles.redText}`}>
                  {formatUsd(result.btcResult.btcValue)}
                </span>
                <span className={`${styles.resultPct} ${result.btcResult.btcReturnPct >= 0 ? styles.greenText : styles.redText}`}>
                  {formatPct(result.btcResult.btcReturnPct)} return
                </span>
                <p className={styles.resultDesc}>
                  If you bought {formatUsd(amount)} of BTC in {formatMonthYear(result.btcResult.buyDate)},{' '}
                  it would be worth {formatUsd(result.btcResult.btcValue)} in {formatMonthYear(result.btcResult.sellDate)}.
                </p>
                <div className={styles.divider} />
                <p className={styles.resultMeta}>
                  {formatBtc(result.btcResult.btcAmount)} BTC at{' '}
                  {formatUsd(result.btcResult.btcPriceBuy)} → {formatUsd(result.btcResult.btcPriceSell)}
                </p>
              </>
            ) : (
              <p className={styles.noData}>
                No BTC price data available for this period.
                Bitcoin data starts from April 2013.
              </p>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className={styles.shareWrap}>
          <button className={styles.shareBtn} onClick={handleShare}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Share result
          </button>
          {showToast && <span className={styles.toast}>Copied!</span>}
        </div>
      )}
    </section>
  );
}

// Alias to avoid conflict with the toYM variable name
function toYM_fn(year: number, month: number): string {
  return toYM(year, month);
}

function formatMonthYear(ym: string): string {
  const { year, month } = parseYearMonth(ym);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
