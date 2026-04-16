import { useEffect, useState } from 'react';
import { WeightEntry, Settings } from '../types';
import {
  fetchWeightEntries, addWeightEntry, deleteWeightEntry, fetchSettings,
} from '../api/meals';
import WeightChart from './WeightChart';
import styles from './WeightView.module.css';

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WeightView() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [dateInput, setDateInput] = useState(toDateString(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchWeightEntries(), fetchSettings()])
      .then(([e, s]) => { setEntries(e); setSettings(s); })
      .catch(() => setError('Could not load data.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return;
    const entry = await addWeightEntry(dateInput, w);
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== entry.date);
      return [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
    });
    setWeightInput('');
  }

  async function handleDelete(id: string) {
    await deleteWeightEntry(id);
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }

  // Stats
  const goal = settings?.weightGoal ?? null;
  const first = entries[0]?.weight ?? null;
  const current = entries[entries.length - 1]?.weight ?? null;

  const totalLossPct =
    first != null && current != null && first !== current
      ? ((first - current) / first) * 100
      : null;

  const progressPct =
    first != null && current != null && goal != null && first !== goal
      ? Math.min(100, Math.max(0, ((first - current) / (first - goal)) * 100))
      : null;

  const onTrack =
    goal != null && current != null && first != null
      ? (goal < first ? current <= first : current >= first)
      : null;

  const chartData = entries.map((e) => ({
    date: formatShortDate(e.date),
    weight: e.weight,
  }));

  const chartColor = onTrack === false ? '#e53935' : '#4caf50';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>⚖️ Weight Journey</h1>
      </header>

      {/* Stats row */}
      {current != null && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Current</span>
            <span className={styles.statValue}>{current} kg</span>
          </div>
          {goal != null && (
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Goal</span>
              <span className={styles.statValue}>{goal} kg</span>
            </div>
          )}
          {totalLossPct != null && (
            <div className={`${styles.statCard} ${onTrack ? styles.green : styles.red}`}>
              <span className={styles.statLabel}>Lost so far</span>
              <span className={styles.statValue}>
                {totalLossPct > 0 ? '-' : '+'}{Math.abs(totalLossPct).toFixed(1)}%
              </span>
            </div>
          )}
          {progressPct != null && (
            <div className={`${styles.statCard} ${onTrack ? styles.green : styles.red}`}>
              <span className={styles.statLabel}>To goal</span>
              <span className={styles.statValue}>{progressPct.toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <p className={styles.msg}>Loading…</p>
      ) : error ? (
        <p className={styles.errorMsg}>{error}</p>
      ) : entries.length < 2 ? (
        <p className={styles.msg}>Add at least 2 entries to see the graph.</p>
      ) : (
        <div className={styles.chart}>
          <WeightChart data={chartData} goal={goal} color={chartColor} />
        </div>
      )}

      {/* Add entry */}
      <div className={styles.addSection}>
        <h2 className={styles.addTitle}>Log weight</h2>
        <div className={styles.addRow}>
          <input
            type="date"
            className={styles.input}
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
          <input
            type="number"
            className={styles.input}
            placeholder="kg"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            min={0}
            step={0.1}
          />
          <button
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={!weightInput}
            type="button"
          >
            Add
          </button>
        </div>
      </div>

      {/* Entry list */}
      {entries.length > 0 && (
        <ul className={styles.list}>
          {[...entries].reverse().map((e) => (
            <li key={e._id} className={styles.listItem}>
              <span className={styles.entryDate}>{formatShortDate(e.date)}</span>
              <span className={styles.entryWeight}>{e.weight} kg</span>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(e._id)}
                type="button"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
