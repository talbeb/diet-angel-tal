import { Meal, MealCatalogItem, MealDefinitions, Settings, WeightEntry } from '../types';

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

export async function addMeal(
  date: string,
  meal: string,
  time: string,
  extras?: { yellowStars: number; redStars: number; free: string; amount: string },
): Promise<Meal> {
  const res = await fetch(`${BASE}/meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, meal, time, ...extras }),
  });
  if (!res.ok) throw new Error('Failed to add meal');
  return res.json();
}

export async function fetchMealCatalog(): Promise<MealCatalogItem[]> {
  const res = await fetch(`${BASE}/meal-catalog`);
  if (!res.ok) throw new Error('Failed to fetch meal catalog');
  return res.json();
}

export async function deleteMeal(id: string): Promise<void> {
  const res = await fetch(`${BASE}/meals/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete meal');
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings: Omit<Settings, '_id'>): Promise<Settings> {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function fetchWeightEntries(): Promise<WeightEntry[]> {
  const res = await fetch(`${BASE}/weight`);
  if (!res.ok) throw new Error('Failed to fetch weight entries');
  return res.json();
}

export async function addWeightEntry(date: string, weight: number): Promise<WeightEntry> {
  const res = await fetch(`${BASE}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, weight }),
  });
  if (!res.ok) throw new Error('Failed to add weight entry');
  return res.json();
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const res = await fetch(`${BASE}/weight/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete weight entry');
}
