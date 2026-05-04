import { test, expect } from '@playwright/test';
import { resetTestDb, seedSettings, seedTraining } from '../helpers';

test.beforeEach(async () => {
  await resetTestDb();
  await seedSettings({ trainingsPerWeek: 3 });
});

test.describe('Fitness View', () => {
  test('shows weekly progress with no trainings', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Fitness').click();

    await expect(page.locator('h1', { hasText: 'Fitness' })).toBeVisible();
    await expect(page.getByText('0 / 3 trainings')).toBeVisible();
  });

  test('shows confirmed trainings in list', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await seedTraining({
      date: today,
      startTime: '09:00',
      endTime: '10:00',
      durationMin: 60,
    });

    await page.goto('/');
    await page.getByText('Fitness').click();

    await expect(page.getByText('1 / 3 trainings')).toBeVisible();
    await expect(page.getByText('09:00 – 10:00')).toBeVisible();
    await expect(page.getByText('60 min')).toBeVisible();
  });

  test('progress bar fills proportionally', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await seedTraining({ date: today, startTime: '09:00', endTime: '10:00', durationMin: 60 });
    await seedTraining({ date: today, startTime: '14:00', endTime: '15:00', durationMin: 60 });

    await page.goto('/');
    await page.getByText('Fitness').click();

    await expect(page.getByText('2 / 3 trainings')).toBeVisible();
  });

  test('shows target reached message at goal', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 3; i++) {
      await seedTraining({
        date: today,
        startTime: `${String(9 + i * 2).padStart(2, '0')}:00`,
        endTime: `${String(10 + i * 2).padStart(2, '0')}:00`,
        durationMin: 60,
      });
    }

    await page.goto('/');
    await page.getByText('Fitness').click();

    await expect(page.getByText('3 / 3 trainings')).toBeVisible();
    await expect(page.getByText('Target reached!')).toBeVisible();
  });

  test('Google Calendar section is hidden (feature flag off)', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Fitness').click();

    await expect(page.getByText('Google Calendar')).not.toBeVisible();
    await expect(page.getByText('Connect Google Calendar')).not.toBeVisible();
  });
});
