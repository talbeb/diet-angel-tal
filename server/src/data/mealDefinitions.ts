export type MealType = 'pizza' | 'salad' | 'egg' | 'analyzed';

export interface MealDefinition {
  label: string;
  emoji: string;
  yellowStars: number;
  redStars: number;
  free: string;
}

export const MEAL_DEFINITIONS: Record<MealType, MealDefinition> = {
  pizza:    { label: 'Pizza',    emoji: '🍕', yellowStars: 0, redStars: 2, free: '' },
  salad:    { label: 'Salad',    emoji: '🥗', yellowStars: 2, redStars: 0, free: '' },
  egg:      { label: 'Egg',      emoji: '🥚', yellowStars: 1, redStars: 0, free: '' },
  analyzed: { label: 'Analyzed', emoji: '📷', yellowStars: 0, redStars: 0, free: '' },
};

export const MEAL_TYPES = Object.keys(MEAL_DEFINITIONS) as MealType[];
