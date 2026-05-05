import { useEffect, useMemo, useState } from 'react';
import { MealCatalogItem } from '../types';
import { fetchMealCatalog } from '../api/meals';
import styles from './MealCatalogSheet.module.css';

interface Props {
  defaultTime: string;
  onAdd: (item: MealCatalogItem, time: string) => Promise<void>;
  onClose: () => void;
}

function groupByCategory(items: MealCatalogItem[]): [string, MealCatalogItem[]][] {
  const map = new Map<string, MealCatalogItem[]>();
  for (const item of items) {
    const cat = item.category || 'כללי';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return [...map.entries()].sort(([a], [b]) => {
    if (a === 'כללי') return 1;
    if (b === 'כללי') return -1;
    return a.localeCompare(b, 'he');
  });
}

function HalfStar() {
  return (
    <span className={styles.halfStar}>
      <span className={styles.halfStarBg}>★</span>
      <span className={styles.halfStarFill}>★</span>
    </span>
  );
}

function Stars({ yellow, red }: { yellow: number; red: number }) {
  function render(count: number, cls: string) {
    if (count <= 0) return null;
    const full = Math.floor(count);
    const half = count - full >= 0.5;
    return (
      <span className={cls}>
        {'★'.repeat(full)}
        {half && <HalfStar />}
      </span>
    );
  }
  return (
    <span className={styles.stars}>
      {render(red, styles.redStars)}
      {render(yellow, styles.yellowStars)}
    </span>
  );
}

export default function MealCatalogSheet({ defaultTime, onAdd, onClose }: Props) {
  const [items, setItems] = useState<MealCatalogItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MealCatalogItem | null>(null);
  const [time, setTime] = useState(defaultTime);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchMealCatalog()
      .then(setItems)
      .catch(() => setLoadError(true));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.mealName.toLowerCase().includes(q));
  }, [items, query]);

  const groups = useMemo(() => groupByCategory(filtered), [filtered]);

  async function handleAdd() {
    if (!selected) return;
    setAdding(true);
    try {
      await onAdd(selected, time);
      onClose();
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <h2 className={styles.title}>🍽️ Add a meal</h2>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              autoComplete="off"
            />
            {query && (
              <button className={styles.clearBtn} onClick={() => { setQuery(''); setSelected(null); }} type="button">
                ×
              </button>
            )}
          </div>
        </div>

        <div className={styles.list}>
          {loadError && <p className={styles.errorMsg}>Could not load catalog.</p>}
          {!loadError && items.length === 0 && <p className={styles.loadingMsg}>Loading…</p>}
          {groups.length === 0 && items.length > 0 && (
            <p className={styles.emptyMsg}>No results for "{query}"</p>
          )}
          {groups.map(([category, catItems]) => (
            <div key={category}>
              <div className={styles.categoryHeader}>{category}</div>
              {catItems.map((item) => (
                <button
                  key={item._id}
                  className={`${styles.row} ${selected?._id === item._id ? styles.rowSelected : ''}`}
                  onClick={() => setSelected(item)}
                  type="button"
                >
                  <Stars yellow={item.numberOfYellowStars} red={item.numberOfRedStars} />
                  <span className={styles.nameCol}>
                    <span className={styles.mealName}>{item.mealName}</span>
                    <span className={styles.amount}>{item.amount}</span>
                  </span>
                  {selected?._id === item._id && <span className={styles.check}>✓</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.timePicker}>
            <label className={styles.timeLabel} htmlFor="catalog-meal-time">🕐 Time</label>
            <input
              id="catalog-meal-time"
              type="time"
              className={styles.timeInput}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={onClose} type="button">Cancel</button>
            <button
              className={styles.add}
              onClick={handleAdd}
              disabled={!selected || adding}
              type="button"
            >
              {adding ? 'Adding…' : 'Add meal ✓'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
