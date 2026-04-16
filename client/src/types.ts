export type MealType = 'pizza' | 'salad' | 'egg';

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
