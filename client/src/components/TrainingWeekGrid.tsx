import { Training, TrainingSuggestion } from '../types';
import styles from './TrainingWeekGrid.module.css';

interface Props {
  suggestions: TrainingSuggestion[];
  confirmedThisWeek: Training[];
  confirming: string | null; // "date|startTime" of the slot being confirmed
  onConfirm: (s: TrainingSuggestion) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekDates(): string[] {
  const today = new Date();
  const day = today.getDay();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - day + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
}

export default function TrainingWeekGrid({ suggestions, confirmedThisWeek, confirming, onConfirm }: Props) {
  const weekDates = getWeekDates();
  const today = new Date().toISOString().slice(0, 10);

  const confirmedSet = new Set(confirmedThisWeek.map((t) => `${t.date}|${t.startTime}`));

  const suggestionsByDate = new Map<string, TrainingSuggestion[]>();
  for (const s of suggestions) {
    const list = suggestionsByDate.get(s.date) ?? [];
    list.push(s);
    suggestionsByDate.set(s.date, list);
  }

  return (
    <div className={styles.grid}>
      {weekDates.map((date) => {
        const dayIdx = new Date(date + 'T00:00:00').getDay();
        const isToday = date === today;
        const daySuggestions = suggestionsByDate.get(date) ?? [];
        const confirmedForDay = confirmedThisWeek.filter((t) => t.date === date);

        return (
          <div key={date} className={`${styles.dayCol} ${isToday ? styles.today : ''}`}>
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{DAY_LABELS[dayIdx]}</span>
              <span className={styles.dayNum}>{parseInt(date.slice(8))}</span>
            </div>

            {confirmedForDay.map((t) => (
              <div key={t._id} className={styles.confirmedSlot}>
                <span className={styles.slotTime}>{formatTime(t.startTime)}</span>
                <span className={styles.checkmark}>✓</span>
              </div>
            ))}

            {daySuggestions.map((s) => {
              const key = `${s.date}|${s.startTime}`;
              const isConfirmed = confirmedSet.has(key);
              const isConfirming = confirming === key;

              if (isConfirmed) return null;

              return (
                <button
                  key={key}
                  className={`${styles.suggestionSlot} ${isConfirming ? styles.confirming : ''}`}
                  onClick={() => onConfirm(s)}
                  disabled={isConfirming}
                  title={s.reason}
                >
                  <span className={styles.slotTime}>{formatTime(s.startTime)}</span>
                  <span className={styles.slotEnd}>{formatTime(s.endTime)}</span>
                  {isConfirming ? (
                    <span className={styles.slotLoading}>…</span>
                  ) : (
                    <span className={styles.confirmBtn}>+</span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
