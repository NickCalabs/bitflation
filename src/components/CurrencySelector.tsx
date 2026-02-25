import type { CurrencyCode } from '../lib/types';
import { CURRENCIES, CURRENCY_CODES } from '../lib/currencies';
import styles from './CurrencySelector.module.css';

interface CurrencySelectorProps {
  currency: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
}

export function CurrencySelector({ currency, onChange }: CurrencySelectorProps) {
  return (
    <div className={styles.selector}>
      {CURRENCY_CODES.map((code) => {
        const config = CURRENCIES[code];
        return (
          <button
            key={code}
            className={`${styles.btn} ${currency === code ? styles.active : ''}`}
            onClick={() => onChange(code)}
          >
            <span className={styles.flag}>{config.flag}</span>
            <span className={styles.code}>{code}</span>
          </button>
        );
      })}
    </div>
  );
}
