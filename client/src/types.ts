export type MealType = 'pizza' | 'salad' | 'egg' | 'analyzed';

export interface MealCatalogItem {
  _id: string;
  mealName: string;
  amount: string;
  numberOfYellowStars: number;
  numberOfRedStars: number;
  free: boolean;
  category: string;
}

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
  meal: string;
  amount: string;
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
  trainingsPerWeek: number | null;
  preferredDays: number[];
  preferredTimeFrom: string | null;
  preferredTimeTo: string | null;
  sessionDurationMin: number | null;
}

export interface Training {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  googleEventId: string | null;
  createdAt: string;
}

export interface TrainingSuggestion {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface WeightEntry {
  _id: string;
  date: string;    // YYYY-MM-DD
  weight: number;
  createdAt: string;
}
