import styles from './FourLenses.module.css';

const LENSES = [
  {
    name: 'CPI',
    color: 'var(--accent-green)',
    description:
      'The Consumer Price Index measures the average change in prices paid by urban consumers for a basket of goods and services. CPI-adjusted BTC shows what Bitcoin is worth in constant purchasing-power dollars.',
  },
  {
    name: 'M2 Money Supply',
    color: 'var(--accent-green)',
    description:
      'M2 includes cash, checking deposits, savings, and money market funds. When M2 expands, each dollar buys less. M2-adjusted BTC reveals how much of Bitcoin\'s price gain is simply monetary dilution.',
  },
  {
    name: 'Gold',
    color: '#facc15',
    description:
      'Gold has been a store of value for millennia. Pricing BTC in ounces of gold strips out all fiat distortions and compares two scarce assets directly. If BTC/gold rises, Bitcoin is outperforming the oldest money.',
  },
  {
    name: 'Dollar Index (DXY)',
    color: 'var(--accent-indigo)',
    description:
      'The DXY measures the dollar against a basket of major foreign currencies. DXY-adjusted BTC shows Bitcoin\'s price relative to the dollar\'s international strength — when the dollar weakens, this adjustment is more aggressive than CPI.',
  },
];

export function FourLenses() {
  return (
    <div className={styles.grid}>
      {LENSES.map((lens) => (
        <div key={lens.name} className={styles.card} style={{ borderTopColor: lens.color }}>
          <span className={styles.name}>{lens.name}</span>
          <p className={styles.description}>{lens.description}</p>
        </div>
      ))}
    </div>
  );
}
