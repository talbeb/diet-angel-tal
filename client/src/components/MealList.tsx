import { Meal, MealDefinitions } from '../types';
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
        const def = definitions[m.meal];
        return (
          <li key={m._id} className={styles.item}>
            <span className={styles.time}>{m.time}</span>
            <span className={styles.emoji}>{def.emoji}</span>
            <span className={styles.name}>{def.label}</span>
            <span className={styles.stars}>
              {m.yellowStars > 0 && <span>{'⭐'.repeat(m.yellowStars)}</span>}
              {m.redStars > 0 && <span>{'🔴'.repeat(m.redStars)}</span>}
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
