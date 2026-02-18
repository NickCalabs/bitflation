import type { LiveDataStatus } from '../lib/types';
import styles from './Footer.module.css';

interface FooterProps {
  liveDataStatus: LiveDataStatus;
}

const BADGE_CONFIG: Record<LiveDataStatus, { className: string; label: string }> = {
  all: { className: styles.live, label: 'Live data active' },
  partial: { className: styles.cached, label: 'Partial live data' },
  none: { className: styles.static, label: 'Static data only' },
};

export function Footer({ liveDataStatus }: FooterProps) {
  const badge = BADGE_CONFIG[liveDataStatus];

  return (
    <footer className={styles.footer}>
      <div className={styles.sources}>
        <span>Data: BLS CPI-U, FRED, CryptoCompare, CoinGecko</span>
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
