import styles from './ShockStats.module.css';

export interface ShockStatsData {
  dollarLoss: number | null;       // e.g. 0.22 = 22% purchasing power lost
  btcNominalGain: number | null;   // e.g. 14.5 = 1450% gain
  btcRealGain: number | null;      // CPI-adjusted gain multiplier
  bfiLoss: number | null;          // e.g. 0.35 = 35% blended purchasing power lost
  btcGoldChange: number | null;    // e.g. 3.2 = 3.2x in gold terms
}

interface ShockStatsProps {
  stats: ShockStatsData;
}

function formatPct(value: number | null): string {
  if (value === null) return '\u2014';
  return `${(value * 100).toFixed(0)}%`;
}

function formatMultiple(value: number | null): string {
  if (value === null) return '\u2014';
  return `${value.toFixed(1)}x`;
}

export function ShockStats({ stats }: ShockStatsProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <span className={styles.number}>{formatPct(stats.dollarLoss)}</span>
        <span className={styles.desc}>Dollar purchasing power lost since 2020 (CPI)</span>
      </div>
      <div className={styles.card}>
        <span className={styles.number}>{formatMultiple(stats.btcNominalGain)}</span>
        <span className={styles.desc}>BTC nominal price gain since 2020</span>
      </div>
      <div className={styles.card}>
        <span className={styles.number}>{formatMultiple(stats.btcRealGain)}</span>
        <span className={styles.desc}>BTC real return since 2020 (CPI-adjusted)</span>
      </div>
      <div className={styles.card}>
        <span className={styles.number}>{formatPct(stats.bfiLoss)}</span>
        <span className={styles.desc}>Blended purchasing power loss since 2020 (Bitflation Index)</span>
      </div>
    </div>
  );
}
