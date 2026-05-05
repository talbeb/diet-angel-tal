import { test, expect, type Locator } from '@playwright/test';
import { resetTestDb, seedSettings, seedCatalogItems } from '../helpers';

async function jsClick(locator: Locator) {
  await locator.evaluate((el: HTMLElement) => el.click());
}

const ITEMS = [
  { mealName: 'אורז לבן',  amount: '0.5 כוסות', numberOfYellowStars: 0,   numberOfRedStars: 1,   free: false, category: 'לחם ודגנים' },
  { mealName: 'לחם מלא',   amount: '1 פרוסה',   numberOfYellowStars: 0,   numberOfRedStars: 1,   free: false, category: 'לחם ודגנים' },
  { mealName: 'עגבנייה',   amount: '1 יחידה',   numberOfYellowStars: 0,   numberOfRedStars: 0,   free: true,  category: 'ירקות'       },
  { mealName: 'מלפפון',    amount: 'ללא הגבלה', numberOfYellowStars: 0,   numberOfRedStars: 0,   free: true,  category: 'ירקות'       },
  { mealName: 'שקדים',     amount: '10 יחידות', numberOfYellowStars: 1.5, numberOfRedStars: 0,   free: false, category: ''            },
];

test.beforeEach(async () => {
  await resetTestDb();
  await seedSettings();
  await seedCatalogItems(ITEMS);
});

test.describe('Meal Catalog Sheet', () => {
  test('opens catalog sheet with items grouped by category', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Add meal' }).click();
    await expect(page.getByText('Add a meal')).toBeVisible();

    // Category headers present
    await expect(page.getByText('לחם ודגנים')).toBeVisible();
    await expect(page.getByText('ירקות')).toBeVisible();
    // Empty-category item falls under כללי
    await expect(page.getByText('כללי')).toBeVisible();

    // Items under their categories
    await expect(page.getByText('אורז לבן')).toBeVisible();
    await expect(page.getByText('עגבנייה')).toBeVisible();
    await expect(page.getByText('שקדים')).toBeVisible();
  });

  test('search filters items by name', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    await page.getByPlaceholder('Search...').fill('אורז');

    await expect(page.getByText('אורז לבן')).toBeVisible();
    await expect(page.getByText('לחם מלא')).not.toBeVisible();
    await expect(page.getByText('עגבנייה')).not.toBeVisible();
  });

  test('clearing search restores full list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    await page.getByPlaceholder('Search...').fill('אורז');
    await expect(page.getByText('לחם מלא')).not.toBeVisible();

    await page.getByRole('button', { name: '×' }).click();
    await expect(page.getByText('לחם מלא')).toBeVisible();
  });

  test('search with no results shows empty message', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    await page.getByPlaceholder('Search...').fill('xyznotfound');
    await expect(page.getByText(/No results/)).toBeVisible();
  });

  test('Add button is disabled until an item is selected', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    const addBtn = page.getByRole('button', { name: 'Add meal ✓' });
    await expect(addBtn).toBeDisabled();

    await page.getByText('אורז לבן').click();
    await expect(addBtn).toBeEnabled();
  });

  test('select item → add → meal appears in day list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    await page.getByText('אורז לבן').click();
    await jsClick(page.getByRole('button', { name: 'Add meal ✓' }));

    await expect(page.getByText('Add a meal')).not.toBeVisible();
    await expect(page.getByText('אורז לבן')).toBeVisible();
  });

  test('score updates correctly after adding catalog meal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    // אורז לבן: 0 yellow, 1 red
    await page.getByText('אורז לבן').click();
    await jsClick(page.getByRole('button', { name: 'Add meal ✓' }));

    await expect(page.getByText(/★\s*1\s*\/\s*4/)).toBeVisible();
    await expect(page.getByText(/⭐\s*0\s*\/\s*5/)).toBeVisible();
  });

  test('search, select, and add full flow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    // Search narrows list
    await page.getByPlaceholder('Search...').fill('שקדים');
    await expect(page.getByText('שקדים')).toBeVisible();
    await expect(page.getByText('אורז לבן')).not.toBeVisible();

    // Select and add
    await page.getByText('שקדים').click();
    await jsClick(page.getByRole('button', { name: 'Add meal ✓' }));

    await expect(page.getByText('Add a meal')).not.toBeVisible();
    await expect(page.getByText('שקדים')).toBeVisible();
    // שקדים has 1.5 yellow stars → score shows 1.5 / 5
    await expect(page.getByText(/⭐\s*1\.5\s*\/\s*5/)).toBeVisible();
  });

  test('closing the sheet via Cancel does not add a meal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    await page.getByText('אורז לבן').click();
    await jsClick(page.getByRole('button', { name: 'Cancel' }));

    await expect(page.getByText('Add a meal')).not.toBeVisible();
    await expect(page.getByText('No meals yet. Add one!')).toBeVisible();
  });

  test('closing the sheet via overlay does not add a meal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add meal' }).click();

    // Click outside the sheet (the overlay)
    await page.locator('.overlay, [class*="overlay"]').first().click({ position: { x: 10, y: 10 }, force: true });

    await expect(page.getByText('No meals yet. Add one!')).toBeVisible();
  });
});
