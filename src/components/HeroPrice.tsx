import type { AdjustedPricePoint, GoldPricePoint, InflationMetric } from '../lib/types';
import { formatUSD, formatPercent, formatGoldOz } from '../lib/formatters';
import styles from './HeroPrice.module.css';

interface HeroPriceProps {
  latestPoint: AdjustedPricePoint | GoldPricePoint | null;
  anchorYear: number;
  metric: InflationMetric;
}

export function HeroPrice({ latestPoint, anchorYear, metric }: HeroPriceProps) {
  if (!latestPoint) {
    return <div className={styles.noData}>Loading price data...</div>;
  }

  if (metric === 'GOLD') {
    const point = latestPoint as GoldPricePoint;
    return (
      <div className={styles.hero}>
        <div className={styles.adjustedRow}>
          <span className={styles.btcSymbol}>&#x20BF;</span>
          <span className={styles.adjustedPrice}>{formatGoldOz(point.goldOunces)}</span>
          <span className={styles.anchorLabel}>gold</span>
        </div>
        <div className={styles.nominalRow}>
          Gold price: <span className={styles.nominalPrice}>{formatUSD(point.goldPriceUsd)}/oz</span>
        </div>
        <div className={styles.nominalRow}>
          Nominal: <span className={styles.nominalPrice}>{formatUSD(point.nominalPrice)}</span>
        </div>
      </div>
    );
  }

  const point = latestPoint as AdjustedPricePoint;
  const { nominalPrice, adjustedPrice } = point;
  const diff = (adjustedPrice - nominalPrice) / nominalPrice;
  const currentYear = new Date().getFullYear();
  const isEstimate = anchorYear >= currentYear;

  return (
    <div className={styles.hero}>
      <div className={styles.adjustedRow}>
        <span className={styles.btcSymbol}>&#x20BF;</span>
        <span className={styles.adjustedPrice}>{formatUSD(adjustedPrice)}</span>
        <span className={styles.anchorLabel}>
          in {anchorYear} USD{isEstimate && <span className={styles.estimate}> (est.)</span>}
        </span>
      </div>
      <div className={styles.nominalRow}>
        Nominal: <span className={styles.nominalPrice}>{formatUSD(nominalPrice)}</span>
      </div>
      <div className={`${styles.diffRow} ${diff >= 0 ? styles.positive : styles.negative}`}>
        {formatPercent(diff)} purchasing power {diff >= 0 ? 'gain' : 'loss'}
      </div>
    </div>
  );
}
