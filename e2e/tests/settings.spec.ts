import { test, expect, type Locator } from '@playwright/test';
import { resetTestDb, seedSettings } from '../helpers';

test.beforeEach(async () => {
  await resetTestDb();
  await seedSettings();
});

/** Click a button that may be hidden behind the fixed bottom nav */
async function jsClick(locator: Locator) {
  await locator.evaluate((el: HTMLElement) => el.click());
}

test.describe('Settings', () => {
  test('open and close settings sheet', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('⚙️ Settings')).toBeVisible();

    await jsClick(page.getByRole('button', { name: 'Cancel' }));
    await expect(page.getByText('⚙️ Settings')).not.toBeVisible();
  });

  test('displays current settings values', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.locator('#weight-goal')).toHaveValue('70');
    await expect(page.locator('#max-yellow')).toHaveValue('5');
    await expect(page.locator('#max-red')).toHaveValue('4');
    await expect(page.locator('#trainings-per-week')).toHaveValue('3');
  });

  test('update weight goal and save', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    await page.locator('#weight-goal').fill('65');
    await jsClick(page.getByRole('button', { name: 'Save ✓' }));

    await expect(page.getByText('⚙️ Settings')).not.toBeVisible();

    // Reopen — value should be persisted
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('#weight-goal')).toHaveValue('65');
  });

  test('update star limits and verify persistence', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    await page.locator('#max-yellow').fill('2');
    await page.locator('#max-red').fill('1');
    await jsClick(page.getByRole('button', { name: 'Save ✓' }));

    await expect(page.getByText('⚙️ Settings')).not.toBeVisible();

    // Reopen — values should be persisted
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('#max-yellow')).toHaveValue('2');
    await expect(page.locator('#max-red')).toHaveValue('1');
  });

  test('toggle preferred training days', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    await jsClick(page.getByRole('button', { name: 'Mon' }));
    await jsClick(page.getByRole('button', { name: 'Save ✓' }));

    // Reopen and verify Mon is now active (green background)
    await page.getByRole('button', { name: 'Settings' }).click();
    const monBtn = page.getByRole('button', { name: 'Mon' });
    await expect(monBtn).toHaveCSS('background-color', 'rgb(76, 175, 80)');
  });

  test('update training time range', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    // Use React-compatible input value setter to trigger onChange
    await page.locator('#time-from').evaluate((el: HTMLInputElement, val: string) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )!.set!;
      nativeInputValueSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '08:00');
    await page.locator('#time-to').evaluate((el: HTMLInputElement, val: string) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )!.set!;
      nativeInputValueSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, '20:00');

    await jsClick(page.getByRole('button', { name: 'Save ✓' }));

    // Verify persistence
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('#time-from')).toHaveValue('08:00');
    await expect(page.locator('#time-to')).toHaveValue('20:00');
  });
});
