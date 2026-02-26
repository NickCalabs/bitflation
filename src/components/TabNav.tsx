import type { AppTab, CurrencyCode } from '../lib/types';
import styles from './TabNav.module.css';

interface TabNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  currency: CurrencyCode;
}

const BASE_TABS: { key: AppTab; label: string }[] = [
  { key: 'chart', label: 'Chart' },
  { key: 'calculator', label: 'Calculator' },
];

export function TabNav({ activeTab, onTabChange, currency }: TabNavProps) {
  const tabs = currency === 'IDR' ? [...BASE_TABS, { key: 'dca' as const, label: 'DCA' }] : BASE_TABS;
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
