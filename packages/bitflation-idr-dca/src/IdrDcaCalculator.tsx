import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DailyPoint } from './dcaSimulation';
import {
  runDcaBtc,
  runDcaIhsg,
  runDcaGold,
  runDcaDeposito,
  type DcaInputs,
  type DcaResult,
  type DcaFrequency,
} from './dcaSimulation';
import type { DepositoRate } from './types';
import styles from './IdrDcaCalculator.module.css';

const AMOUNT_CONFIG: Record<DcaFrequency, { min: number; max: number; step: number; default: number }> = {
  daily:   { min: 10_000, max: 500_000, step: 5_000, default: 30_000 },
  weekly:  { min: 50_000, max: 1_000_000, step: 25_000, default: 200_000 },
  monthly: { min: 100_000, max: 10_000_000, step: 100_000, default: 100_000 },
};
const FREQUENCY_OPTIONS: { value: DcaFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const YEARS_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 year ago' },
  { value: 2, label: '2 years ago' },
  { value: 3, label: '3 years ago' },
  { value: 5, label: '5 years ago' },
  { value: 6, label: '6 years ago' },
  { value: 7, label: '7 years ago' },
  { value: 8, label: '8 years ago' },
  { value: 9, label: '9 years ago' },
  { value: 10, label: '10 years ago' },
  { value: 11, label: '11 years ago (from 2015)' },
];

const ASSETS: { key: 'deposito' | 'ihsg' | 'emas' | 'bitcoin'; label: string; color: string }[] = [
  { key: 'deposito', label: 'Time deposit', color: '#71717a' },
  { key: 'ihsg', label: 'IHSG (stock index)', color: '#3b82f6' },
  { key: 'emas', label: 'Gold', color: '#eab308' },
  { key: 'bitcoin', label: 'Bitcoin', color: '#f97316' },
];

