import styles from './Footer.module.css';

interface FooterProps {
  hasLiveData: boolean;
}

export function Footer({ hasLiveData }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.sources}>
        <span>Data: BLS CPI-U, CryptoCompare</span>
        <span>|</span>
        <span>
          <span className={styles.badge}>
            <span className={`${styles.badgeDot} ${hasLiveData ? styles.live : styles.static}`} />
            {hasLiveData ? 'Live data active' : 'Static data only'}
          </span>
        </span>
      </div>
      <span>Not financial advice</span>
    </footer>
  );
}
