import { useState, useMemo } from 'react';
import type { PricePoint } from '../lib/types';
import { calculateReturns } from '../lib/calculateReturns';
import styles from './Calculator.module.css';

interface CalculatorProps {
  prices: PricePoint[];
  cpiMap: Map<string, number>;
  m2Map: Map<string, number>;
  goldMap: Map<string, number>;
}

type InputMode = 'USD' | 'BTC';

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function formatBtc(value: number): string {
  return `${value.toFixed(4)} BTC`;
}

export function Calculator({ prices, cpiMap, m2Map, goldMap }: CalculatorProps) {
  const [open, setOpen] = useState(false);
  const [dateStr, setDateStr] = useState('2020-01-01');
  const [amount, setAmount] = useState('1000');
  const [mode, setMode] = useState<InputMode>('USD');

  const investmentUsd = useMemo(() => {
    const num = Number(amount);
    if (!num || num <= 0) return 0;
    if (mode === 'USD') return num;
    // BTC mode: find price at date and convert
    const entry = prices.find((p) => p.date >= dateStr);
    return entry ? num * entry.price : 0;
  }, [amount, mode, dateStr, prices]);

  const result = useMemo(() => {
    if (investmentUsd <= 0) return null;
    return calculateReturns(dateStr, investmentUsd, prices, cpiMap, m2Map, goldMap);
  }, [dateStr, investmentUsd, prices, cpiMap, m2Map, goldMap]);

  const minDate = prices.length > 0 ? prices[0].date : '2013-01-01';
  const maxDate = prices.length > 0 ? prices[prices.length - 1].date : '';

  if (!open) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.toggleBtn} onClick={() => setOpen(true)}>
          Calculate my real returns
        </button>
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>Real Returns Calculator</h3>
        <button className={styles.closeBtn} onClick={() => setOpen(false)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.inputs}>
        <div className={styles.field}>
          <label className={styles.label}>Purchase date</label>
          <input
            type="date"
            className={styles.dateInput}
            value={dateStr}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Amount</label>
          <input
            type="number"
            className={styles.numberInput}
            value={amount}
            min="0"
            step="any"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Unit</label>
          <div className={styles.segmented}>
            <button
              className={`${styles.segBtn} ${mode === 'USD' ? styles.active : ''}`}
              onClick={() => setMode('USD')}
            >
              USD
            </button>
            <button
              className={`${styles.segBtn} ${mode === 'BTC' ? styles.active : ''}`}
              onClick={() => setMode('BTC')}
            >
              BTC
            </button>
          </div>
        </div>
      </div>

      {result ? (
        <>
          <p className={styles.summary}>
            {formatBtc(result.btcAmount)} purchased at {formatUsd(result.btcPriceThen)} on {result.purchaseDate}
          </p>
          <div className={styles.grid}>
            <div className={styles.card}>
              <span className={styles.cardLabel}>Nominal</span>
              <span className={styles.cardValue}>{formatUsd(result.nominalValue)}</span>
              <span className={`${styles.cardReturn} ${result.nominalReturn >= 0 ? styles.positive : styles.negative}`}>
                {formatPct(result.nominalReturn)}
              </span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>CPI-Adjusted</span>
              <span className={styles.cardValue}>{formatUsd(result.cpiAdjustedValue)}</span>
              <span className={`${styles.cardReturn} ${result.cpiAdjustedReturn >= 0 ? styles.positive : styles.negative}`}>
                {formatPct(result.cpiAdjustedReturn)}
              </span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>M2-Adjusted</span>
              <span className={styles.cardValue}>{formatUsd(result.m2AdjustedValue)}</span>
              <span className={`${styles.cardReturn} ${result.m2AdjustedReturn >= 0 ? styles.positive : styles.negative}`}>
                {formatPct(result.m2AdjustedReturn)}
              </span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardLabel}>In Gold</span>
              <span className={styles.cardValue}>{result.goldOuncesNow.toFixed(2)} oz</span>
              <span className={`${styles.cardReturn} ${result.goldReturn >= 0 ? styles.positive : styles.negative}`}>
                {formatPct(result.goldReturn)}
              </span>
              <span className={styles.cardMeta}>was {result.goldOuncesThen.toFixed(2)} oz</span>
            </div>
          </div>
        </>
      ) : investmentUsd > 0 ? (
        <p className={styles.noData}>No data available for this date. Try a date after {minDate}.</p>
      ) : null}
    </section>
  );
}
