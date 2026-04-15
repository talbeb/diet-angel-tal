import { useState } from 'react';
import { MealDefinitions, MealType } from '../types';
import MealCard from './MealCard';
import styles from './AddMealSheet.module.css';

interface Props {
  definitions: MealDefinitions;
  defaultTime: string;
  onAdd: (meal: MealType, time: string) => Promise<void>;
  onClose: () => void;
}

export default function AddMealSheet({ definitions, defaultTime, onAdd, onClose }: Props) {
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);
  const [time, setTime] = useState(defaultTime);
  const [loading, setLoading] = useState(false);

  const mealTypes = Object.keys(definitions) as MealType[];

  async function handleAdd() {
    if (!selectedMeal) return;
    setLoading(true);
    try {
      await onAdd(selectedMeal, time);
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

        <h2 className={styles.title}>🍽️ Add a meal</h2>

        <div className={styles.grid}>
          {mealTypes.map((type) => (
            <MealCard
              key={type}
              mealType={type}
              definition={definitions[type]}
              selected={selectedMeal === type}
              onSelect={setSelectedMeal}
            />
          ))}
        </div>

        <div className={styles.timePicker}>
          <label className={styles.timeLabel} htmlFor="meal-time">
            🕐 Time
          </label>
          <input
            id="meal-time"
            type="time"
            className={styles.timeInput}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={styles.add}
            onClick={handleAdd}
            disabled={!selectedMeal || loading}
            type="button"
          >
            {loading ? 'Adding…' : 'Add meal ✓'}
          </button>
        </div>
      </div>
    </>
  );
}
