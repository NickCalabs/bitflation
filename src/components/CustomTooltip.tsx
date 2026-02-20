import type { InflationMetric, DeflatorMetric, ComparisonAsset } from '../lib/types';
import { formatUSD, formatPercent, formatDate, formatGoldOz, formatIndexed } from '../lib/formatters';
import styles from './CustomTooltip.module.css';

const COMPARE_CONFIG: { key: ComparisonAsset; label: string; color: string }[] = [
  { key: 'sp500', label: 'S&P 500', color: '#22d3ee' },
  { key: 'gold', label: 'Gold', color: '#facc15' },
  { key: 'housing', label: 'Housing', color: '#f97316' },
];

const METRIC_COLORS: Record<DeflatorMetric, string> = {
  BFI: '#e4e4e7',
  CPI: '#4ade80',
  M2: '#22d3ee',
  DXY: '#fb923c',
};

const METRIC_KEYS: Record<DeflatorMetric, string> = {
  BFI: 'bfiAdjusted',
  CPI: 'cpiAdjusted',
  M2: 'm2Adjusted',
  DXY: 'dxyAdjusted',
};

interface CustomTooltipProps {
  selectedMetrics: InflationMetric[];
  compareAssets?: ComparisonAsset[];
  active?: boolean;
  payload?: Array<{
    payload: Record<string, number | string>;
  }>;
}

export function CustomTooltip({ selectedMetrics, compareAssets, active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isGold = selectedMetrics.length === 1 && selectedMetrics[0] === 'GOLD';
  const deflatorMetrics = selectedMetrics.filter((m): m is DeflatorMetric => m !== 'GOLD');

  // Comparison mode
  if (compareAssets && compareAssets.length > 0 && data.btc !== undefined) {
    return (
      <div className={styles.tooltip}>
        <div className={styles.date}>{formatDate(data.date as string)}</div>
        <div className={styles.row}>
          <span className={styles.dot} style={{ background: '#818cf8' }} />
          <span className={styles.label}>BTC</span>
          <span className={styles.value}>{formatIndexed(data.btc as number)}</span>
        </div>
        {COMPARE_CONFIG
          .filter((c) => compareAssets.includes(c.key))
          .map((c) => {
            const val = data[c.key] as number | undefined;
            return (
              <div key={c.key} className={styles.row}>
                <span className={styles.dot} style={{ background: c.color }} />
                <span className={styles.label}>{c.label}</span>
                <span className={styles.value}>
                  {val !== undefined ? formatIndexed(val) : '--'}
                </span>
              </div>
            );
          })}
      </div>
    );
  }

  if (isGold) {
    return (
      <div className={styles.tooltip}>
        <div className={styles.date}>{formatDate(data.date as string)}</div>
        <div className={styles.row}>
          <span className={`${styles.dot} ${styles.nominal}`} />
          <span className={styles.label}>Nominal</span>
          <span className={styles.value}>{formatUSD(data.nominalPrice as number)}</span>
        </div>
        <div className={styles.row}>
          <span className={`${styles.dot} ${styles.gold}`} />
          <span className={styles.label}>Gold</span>
          <span className={styles.value}>{formatGoldOz(data.goldOunces as number)}</span>
        </div>
        <div className={styles.sub}>
          {formatUSD(data.goldPriceUsd as number)}/oz
        </div>
      </div>
    );
  }

  const nominalPrice = data.nominalPrice as number;

  // Multi-metric mode: show each deflator's adjusted price
  if (deflatorMetrics.length > 1) {
    return (
      <div className={styles.tooltip}>
        <div className={styles.date}>{formatDate(data.date as string)}</div>
        <div className={styles.row}>
          <span className={`${styles.dot} ${styles.nominal}`} />
          <span className={styles.label}>Nominal</span>
          <span className={styles.value}>{formatUSD(nominalPrice)}</span>
        </div>
        {deflatorMetrics.map(m => {
          const key = METRIC_KEYS[m];
          const val = data[key] as number | undefined;
          if (val === undefined) return null;
          const diff = (val - nominalPrice) / nominalPrice;
          return (
            <div key={m} className={styles.row}>
              <span className={styles.dot} style={{ background: METRIC_COLORS[m] }} />
              <span className={styles.label}>{m}</span>
              <span className={styles.value}>{formatUSD(val)}</span>
              <span className={`${styles.diffInline} ${diff >= 0 ? styles.positive : styles.negative}`}>
                {formatPercent(diff)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Single deflator mode
  const adjustedPrice = (data.adjustedPrice ?? data[METRIC_KEYS[deflatorMetrics[0]]]) as number;
  const diff = (adjustedPrice - nominalPrice) / nominalPrice;

  return (
    <div className={styles.tooltip}>
      <div className={styles.date}>{formatDate(data.date as string)}</div>
      <div className={styles.row}>
        <span className={`${styles.dot} ${styles.nominal}`} />
        <span className={styles.label}>Nominal</span>
        <span className={styles.value}>{formatUSD(nominalPrice)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.dot} style={{ background: METRIC_COLORS[deflatorMetrics[0]] }} />
        <span className={styles.label}>Adjusted</span>
        <span className={styles.value}>{formatUSD(adjustedPrice)}</span>
      </div>
      <div className={`${styles.diff} ${diff >= 0 ? styles.positive : styles.negative}`}>
        {formatPercent(diff)}
      </div>
    </div>
  );
}
