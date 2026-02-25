import { ShockStats } from './ShockStats';
import type { ShockStatsData } from './ShockStats';
import { FourLenses } from './FourLenses';
import type { CurrencyConfig } from '../lib/currencies';
import styles from './Explainer.module.css';

interface ExplainerProps {
  stats: ShockStatsData;
  currencyConfig: CurrencyConfig;
}

export function Explainer({ stats, currencyConfig }: ExplainerProps) {
  const { currencyNameSingular, currencyName, moneySupplyLabel, cpiLabel } = currencyConfig;

  return (
    <section className={styles.section}>
      <h2 className={styles.headline}>What is your Bitcoin actually worth?</h2>
      <p className={styles.intro}>
        Bitcoin's price in {currencyName} tells only part of the story. The {currencyNameSingular.toLowerCase()} itself is a moving target
        — its purchasing power erodes through inflation, monetary expansion, and shifting global
        dynamics. Bitflation adjusts BTC's price through four different lenses to reveal its{' '}
        <em>real</em> value.
      </p>

      <ShockStats stats={stats} currencyConfig={currencyConfig} />

      <h3 className={styles.subhead}>The Bitflation Index</h3>
      <p className={styles.prose}>
        The Bitflation Index blends official {cpiLabel} inflation with {moneySupplyLabel} money supply growth
        to estimate real purchasing power loss. {cpiLabel} understates — it's a curated basket
        that excludes asset prices. {moneySupplyLabel} overstates — not all new money reaches consumers.
        The Bitflation Index splits the difference.
      </p>

      <h3 className={styles.subhead}>Dig deeper: individual metrics</h3>
      <FourLenses currencyConfig={currencyConfig} />

      <h3 className={styles.subhead}>How to read this chart</h3>
      <p className={styles.prose}>
        The <span className={styles.nominal}>indigo line</span> is Bitcoin's raw {currencyName.toLowerCase()} price. The{' '}
        <span className={styles.adjusted}>green line</span> is the inflation-adjusted price — what
        those {currencyName} are worth in constant purchasing power of your selected anchor year. When the
        green line is <em>below</em> the indigo line, inflation has overstated your gains. When
        viewing Gold mode, the <span className={styles.gold}>yellow line</span> shows BTC priced in
        ounces of gold, using the right Y-axis.
      </p>
    </section>
  );
}
