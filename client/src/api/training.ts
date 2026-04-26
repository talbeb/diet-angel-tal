import { Training } from '../types';

const BASE = '/api';

export async function getWeekTrainings(date: string): Promise<{ trainings: Training[]; weekStart: string; weekEnd: string }> {
  const res = await fetch(`${BASE}/training/week?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch week trainings');
  return res.json();
}

export async function confirmTraining(data: {
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
}): Promise<Training> {
  const res = await fetch(`${BASE}/training`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to confirm training');
  return res.json();
}

export async function deleteTraining(id: string): Promise<void> {
  await fetch(`${BASE}/training/${id}`, { method: 'DELETE' });
}
