export type MealType = 'pizza' | 'salad' | 'egg' | 'analyzed';

export interface RawIngredient {
  name: string;
  amount: string;
  kcal: number;
  dominant_macro: 'carb' | 'fat' | 'protein' | 'free';
}

export interface IngredientResult extends RawIngredient {
  userKcal: number;   // user-adjusted kcal (starts equal to kcal)
  stars: number;
  color: 'red' | 'yellow' | 'free';
}

export interface MealDefinition {
  label: string;
  emoji: string;
  yellowStars: number;
  redStars: number;
  free: string;
}

export interface Meal {
  _id: string;
  date: string;        // YYYY-MM-DD
  meal: MealType;
  time: string;        // HH:mm
  yellowStars: number;
  redStars: number;
  free: string;
  createdAt: string;
}

export interface DayScore {
  yellowStars: number;
  redStars: number;
}

export type MealDefinitions = Record<MealType, MealDefinition>;

export interface Settings {
  _id: string;
  weightGoal: number | null;
  maxYellowStars: number | null;
  maxRedStars: number | null;
}

export interface WeightEntry {
  _id: string;
  date: string;    // YYYY-MM-DD
  weight: number;
  createdAt: string;
}
