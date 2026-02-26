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
import type { DailyPoint } from '../lib/dcaSimulation';
import {
  runDcaBtc,
  runDcaIhsg,
  runDcaGold,
  runDcaDeposito,
  type DcaInputs,
  type DcaResult,
} from '../lib/dcaSimulation';
import type { DepositoRate } from '../lib/types';
import styles from './IdrDcaCalculator.module.css';

const WEEKLY_MIN = 50_000;
const WEEKLY_MAX = 1_000_000;
const WEEKLY_DEFAULT = 200_000;
const YEARS_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 tahun lalu' },
  { value: 2, label: '2 tahun lalu' },
  { value: 3, label: '3 tahun lalu' },
  { value: 5, label: '5 tahun lalu' },
];

const ASSETS: { key: 'deposito' | 'ihsg' | 'emas' | 'bitcoin'; label: string; color: string }[] = [
  { key: 'deposito', label: 'Deposito', color: '#71717a' },
  { key: 'ihsg', label: 'IHSG', color: '#3b82f6' },
  { key: 'emas', label: 'Emas', color: '#eab308' },
  { key: 'bitcoin', label: 'Bitcoin', color: '#f97316' },
];

function formatIdr(n: number): string {
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}jt`;
  if (n >= 1e3) return `Rp ${(n / 1e3).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export function IdrDcaCalculator() {
  const [weeklyAmount, setWeeklyAmount] = useState(WEEKLY_DEFAULT);
  const [yearsAgo, setYearsAgo] = useState(3);
  const [btcDaily, setBtcDaily] = useState<DailyPoint[]>([]);
  const [ihsgDaily, setIhsgDaily] = useState<DailyPoint[]>([]);
  const [goldDaily, setGoldDaily] = useState<DailyPoint[]>([]);
  const [depositoRates, setDepositoRates] = useState<DepositoRate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../data/idr/btc-daily.json').then((m) => m.default as { date: string; price: number }[]),
      import('../data/idr-dca/ihsg-daily.json').then((m) => m.default as DailyPoint[]),
      import('../data/idr-dca/gold-idr-daily.json').then((m) => m.default as DailyPoint[]),
      import('../data/idr-dca/deposito-rates.json').then((m) => m.default as DepositoRate[]),
    ])
      .then(([btc, ihsg, gold, deposito]) => {
        if (cancelled) return;
        setBtcDaily(btc);
        setIhsgDaily(ihsg);
        setGoldDaily(gold);
        setDepositoRates(deposito);
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) console.warn('IDR DCA data load failed', err);
      });
    return () => { cancelled = true; };
  }, []);

  const inputs: DcaInputs = useMemo(
    () => ({
      weeklyAmountIdr: weeklyAmount,
      yearsAgo,
      btcDaily,
      ihsgDaily,
      goldDaily,
      depositoRates,
    }),
    [weeklyAmount, yearsAgo, btcDaily, ihsgDaily, goldDaily, depositoRates]
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
    return bitcoinSeries.map(({ date }) => {
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
  }, [results]);

  if (!loaded) {
    return (
      <section className={styles.section}>
        <div className={styles.loading}>Memuat data DCA...</div>
      </section>
    );
  }

  if (!results || btcDaily.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.loading}>
          Data belum tersedia. Jalankan: node scripts/prepare-ihsg-daily.mjs dan prepare-gold-idr-daily.mjs
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Simulasi DCA — Nabung rutin per minggu</h2>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Berapa per minggu?</label>
          <div className={styles.sliderRow}>
            <span className={styles.sliderValue}>{formatIdr(weeklyAmount)}</span>
            <input
              type="range"
              min={WEEKLY_MIN}
              max={WEEKLY_MAX}
              step={25000}
              value={weeklyAmount}
              onChange={(e) => setWeeklyAmount(Number(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Mulai dari kapan?</label>
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
              tickFormatter={(v) => (v >= 1e9 ? `${(v / 1e9).toFixed(0)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}jt` : `${(v / 1e3).toFixed(0)}rb`)}
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
            <Line type="monotone" dataKey="totalInvested" name="Total nabung" stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="deposito" name="Deposito" stroke={ASSETS[0].color} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="ihsg" name="IHSG" stroke={ASSETS[1].color} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="emas" name="Emas" stroke={ASSETS[2].color} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="bitcoin" name="Bitcoin" stroke={ASSETS[3].color} dot={false} strokeWidth={2} />
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
                <span className={styles.columnKey}>Nabung:</span>
                <span>{formatIdr(r.totalInvested)}</span>
              </div>
              <div className={styles.columnRow}>
                <span className={styles.columnKey}>Nilai:</span>
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
