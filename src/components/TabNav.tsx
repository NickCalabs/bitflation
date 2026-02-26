import type { AppTab, CurrencyCode } from '../lib/types';
import styles from './TabNav.module.css';

interface TabNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  currency: CurrencyCode;
}

const USD_EUR_TABS: { key: AppTab; label: string }[] = [
  { key: 'chart', label: 'Chart' },
  { key: 'calculator', label: 'Calculator' },
];

const IDR_TABS: { key: AppTab; label: string }[] = [
  { key: 'chart', label: 'Chart' },
  { key: 'dca', label: 'DCA' },
];

export function TabNav({ activeTab, onTabChange, currency }: TabNavProps) {
  const tabs = currency === 'IDR' ? IDR_TABS : USD_EUR_TABS;
  return (
    <nav className={styles.nav}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          className={`${styles.tab} ${activeTab === key ? styles.active : ''}`}
          onClick={() => onTabChange(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
