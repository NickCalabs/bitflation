import type { CurrencyConfig } from '../lib/currencies';
import styles from './FourLenses.module.css';

interface FourLensesProps {
  currencyConfig: CurrencyConfig;
}

interface Lens {
  key: string;
  name: string;
  color: string;
  description: string;
}

function buildLenses(config: CurrencyConfig): Lens[] {
  const { cpiLabel, moneySupplyLabel, currencyName, currencyNameSingular } = config;
  const singular = currencyNameSingular.toLowerCase();

  const lenses: Lens[] = [
    {
      key: 'cpi',
      name: cpiLabel,
      color: 'var(--accent-green)',
      description:
        cpiLabel === 'HICP'
          ? `The Harmonised Index of Consumer Prices measures price changes across the euro area. HICP-adjusted BTC shows what Bitcoin is worth in constant purchasing-power ${currencyName}.`
          : `The Consumer Price Index measures the average change in prices paid by consumers for a basket of goods and services. ${cpiLabel}-adjusted BTC shows what Bitcoin is worth in constant purchasing-power ${currencyName}.`,
    },
    {
      key: 'm2',
      name: `${moneySupplyLabel} Money Supply`,
      color: 'var(--accent-green)',
      description:
        moneySupplyLabel === 'M3'
          ? `M3 includes cash, deposits, money market funds, and repurchase agreements. When M3 expands, each ${singular} buys less. M3-adjusted BTC reveals how much of Bitcoin's price gain is simply monetary dilution.`
          : `${moneySupplyLabel} includes cash, checking deposits, savings, and money market funds. When ${moneySupplyLabel} expands, each ${singular} buys less. ${moneySupplyLabel}-adjusted BTC reveals how much of Bitcoin's price gain is simply monetary dilution.`,
    },
    {
      key: 'gold',
      name: 'Gold',
      color: '#facc15',
      description:
        'Gold has been a store of value for millennia. Pricing BTC in ounces of gold strips out all fiat distortions and compares two scarce assets directly. If BTC/gold rises, Bitcoin is outperforming the oldest money.',
    },
  ];

  // Only show DXY for currencies that have it
  if (config.availableMetrics.includes('DXY')) {
    lenses.push({
      key: 'dxy',
      name: 'Dollar Index (DXY)',
      color: 'var(--accent-indigo)',
      description:
        'The DXY measures the dollar against a basket of major foreign currencies. DXY-adjusted BTC shows Bitcoin\'s price relative to the dollar\'s international strength — when the dollar weakens, this adjustment is more aggressive than CPI.',
    });
  }

  return lenses;
}

export function FourLenses({ currencyConfig }: FourLensesProps) {
  const lenses = buildLenses(currencyConfig);

  return (
    <div className={styles.grid}>
      {lenses.map((lens) => (
        <div key={lens.key} className={styles.card} style={{ borderTopColor: lens.color }}>
          <span className={styles.name}>{lens.name}</span>
          <p className={styles.description}>{lens.description}</p>
        </div>
      ))}
    </div>
  );
}
