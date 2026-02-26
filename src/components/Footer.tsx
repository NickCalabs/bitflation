import type { LiveDataStatus } from '../lib/types';
import type { CurrencyCode } from '../lib/types';
import type { CurrencyConfig } from '../lib/currencies';
import styles from './Footer.module.css';

interface FooterProps {
  liveDataStatus: LiveDataStatus;
  currencyConfig: CurrencyConfig;
  currency: CurrencyCode;
}

const BADGE_CONFIG: Record<LiveDataStatus, { className: string; label: string }> = {
  all: { className: styles.live, label: 'Live data active' },
  partial: { className: styles.cached, label: 'Partial live data' },
  none: { className: styles.static, label: 'Static data only' },
};

export function Footer({ liveDataStatus, currencyConfig, currency }: FooterProps) {
  const badge = BADGE_CONFIG[liveDataStatus];
  const showFooter = currency !== 'IDR';

  if (!showFooter) return null;

  return (
    <footer className={styles.footer}>
      <div className={styles.sources}>
        <span>Data: {currencyConfig.footerAttribution}</span>
        <span>|</span>
        <span>
          <span className={styles.badge}>
            <span className={`${styles.badgeDot} ${badge.className}`} />
            {badge.label}
          </span>
        </span>
      </div>
      <span>Not financial advice</span>
    </footer>
  );
}
