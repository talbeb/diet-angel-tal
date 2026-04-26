import { TrainingSuggestion } from '../types';

const BASE = '/api';

export async function getCalendarStatus(): Promise<{ connected: boolean }> {
  const res = await fetch(`${BASE}/calendar/status`);
  if (!res.ok) throw new Error('Failed to fetch calendar status');
  return res.json();
}

export async function getCalendarAuthUrl(): Promise<{ url: string }> {
  const res = await fetch(`${BASE}/calendar/auth-url`);
  if (!res.ok) throw new Error('Failed to get auth URL');
  return res.json();
}

export async function connectCalendar(token: string): Promise<void> {
  const res = await fetch(`${BASE}/calendar/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error('Failed to connect calendar');
}

export async function disconnectCalendar(): Promise<void> {
  await fetch(`${BASE}/calendar/disconnect`, { method: 'POST' });
}

export async function getCalendarSuggestions(): Promise<{ suggestions: TrainingSuggestion[]; message?: string }> {
  const res = await fetch(`${BASE}/calendar/suggestions`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Failed to get suggestions');
  }
  return res.json();
}
