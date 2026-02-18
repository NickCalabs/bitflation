import type { InflationMetric } from '../lib/types';
import { formatUSD, formatPercent, formatDate, formatGoldOz } from '../lib/formatters';
import styles from './CustomTooltip.module.css';

interface CustomTooltipProps {
  metric: InflationMetric;
  active?: boolean;
  payload?: Array<{
    payload: Record<string, number | string>;
  }>;
}

export function CustomTooltip({ metric, active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

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
