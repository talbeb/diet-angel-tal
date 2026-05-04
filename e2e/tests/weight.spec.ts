import { test, expect } from '@playwright/test';
import { resetTestDb, seedSettings, seedWeight } from '../helpers';

test.beforeEach(async () => {
  await resetTestDb();
  await seedSettings();
});

test.describe('Weight Tracking', () => {
  test('shows empty chart message with no entries', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Weight').click();

    await expect(page.getByText('Weight Journey')).toBeVisible();
    await expect(page.getByText('Add at least 2 entries to see the graph.')).toBeVisible();
  });

  test('log a weight entry', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Weight').click();

    await page.getByPlaceholder('kg').fill('80.5');
    await page.getByRole('button', { name: 'Add' }).click();

    // Entry should appear in the list — use the list item specifically
    await expect(page.locator('[class*="entryWeight"]').first()).toContainText('80.5');
  });

  test('log two entries and chart appears', async ({ page }) => {
    await seedWeight({ date: '2026-04-30', weight: 82 });
    await seedWeight({ date: '2026-05-01', weight: 81.5 });

    await page.goto('/');
    await page.getByText('Weight').click();

    // Chart should render (canvas or svg element)
    const chart = page.locator('[class*="chart"] canvas, [class*="chart"] svg');
    await expect(chart.first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Add at least 2 entries')).not.toBeVisible();
  });

  test('delete a weight entry', async ({ page }) => {
    await seedWeight({ date: '2026-05-01', weight: 80 });

    await page.goto('/');
    await page.getByText('Weight').click();

    // Verify the entry exists in the list
    await expect(page.locator('[class*="entryWeight"]').first()).toContainText('80');

    // Delete it
    await page.locator('[class*="deleteBtn"]').first().click();

    // Entry should disappear
    await expect(page.locator('[class*="listItem"]')).not.toBeVisible();
  });

  test('displays progress stats with goal', async ({ page }) => {
    // Goal is 70 kg (from seedSettings)
    await seedWeight({ date: '2026-04-01', weight: 85 });
    await seedWeight({ date: '2026-05-01', weight: 80 });

    await page.goto('/');
    await page.getByText('Weight').click();

    // Check stat cards — use statValue class to be specific
    const statValues = page.locator('[class*="statValue"]');
    await expect(statValues.first()).toContainText('80');
    // Goal card
    await expect(page.getByText('70 kg')).toBeVisible();
  });

  test('log weight with custom date', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Weight').click();

    await page.locator('input[type="date"]').fill('2026-04-15');
    await page.getByPlaceholder('kg').fill('79');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.locator('[class*="entryWeight"]').first()).toContainText('79');
  });
});
