import { useState } from 'react';
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
  showEvents: boolean;
  onShowEventsChange: (v: boolean) => void;
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
  showEvents,
  onShowEventsChange,
}: ControlsProps) {
  const [copied, setCopied] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);
  const hideAnchorYear = metric === 'GOLD';

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
        <span className={styles.label}>Events</span>
        <div className={styles.segmented}>
          <button
            className={`${styles.segBtn} ${showEvents ? styles.active : ''}`}
            onClick={() => onShowEventsChange(true)}
          >
            On
          </button>
          <button
            className={`${styles.segBtn} ${!showEvents ? styles.active : ''}`}
            onClick={() => onShowEventsChange(false)}
          >
            Off
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

      <div className={styles.shareWrap}>
        <button className={styles.shareBtn} onClick={handleShare} title="Copy link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        {copied && <span className={styles.toast}>Link copied!</span>}
      </div>
    </div>
  );
}
