import type { Timeframe, InflationMetric } from '../lib/types';
import styles from './Controls.module.css';

interface ControlsProps {
  anchorYear: number;
  onAnchorYearChange: (year: number) => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  metric: InflationMetric;
  onMetricChange: (m: InflationMetric) => void;
  logScale: boolean;
  onLogScaleChange: (v: boolean) => void;
}

const TIMEFRAMES: Timeframe[] = ['1Y', '5Y', 'ALL'];

const METRICS: { value: InflationMetric; label: string }[] = [
  { value: 'CPI', label: 'CPI' },
  { value: 'M2', label: 'M2' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'DXY', label: 'DXY' },
];

export function Controls({
  anchorYear,
  onAnchorYearChange,
  timeframe,
  onTimeframeChange,
  metric,
  onMetricChange,
  logScale,
  onLogScaleChange,
}: ControlsProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);
  const hideAnchorYear = metric === 'GOLD';

  return (
    <div className={styles.controls}>
      {!hideAnchorYear && (
        <div className={styles.group}>
          <span className={styles.label}>Express in</span>
          <select
            value={anchorYear}
            onChange={(e) => onAnchorYearChange(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} dollars
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.spacer} />

      <div className={styles.group}>
        <span className={styles.label}>Timeframe</span>
        <div className={styles.segmented}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={`${styles.segBtn} ${timeframe === tf ? styles.active : ''}`}
              onClick={() => onTimeframeChange(tf)}
            >
              {tf === 'ALL' ? 'All' : tf}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Scale</span>
        <div className={styles.segmented}>
          <button
            className={`${styles.segBtn} ${!logScale ? styles.active : ''}`}
            onClick={() => onLogScaleChange(false)}
          >
            Lin
          </button>
          <button
            className={`${styles.segBtn} ${logScale ? styles.active : ''}`}
            onClick={() => onLogScaleChange(true)}
          >
            Log
          </button>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Metric</span>
        <div className={styles.segmented}>
          {METRICS.map((m) => (
            <button
              key={m.value}
              className={`${styles.segBtn} ${metric === m.value ? styles.active : ''}`}
              onClick={() => onMetricChange(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
