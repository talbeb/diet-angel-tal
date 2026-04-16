import styles from './BottomNav.module.css';

export type Tab = 'daily' | 'weight' | 'analyze';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'daily',   label: 'Daily',   icon: '📅' },
  { id: 'analyze', label: 'ניתוח',   icon: '📷' },
  { id: 'weight',  label: 'Weight',  icon: '⚖️' },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
