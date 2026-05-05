import { Meal, MealDefinitions, MealType } from '../types';
import styles from './MealList.module.css';

interface Props {
  meals: Meal[];
  definitions: MealDefinitions;
  onDelete: (id: string) => void;
}

export default function MealList({ meals, definitions, onDelete }: Props) {
  if (meals.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.angel}>👼</span>
        <p>No meals yet. Add one!</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {meals.map((m) => {
        const def = definitions[m.meal as MealType];
        const emoji = def?.emoji ?? '📷';
        const label = m.meal === 'analyzed' ? (m.free || 'ניתוח תמונה') : (def?.label ?? m.meal);
        return (
          <li key={m._id} className={styles.item}>
            <span className={styles.time}>{m.time}</span>
            <span className={styles.emoji}>{emoji}</span>
            <span className={styles.name}>{label}</span>
            <span className={styles.stars}>
              {m.yellowStars > 0 && <span>{'⭐'.repeat(m.yellowStars)}</span>}
              {m.redStars > 0 && <span className={styles.redStars}>{'★'.repeat(m.redStars)}</span>}
            </span>
            <button
              className={styles.delete}
              onClick={() => onDelete(m._id)}
              title="Remove meal"
              type="button"
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
