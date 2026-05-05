const API_BASE = 'http://localhost:3002/api';

/** Fetch with retry — guards against server cold-start delays */
async function apiFetch(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch {
      // connection refused — server not ready yet
    }
    if (i < retries - 1) await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`API call failed after ${retries} retries: ${options?.method ?? 'GET'} ${url}`);
}

/**
 * Clears the test database by calling the test-reset endpoint.
 */
export async function resetTestDb() {
  await apiFetch(`${API_BASE}/test/reset`, { method: 'POST' });
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
  await apiFetch(`${API_BASE}/settings`, {
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
  await apiFetch(`${API_BASE}/meals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal),
  });
}

/**
 * Seeds a weight entry via API.
 */
export async function seedWeight(entry: { date: string; weight: number }) {
  await apiFetch(`${API_BASE}/weight`, {
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
  await apiFetch(`${API_BASE}/training`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(training),
  });
}

export interface CatalogItemSeed {
  mealName: string;
  amount: string;
  numberOfYellowStars: number;
  numberOfRedStars: number;
  free: boolean;
  category: string;
}

/**
 * Seeds meal catalog items for tests.
 * The catalog is wiped on every resetTestDb() call, so tests that open
 * the catalog sheet must seed items explicitly.
 */
export async function seedCatalogItems(items: CatalogItemSeed[]) {
  await apiFetch(`${API_BASE}/test/seed-catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
}

/** Today's date as YYYY-MM-DD */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
