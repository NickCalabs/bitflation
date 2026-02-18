import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>&#x20BF;</span>
        <span className={styles.logoText}>bitflation</span>
      </div>
      <span className={styles.tagline}>Bitcoin in real dollars</span>
    </header>
  );
}
