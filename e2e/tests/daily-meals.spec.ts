import { test, expect, type Locator } from '@playwright/test';
import { resetTestDb, seedSettings, seedMeal, todayStr } from '../helpers';

test.beforeEach(async () => {
  await resetTestDb();
  await seedSettings();
});

/** Click a button that may be hidden behind the fixed bottom nav */
async function jsClick(locator: Locator) {
  await locator.evaluate((el: HTMLElement) => el.click());
}

test.describe('Daily Meals', () => {
  test('shows empty state when no meals logged', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('No meals yet. Add one!')).toBeVisible();
    await expect(page.getByText('Today')).toBeVisible();
  });

  test('add a meal via the sheet', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Add meal' }).click();
    await expect(page.getByText('Add a meal')).toBeVisible();

    await page.getByText('Pizza').click();
    await jsClick(page.getByRole('button', { name: 'Add meal ✓' }));

    await expect(page.getByText('Add a meal')).not.toBeVisible();
    await expect(page.getByText('🍕')).toBeVisible();
    await expect(page.getByText('🔴 2')).toBeVisible();
  });

  test('add multiple meals and verify score aggregation', async ({ page }) => {
    await page.goto('/');

    // Add Pizza (0 yellow, 2 red)
    await page.getByRole('button', { name: 'Add meal' }).click();
    await page.getByText('Pizza').click();
    await jsClick(page.getByRole('button', { name: 'Add meal ✓' }));
    await expect(page.getByText('🍕')).toBeVisible();

    // Add Egg (1 yellow, 0 red)
    await page.getByRole('button', { name: 'Add meal' }).click();
    await page.getByText('Egg').click();
    await jsClick(page.getByRole('button', { name: 'Add meal ✓' }));
    await expect(page.getByText('🥚')).toBeVisible();

    // Score: 1 yellow, 2 red
    await expect(page.getByText('⭐ 1')).toBeVisible();
    await expect(page.getByText('🔴 2')).toBeVisible();
  });

  test('delete a meal', async ({ page }) => {
    const today = todayStr();
    await seedMeal({ date: today, meal: 'pizza', time: '12:00' });

    await page.goto('/');
    await expect(page.getByText('🍕')).toBeVisible();

    await page.getByTitle('Remove meal').click();

    await expect(page.getByText('🍕')).not.toBeVisible();
    await expect(page.getByText('No meals yet. Add one!')).toBeVisible();
  });

  test('navigate to previous day and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Today')).toBeVisible();

    await page.getByRole('button', { name: '‹' }).click();
    await expect(page.getByText('Yesterday')).toBeVisible();

    await page.getByRole('button', { name: '›' }).click();
    await expect(page.getByText('Today')).toBeVisible();
  });

  test('forward arrow is disabled on today', async ({ page }) => {
    await page.goto('/');
    const forwardBtn = page.getByRole('button', { name: '›' });
    await expect(forwardBtn).toBeDisabled();
  });

  test('displays pre-seeded meals on load', async ({ page }) => {
    const today = todayStr();
    await seedMeal({ date: today, meal: 'salad', time: '08:00' });
    await seedMeal({ date: today, meal: 'egg', time: '12:00' });

    await page.goto('/');
    await expect(page.getByText('🥗')).toBeVisible();
    await expect(page.getByText('🥚')).toBeVisible();
    await expect(page.getByText('⭐ 3')).toBeVisible();
  });

  test('score shows over-limit styling when exceeding max', async ({ page }) => {
    const today = todayStr();
    for (let i = 0; i < 3; i++) {
      await seedMeal({ date: today, meal: 'pizza', time: `1${i}:00` });
    }

    await page.goto('/');
    await expect(page.getByText('🔴 6')).toBeVisible();
    await expect(page.getByText(/\/ 4/)).toBeVisible();
  });
});
