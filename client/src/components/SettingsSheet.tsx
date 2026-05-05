import { useState } from 'react';
import { Settings } from '../types';
import styles from './SettingsSheet.module.css';

interface Props {
  settings: Settings;
  onSave: (s: Omit<Settings, '_id'>) => Promise<void>;
  onClose: () => void;
}

function toNum(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) || val.trim() === '' ? null : n;
}

const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SettingsSheet({ settings, onSave, onClose }: Props) {
  const [weightGoal, setWeightGoal] = useState(settings.weightGoal?.toString() ?? '');
  const [maxYellow, setMaxYellow] = useState(settings.maxYellowStars?.toString() ?? '');
  const [maxRed, setMaxRed] = useState(settings.maxRedStars?.toString() ?? '');
  const [trainingsPerWeek, setTrainingsPerWeek] = useState(settings.trainingsPerWeek?.toString() ?? '');
  const [preferredDays, setPreferredDays] = useState<number[]>(settings.preferredDays ?? []);
  const [preferredTimeFrom, setPreferredTimeFrom] = useState(settings.preferredTimeFrom ?? '');
  const [preferredTimeTo, setPreferredTimeTo] = useState(settings.preferredTimeTo ?? '');
  const [sessionDurationMin, setSessionDurationMin] = useState(settings.sessionDurationMin?.toString() ?? '');
  const [loading, setLoading] = useState(false);

  function toggleDay(idx: number) {
    setPreferredDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  }

  async function handleSave() {
    setLoading(true);
    try {
      await onSave({
        weightGoal: toNum(weightGoal),
        maxYellowStars: toNum(maxYellow),
        maxRedStars: toNum(maxRed),
        trainingsPerWeek: toNum(trainingsPerWeek),
        preferredDays,
        preferredTimeFrom: preferredTimeFrom || null,
        preferredTimeTo: preferredTimeTo || null,
        sessionDurationMin: toNum(sessionDurationMin),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <h2 className={styles.title}>⚙️ Settings</h2>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="weight-goal">
              🎯 Weight goal (kg)
            </label>
            <input
              id="weight-goal"
              type="number"
              className={styles.input}
              placeholder="e.g. 70"
              value={weightGoal}
              onChange={(e) => setWeightGoal(e.target.value)}
              min={0}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="max-yellow">
              ⭐ Max yellow stars / day
            </label>
            <input
              id="max-yellow"
              type="number"
              className={styles.input}
              placeholder="e.g. 4"
              value={maxYellow}
              onChange={(e) => setMaxYellow(e.target.value)}
              min={0}
              step={1}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="max-red">
              <span style={{ color: '#e53935' }}>★</span> Max red stars / day
            </label>
            <input
              id="max-red"
              type="number"
              className={styles.input}
              placeholder="e.g. 2"
              value={maxRed}
              onChange={(e) => setMaxRed(e.target.value)}
              min={0}
              step={1}
            />
          </div>

          <div className={styles.sectionDivider}>🏋️ Training</div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="trainings-per-week">
              Trainings per week
            </label>
            <input
              id="trainings-per-week"
              type="number"
              className={styles.input}
              placeholder="e.g. 3"
              value={trainingsPerWeek}
              onChange={(e) => setTrainingsPerWeek(e.target.value)}
              min={1}
              max={7}
              step={1}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Preferred days</label>
            <div className={styles.dayGrid}>
              {ALL_DAYS.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayBtn} ${preferredDays.includes(idx) ? styles.dayBtnActive : ''}`}
                  onClick={() => toggleDay(idx)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="time-from">From</label>
              <input
                id="time-from"
                type="time"
                className={styles.input}
                value={preferredTimeFrom}
                onChange={(e) => setPreferredTimeFrom(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="time-to">To</label>
              <input
                id="time-to"
                type="time"
                className={styles.input}
                value={preferredTimeTo}
                onChange={(e) => setPreferredTimeTo(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="session-duration">
              Session duration (min)
            </label>
            <input
              id="session-duration"
              type="number"
              className={styles.input}
              placeholder="e.g. 60"
              value={sessionDurationMin}
              onChange={(e) => setSessionDurationMin(e.target.value)}
              min={15}
              step={15}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose} type="button">
            Cancel
          </button>
          <button className={styles.save} onClick={handleSave} disabled={loading} type="button">
            {loading ? 'Saving…' : 'Save ✓'}
          </button>
        </div>
      </div>
    </>
  );
}
