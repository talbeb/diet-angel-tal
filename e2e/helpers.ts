const API_BASE = 'http://localhost:3002/api';

/**
 * Clears the test database by calling API endpoints to delete all data.
 * Uses a dedicated test-reset endpoint if available, otherwise deletes via API.
 */
export async function resetTestDb() {
  await fetch(`${API_BASE}/test/reset`, { method: 'POST' });
}

/**
 * Seeds default settings for tests.
 */
export async function seedSettings(overrides: Record<string, unknown> = {}) {
  const settings = {
    weightGoal: 70,
    maxYellowStars: 5,
    maxRedStars: 4,
    trainingsPerWeek: 3,
    preferredDays: [0, 2, 4],
    preferredTimeFrom: '07:00',
    preferredTimeTo: '21:00',
    sessionDurationMin: 60,
    ...overrides,
  };
  await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

/**
 * Seeds a meal directly via API.
 */
export async function seedMeal(meal: {
  date: string;
  meal: string;
  time: string;
  yellowStars?: number;
  redStars?: number;
}) {
  await fetch(`${API_BASE}/meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal),
  });
}

/**
 * Seeds a weight entry via API.
 */
export async function seedWeight(entry: { date: string; weight: number }) {
  await fetch(`${API_BASE}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

/**
 * Seeds a training via API.
 */
export async function seedTraining(training: {
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
}) {
  await fetch(`${API_BASE}/training`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(training),
  });
}

/** Today's date as YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
