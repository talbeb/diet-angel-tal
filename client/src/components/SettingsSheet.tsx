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

export default function SettingsSheet({ settings, onSave, onClose }: Props) {
  const [weightGoal, setWeightGoal] = useState(settings.weightGoal?.toString() ?? '');
  const [maxYellow, setMaxYellow] = useState(settings.maxYellowStars?.toString() ?? '');
  const [maxRed, setMaxRed] = useState(settings.maxRedStars?.toString() ?? '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await onSave({
        weightGoal: toNum(weightGoal),
        maxYellowStars: toNum(maxYellow),
        maxRedStars: toNum(maxRed),
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
              🔴 Max red stars / day
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