function formatIdr(n: number): string {
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `Rp ${(n / 1e3).toFixed(0)}K`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export function IdrDcaCalculator() {
  const [frequency, setFrequency] = useState<DcaFrequency>('monthly');
  const [amount, setAmount] = useState(AMOUNT_CONFIG.monthly.default);
  const [yearsAgo, setYearsAgo] = useState(5);
  const [btcDaily, setBtcDaily] = useState<DailyPoint[]>([]);
  const [ihsgDaily, setIhsgDaily] = useState<DailyPoint[]>([]);
  const [goldDaily, setGoldDaily] = useState<DailyPoint[]>([]);
  const [depositoRates, setDepositoRates] = useState<DepositoRate[]>([]);
  const [cpiMonthly, setCpiMonthly] = useState<{ date: string; value: number }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('./data/btc-daily.json').then((m: unknown) => (m as { default?: { date: string; price: number }[] }).default ?? (m as { date: string; price: number }[])),
      import('./data/ihsg-daily.json').then((m: unknown) => (m as { default?: DailyPoint[] }).default ?? (m as DailyPoint[])),
      import('./data/gold-idr-daily.json').then((m: unknown) => (m as { default?: DailyPoint[] }).default ?? (m as DailyPoint[])),
      import('./data/deposito-rates.json').then((m: unknown) => (m as { default?: DepositoRate[] }).default ?? (m as DepositoRate[])),
      import('./data/cpi-monthly.json').then((m: unknown) => (m as { default?: { date: string; value: number }[] }).default ?? (m as { date: string; value: number }[])),
    ])
      .then(([btc, ihsg, gold, deposito, cpi]) => {
        if (cancelled) return;
        setBtcDaily(btc);
        setIhsgDaily(ihsg);
        setGoldDaily(gold);
        setDepositoRates(deposito);
        setCpiMonthly(cpi);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const config = AMOUNT_CONFIG[frequency];
  const inputs: DcaInputs = useMemo(
    () => ({
      amountPerPeriodIdr: amount,
      frequency,
      yearsAgo,
      btcDaily,
      ihsgDaily,
      goldDaily,
      depositoRates,
    }),
    [amount, frequency, yearsAgo, btcDaily, ihsgDaily, goldDaily, depositoRates]
  );

  const results = useMemo((): Record<string, DcaResult> | null => {
    if (!loaded || btcDaily.length === 0) return null;
    return {
      deposito: runDcaDeposito(inputs),
      ihsg: runDcaIhsg(inputs),
      emas: runDcaGold(inputs),
      bitcoin: runDcaBtc(inputs),
    };
  }, [inputs, loaded, btcDaily.length]);

  const chartData = useMemo(() => {
    if (!results) return [];
    const bitcoinSeries = results.bitcoin.series;
    const totalInvested = results.bitcoin.totalInvested;
    const raw = bitcoinSeries.map(({ date }) => {
      const point: Record<string, string | number> = {
        date,
        totalInvested,
        deposito: results!.deposito.series.find((s) => s.date === date)?.portfolioValue ?? 0,
        ihsg: results!.ihsg.series.find((s) => s.date === date)?.portfolioValue ?? 0,
        emas: results!.emas.series.find((s) => s.date === date)?.portfolioValue ?? 0,
        bitcoin: results!.bitcoin.series.find((s) => s.date === date)?.portfolioValue ?? 0,
      };
      return point;
    });
    const maxPoints = 600;
    if (raw.length <= maxPoints) return raw;
    const step = Math.ceil(raw.length / maxPoints);
    return raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
  }, [results]);

  const inflationOverPeriod = useMemo((): { startYear: number; pct: number } | null => {
    if (cpiMonthly.length < 2) return null;
    const start = new Date();
    start.setFullYear(start.getFullYear() - yearsAgo);
    const startStr = start.toISOString().slice(0, 7);
    const onOrBeforeStart = cpiMonthly.filter((m) => m.date.slice(0, 7) <= startStr);
    const startCpi = onOrBeforeStart.length > 0 ? onOrBeforeStart[onOrBeforeStart.length - 1] : cpiMonthly[0];
    const endCpi = cpiMonthly[cpiMonthly.length - 1];
    if (!startCpi || !endCpi || startCpi.date > endCpi.date) return null;
    const pct = (endCpi.value / startCpi.value - 1) * 100;
    return { startYear: start.getFullYear(), pct };
  }, [cpiMonthly, yearsAgo]);

  if (!loaded) {
    return (
      <section className={styles.section}>
        <div className={styles.loading}>Loading DCA data…</div>
      </section>
    );
  }

  if (!results || btcDaily.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.loading}>
          Data not available. Ensure the package data files are present.
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>DCA simulator — regular savings (IDR)</h2>
      <p className={styles.explainer}>
        This shows what would have happened if you had invested a <strong>fixed amount</strong> on a schedule (daily, weekly, or monthly) into four assets: a time deposit, the Indonesian stock index (IHSG), gold, and Bitcoin. The chart plots each portfolio’s value over time. The <strong>dashed line</strong> is the total amount you put in (no growth). The table below shows total invested, current value, and return for each asset.
      </p>
      {inflationOverPeriod != null && (
        <p className={styles.inflationNote}>
          Over this period, IDR lost about <strong>{inflationOverPeriod.pct.toFixed(1)}%</strong> purchasing power (CPI). So Rp 1 in {inflationOverPeriod.startYear} buys about as much as Rp {(inflationOverPeriod.pct / 100 + 1).toFixed(2)} today.
        </p>
      )}

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Frequency</label>
          <select
            value={frequency}
            onChange={(e) => {
              const next = e.target.value as DcaFrequency;
              setFrequency(next);
              const c = AMOUNT_CONFIG[next];
              setAmount((a) => Math.min(c.max, Math.max(c.min, a)));
            }}
            className={styles.select}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Amount per {frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'week' : 'month'} (IDR)
          </label>
          <div className={styles.sliderRow}>
            <span className={styles.sliderValue}>{formatIdr(amount)}</span>
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Starting from</label>
          <select
            value={yearsAgo}
            onChange={(e) => setYearsAgo(Number(e.target.value))}
            className={styles.select}
          >
            {YEARS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(0, 7)}
              stroke="var(--text-muted)"
              fontSize={11}
            />
            <YAxis
              tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(0)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`)}
              stroke="var(--text-muted)"
              fontSize={11}
            />
            <ReferenceLine
              y={results.bitcoin.totalInvested}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Tooltip
              formatter={(value: number | undefined) => (value != null ? formatIdr(value) : '')}
              labelFormatter={(d) => d}
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            />
            <Legend />
            <Line type="monotone" dataKey="totalInvested" name="Total invested" stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="deposito" name={ASSETS[0].label} stroke={ASSETS[0].color} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="ihsg" name={ASSETS[1].label} stroke={ASSETS[1].color} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="emas" name={ASSETS[2].label} stroke={ASSETS[2].color} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="bitcoin" name={ASSETS[3].label} stroke={ASSETS[3].color} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.scoreboard}>
        {ASSETS.map(({ key, label, color }) => {
          const r = results[key];
          const isBitcoin = key === 'bitcoin';
          const isDeposito = key === 'deposito';
          return (
            <div
              key={key}
              className={`${styles.column} ${isBitcoin ? styles.columnHighlight : ''} ${isDeposito ? styles.columnMuted : ''}`}
            >
              <div className={styles.columnLabel} style={{ color }}>{label}</div>
              <div className={styles.columnRow}>
                <span className={styles.columnKey}>Invested:</span>
                <span>{formatIdr(r.totalInvested)}</span>
              </div>
              <div className={styles.columnRow}>
                <span className={styles.columnKey}>Value:</span>
                <span>{formatIdr(r.currentValue)}</span>
              </div>
              <div className={styles.columnRow}>
                <span className={styles.columnKey}>Return:</span>
                <span className={r.returnPct >= 0 ? styles.returnPositive : styles.returnNegative}>
                  {r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
