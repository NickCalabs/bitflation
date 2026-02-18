import type { InflationMetric, ComparisonAsset } from '../lib/types';
import { formatUSD, formatPercent, formatDate, formatGoldOz, formatIndexed } from '../lib/formatters';
import styles from './CustomTooltip.module.css';

const COMPARE_CONFIG: { key: ComparisonAsset; label: string; color: string }[] = [
  { key: 'sp500', label: 'S&P 500', color: '#22d3ee' },
  { key: 'gold', label: 'Gold', color: '#facc15' },
  { key: 'housing', label: 'Housing', color: '#f97316' },
];

interface CustomTooltipProps {
  metric: InflationMetric;
  compareAssets?: ComparisonAsset[];
  active?: boolean;
  payload?: Array<{
    payload: Record<string, number | string>;
  }>;
}

export function CustomTooltip({ metric, compareAssets, active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

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

  if (metric === 'GOLD') {
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
  const adjustedPrice = data.adjustedPrice as number;
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
        <span className={`${styles.dot} ${styles.adjusted}`} />
        <span className={styles.label}>Adjusted</span>
        <span className={styles.value}>{formatUSD(adjustedPrice)}</span>
      </div>
      <div className={`${styles.diff} ${diff >= 0 ? styles.positive : styles.negative}`}>
        {formatPercent(diff)}
      </div>
    </div>
  );
}
