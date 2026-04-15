import { MealDefinition, MealType } from '../types';
import styles from './MealCard.module.css';

interface Props {
  mealType: MealType;
  definition: MealDefinition;
  selected: boolean;
  onSelect: (meal: MealType) => void;
}

export default function MealCard({ mealType, definition, selected, onSelect }: Props) {
  const { label, emoji, yellowStars, redStars } = definition;

  return (
    <button
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={() => onSelect(mealType)}
      type="button"
    >
      <span className={styles.emoji}>{emoji}</span>
      <span className={styles.label}>{label}</span>
      <span className={styles.stars}>
        {yellowStars > 0 && <span>{'⭐'.repeat(yellowStars)}</span>}
        {redStars > 0 && <span>{'🔴'.repeat(redStars)}</span>}
        {yellowStars === 0 && redStars === 0 && <span className={styles.noStars}>—</span>}
      </span>
    </button>
  );
}
