import { useState } from 'react';
import type { Timeframe, InflationMetric, ComparisonAsset, ViewMode } from '../lib/types';
import styles from './Controls.module.css';

interface ControlsProps {
  anchorYear: number;
  onAnchorYearChange: (year: number) => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  selectedMetrics: InflationMetric[];
  onSelectedMetricsChange: (metrics: InflationMetric[]) => void;
  logScale: boolean;
  onLogScaleChange: (v: boolean) => void;
  showEvents: boolean;
  onShowEventsChange: (v: boolean) => void;
  showGap: boolean;
  onShowGapChange: (v: boolean) => void;
  compareAssets: ComparisonAsset[];
  onCompareAssetsChange: (assets: ComparisonAsset[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const TIMEFRAMES: Timeframe[] = ['1Y', '5Y', 'ALL'];

const COMPARE_OPTIONS: { value: ComparisonAsset; label: string; color: string }[] = [
  { value: 'sp500', label: 'S&P 500', color: '#22d3ee' },
  { value: 'gold', label: 'Gold', color: '#facc15' },
  { value: 'housing', label: 'Housing', color: '#f97316' },
];

const DEFLATOR_METRICS: { value: InflationMetric; label: string }[] = [
  { value: 'CPI', label: 'CPI' },
  { value: 'M2', label: 'M2' },
  { value: 'DXY', label: 'DXY' },
];

export function Controls({
  anchorYear,
  onAnchorYearChange,
  timeframe,
  onTimeframeChange,
  selectedMetrics,
  onSelectedMetricsChange,
  logScale,
  onLogScaleChange,
  showEvents,
  onShowEventsChange,
  showGap,
  onShowGapChange,
  compareAssets,
  onCompareAssetsChange,
  viewMode,
  onViewModeChange,
}: ControlsProps) {
  const [copied, setCopied] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);
  const isGoldMode = selectedMetrics.length === 1 && selectedMetrics[0] === 'GOLD';
  const hideAnchorYear = isGoldMode;
  const compareDisabled = isGoldMode;

  const handleMetricClick = (m: InflationMetric) => {
    if (m === 'GOLD') {
      onSelectedMetricsChange(['GOLD']);
      return;
    }
    if (isGoldMode) {
      onSelectedMetricsChange([m]);
      return;
    }
    if (selectedMetrics.includes(m)) {
      if (selectedMetrics.length > 1) {
        onSelectedMetricsChange(selectedMetrics.filter(x => x !== m));
      }
      // Don't deselect if it's the last one
    } else {
      onSelectedMetricsChange([...selectedMetrics.filter(x => x !== 'GOLD'), m]);
    }
  };

  const toggleCompare = (asset: ComparisonAsset) => {
    if (compareDisabled) return;
    onCompareAssetsChange(
      compareAssets.includes(asset)
        ? compareAssets.filter((a) => a !== asset)
        : [...compareAssets, asset]
    );
  };

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

      <div className={`${styles.group} ${compareAssets.length > 0 ? styles.compareDisabled : ''}`}>
        <span className={styles.label}>View</span>
        <div className={styles.segmented}>
          <button
            className={`${styles.segBtn} ${viewMode === 'compare' ? styles.active : ''}`}
            onClick={() => onViewModeChange('compare')}
          >
            Compare
          </button>
          <button
            className={`${styles.segBtn} ${viewMode === 'realPrice' ? styles.active : ''}`}
            onClick={() => onViewModeChange('realPrice')}
          >
            Real Price
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
          {DEFLATOR_METRICS.map((m) => (
            <button
              key={m.value}
              className={`${styles.segBtn} ${selectedMetrics.includes(m.value) ? styles.active : ''}`}
              onClick={() => handleMetricClick(m.value)}
            >
              {m.label}
            </button>
          ))}
          <span className={styles.metricDivider} />
          <button
            className={`${styles.segBtn} ${isGoldMode ? styles.active : ''}`}
            onClick={() => handleMetricClick('GOLD')}
          >
            Gold
          </button>
        </div>
      </div>

      <div className={`${styles.group} ${isGoldMode ? styles.compareDisabled : ''}`}>
        <span className={styles.label}>Gap</span>
        <div className={styles.segmented}>
          <button
            className={`${styles.segBtn} ${showGap ? styles.active : ''}`}
            onClick={() => onShowGapChange(true)}
          >
            On
          </button>
          <button
            className={`${styles.segBtn} ${!showGap ? styles.active : ''}`}
            onClick={() => onShowGapChange(false)}
          >
            Off
          </button>
        </div>
      </div>

      <div className={`${styles.group} ${compareDisabled ? styles.compareDisabled : ''}`}>
        <span className={styles.label}>Compare</span>
        <div className={styles.checkboxGroup}>
          {COMPARE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`${styles.checkboxLabel} ${compareDisabled ? styles.disabled : ''}`}
              onClick={() => toggleCompare(opt.value)}
            >
              <span
                className={styles.checkboxDot}
                style={{
                  background: compareAssets.includes(opt.value) && !compareDisabled
                    ? opt.color
                    : 'transparent',
                  borderColor: opt.color,
                }}
              />
              {opt.label}
            </label>
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
