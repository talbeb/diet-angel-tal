import { Meal, MealDefinitions, MealType } from '../types';

const BASE = '/api';

export async function fetchMealDefinitions(): Promise<MealDefinitions> {
  const res = await fetch(`${BASE}/meal-definitions`);
  if (!res.ok) throw new Error('Failed to fetch meal definitions');
  return res.json();
}

export async function fetchMealsForDate(date: string): Promise<Meal[]> {
  const res = await fetch(`${BASE}/meals/${date}`);
  if (!res.ok) throw new Error(`Failed to fetch meals for ${date}`);
  return res.json();
}

export async function addMeal(date: string, meal: MealType, time: string): Promise<Meal> {
  const res = await fetch(`${BASE}/meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, meal, time }),
  });
  if (!res.ok) throw new Error('Failed to add meal');
  return res.json();
}

export async function deleteMeal(id: string): Promise<void> {
  const res = await fetch(`${BASE}/meals/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete meal');
}
