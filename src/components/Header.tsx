import type { CurrencyCode } from '../lib/types';
import type { CurrencyConfig } from '../lib/currencies';
import { CurrencySelector } from './CurrencySelector';
import styles from './Header.module.css';

interface HeaderProps {
  currency: CurrencyCode;
  currencyConfig: CurrencyConfig;
  onCurrencyChange: (code: CurrencyCode) => void;
}

export function Header({ currency, currencyConfig, onCurrencyChange }: HeaderProps) {
  return (
    <header className={styles.header}>
      <img
        src="/bitflation-logo-cartoon.png"
        alt="Bitflation"
        className={styles.logoImg}
      />
      <div className={styles.right}>
        <CurrencySelector currency={currency} onChange={onCurrencyChange} />
        <span className={styles.tagline}>Bitcoin in real {currencyConfig.currencyName}</span>
      </div>
    </header>
  );
}
