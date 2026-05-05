import { useEffect, useState, useCallback } from 'react';
import { Meal, MealDefinitions, MealType, DayScore, Settings } from '../types';
import { fetchMealsForDate, fetchMealDefinitions, addMeal, deleteMeal, fetchSettings, saveSettings } from '../api/meals';
import ScoreSummary from './ScoreSummary';
import MealList from './MealList';
import AddMealSheet from './AddMealSheet';
import SettingsSheet from './SettingsSheet';
import styles from './DayView.module.css';

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = toDateString(new Date());
  const yesterday = toDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function computeScore(meals: Meal[]): DayScore {
  return meals.reduce(
    (acc, m) => ({
      yellowStars: acc.yellowStars + m.yellowStars,
      redStars: acc.redStars + m.redStars,
    }),
    { yellowStars: 0, redStars: 0 }
  );
}

export default function DayView() {
  const [date, setDate] = useState(toDateString(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [definitions, setDefinitions] = useState<MealDefinitions | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load definitions and settings once
  useEffect(() => {
    fetchMealDefinitions()
      .then(setDefinitions)
      .catch(() => setError('Could not load meal definitions.'));
    fetchSettings()
      .then(setSettings)
      .catch(() => setError('Could not load settings.'));
  }, []);

  // Load meals whenever date changes
  const loadMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMealsForDate(date);
      setMeals(data);
    } catch {
      setError('Could not load meals.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  function shiftDate(days: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(toDateString(d));
  }

  async function handleAddMeal(meal: MealType, time: string) {
    const created = await addMeal(date, meal, time);
    setMeals((prev) => [...prev, created].sort((a, b) => a.time.localeCompare(b.time)));
  }

  async function handleDeleteMeal(id: string) {
    await deleteMeal(id);
    setMeals((prev) => prev.filter((m) => m._id !== id));
  }

  async function handleSaveSettings(s: Omit<Settings, '_id'>) {
    const updated = await saveSettings(s);
    setSettings(updated);
  }

  const isToday = date === toDateString(new Date());
  const defaultTime = isToday ? currentTime() : '12:00';
  const score = computeScore(meals);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.navBtn} onClick={() => shiftDate(-1)} type="button">‹</button>
        <span className={styles.dateLabel}>{formatDisplayDate(date)}</span>
        <button
          className={styles.navBtn}
          onClick={() => shiftDate(1)}
          disabled={isToday}
          type="button"
        >
          ›
        </button>
        {!isToday && (
          <button
            className={styles.todayBtn}
            onClick={() => setDate(toDateString(new Date()))}
            type="button"
          >
            Today
          </button>
        )}
        <button
          className={styles.settingsBtn}
          onClick={() => setSettingsOpen(true)}
          type="button"
          aria-label="Settings"
        >
          ⚙️
        </button>
      </header>

      {/* Score */}
      <ScoreSummary score={score} settings={settings} />

      {/* Meals */}
      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p className={styles.loadingMsg}>Loading…</p>
      ) : definitions ? (
        <MealList meals={meals} definitions={definitions} onDelete={handleDeleteMeal} />
      ) : null}

      {/* FAB */}
      <button className={styles.fab} onClick={() => setSheetOpen(true)} type="button" aria-label="Add meal">
        +
      </button>

      {/* Add meal sheet */}
      {sheetOpen && definitions && (
        <AddMealSheet
          definitions={definitions}
          defaultTime={defaultTime}
          onAdd={handleAddMeal}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {/* Settings sheet */}
      {settingsOpen && settings && (
        <SettingsSheet
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
