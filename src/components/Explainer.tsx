import { ShockStats } from './ShockStats';
import type { ShockStatsData } from './ShockStats';
import { FourLenses } from './FourLenses';
import styles from './Explainer.module.css';

interface ExplainerProps {
  stats: ShockStatsData;
}

export function Explainer({ stats }: ExplainerProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.headline}>What is your Bitcoin actually worth?</h2>
      <p className={styles.intro}>
        Bitcoin's price in dollars tells only part of the story. The dollar itself is a moving target
        — its purchasing power erodes through inflation, monetary expansion, and shifting global
        dynamics. Bitflation adjusts BTC's price through four different lenses to reveal its{' '}
        <em>real</em> value.
      </p>

      <ShockStats stats={stats} />

      <h3 className={styles.subhead}>The Bitflation Index</h3>
      <p className={styles.prose}>
        The Bitflation Index blends official CPI inflation with M2 money supply growth
        to estimate real purchasing power loss. CPI understates — it's a curated basket
        that excludes asset prices. M2 overstates — not all new dollars reach consumers.
        The Bitflation Index splits the difference.
      </p>

      <h3 className={styles.subhead}>Dig deeper: individual metrics</h3>
      <FourLenses />

      <h3 className={styles.subhead}>How to read this chart</h3>
      <p className={styles.prose}>
        The <span className={styles.nominal}>indigo line</span> is Bitcoin's raw dollar price. The{' '}
        <span className={styles.adjusted}>green line</span> is the inflation-adjusted price — what
        those dollars are worth in constant purchasing power of your selected anchor year. When the
        green line is <em>below</em> the indigo line, inflation has overstated your gains. When
        viewing Gold mode, the <span className={styles.gold}>yellow line</span> shows BTC priced in
        ounces of gold, using the right Y-axis.
      </p>
    </section>
  );
}
