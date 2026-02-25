import type { AppTab } from '../lib/types';
import styles from './TabNav.module.css';

interface TabNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { key: AppTab; label: string }[] = [
  { key: 'chart', label: 'Chart' },
  { key: 'calculator', label: 'Calculator' },
];

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className={styles.nav}>
      {TABS.map(({ key, label }) => (
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
