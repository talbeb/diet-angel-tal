import path from 'path';
import { test, expect } from '@playwright/test';
import { resetTestDb, seedSettings } from '../helpers';

const TEST_IMAGE = path.join(__dirname, '..', 'fixtures', 'test-food.jpg');

test.beforeEach(async () => {
  await resetTestDb();
  await seedSettings();
});

test.describe('Food Image Analysis', () => {
  test('shows upload area initially', async ({ page }) => {
    await page.goto('/');
    await page.getByText('ניתוח').click();

    await expect(page.getByText('ניתוח תמונה')).toBeVisible();
    await expect(page.getByText('צלם או העלה תמונה של האוכל')).toBeVisible();
  });

  test('upload image shows preview and analyze button', async ({ page }) => {
    await page.goto('/');
    await page.getByText('ניתוח').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE);

    await expect(page.locator('img')).toBeVisible();
    await expect(page.getByText('נתח תמונה')).toBeVisible();
    await expect(page.getByText('תמונה אחרת')).toBeVisible();
  });

  test('reset image brings back upload area', async ({ page }) => {
    await page.goto('/');
    await page.getByText('ניתוח').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE);
    await expect(page.locator('img')).toBeVisible();

    await page.getByText('תמונה אחרת').click();
    await expect(page.getByText('צלם או העלה תמונה של האוכל')).toBeVisible();
  });

  test('full analysis flow with mocked API', async ({ page }) => {
    await page.route('**/api/analyze-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ingredients: [
            { name: 'אורז לבן', amount: '200g', kcal: 260, dominant_macro: 'carb' },
            { name: 'חזה עוף', amount: '150g', kcal: 165, dominant_macro: 'protein' },
            { name: 'סלט ירקות', amount: '100g', kcal: 25, dominant_macro: 'free' },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.getByText('ניתוח').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE);

    await page.getByText('נתח תמונה').click();
    await expect(page.getByText('מרכיבים שזוהו')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('אורז לבן')).toBeVisible();
    await expect(page.getByText('חזה עוף')).toBeVisible();
    await expect(page.getByText('סלט ירקות')).toBeVisible();
    await expect(page.getByText('חינמי')).toBeVisible();
    await expect(page.getByText('כוכבים אדומים')).toBeVisible();
    await expect(page.getByText('כוכבים צהובים')).toBeVisible();
  });

  test('save analyzed meal appears on daily view', async ({ page }) => {
    await page.route('**/api/analyze-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ingredients: [
            { name: 'פיצה', amount: '2 slices', kcal: 400, dominant_macro: 'carb' },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.getByText('ניתוח').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.getByText('נתח תמונה').click();
    await expect(page.getByText('מרכיבים שזוהו')).toBeVisible({ timeout: 10_000 });

    // Enter meal name and save
    const nameInput = page.getByPlaceholder('שם הארוחה');
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill('ארוחת צהריים');

    const addBtn = page.locator('[class*="addBtn"]');
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click({ force: true });

    // App navigates to Daily view after save — verify the meal appears there
    await expect(page.getByText('ארוחת צהריים')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/★\s*4\s*\/\s*4/)).toBeVisible();
  });

  test('edit kcal recalculates stars', async ({ page }) => {
    await page.route('**/api/analyze-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ingredients: [
            { name: 'אורז', amount: '200g', kcal: 100, dominant_macro: 'carb' },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.getByText('ניתוח').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.getByText('נתח תמונה').click();
    await expect(page.getByText('מרכיבים שזוהו')).toBeVisible({ timeout: 10_000 });

    // Edit kcal from 100 to 350 → should become ~4 red stars
    const kcalInput = page.locator('[class*="kcalInput"]').first();
    await kcalInput.fill('350');
    await kcalInput.press('Tab');

    await expect(page.locator('[class*="summaryItem"]').first()).toContainText('★');
  });

  test('analysis failure shows error', async ({ page }) => {
    await page.route('**/api/analyze-image', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/');
    await page.getByText('ניתוח').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE);
    await page.getByText('נתח תמונה').click();

    // Error should appear
    await expect(page.locator('[class*="error"]')).toBeVisible({ timeout: 10_000 });
  });
});
