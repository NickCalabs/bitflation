import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <img
        src="/bitflation-logo.png"
        alt="Bitflation"
        className={styles.logoImg}
      />
      <span className={styles.tagline}>Bitcoin in real dollars</span>
    </header>
  );
}
