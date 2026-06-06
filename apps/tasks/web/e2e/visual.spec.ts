import { test, expect } from '@playwright/test';

test.describe('Tasks Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations and transitions for stable screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `
    });
  });

  test('tasks list visual', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Mask dynamic content like due dates and timestamps
    await expect(page).toHaveScreenshot('tasks-list.png', {
      mask: [page.locator('[data-date]'), page.locator('[data-due]'), page.locator('.timestamp')],
    });
  });

  test('tasks create dialog visual', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Click create button to open dialog
    await page.getByRole('button', { name: 'Create Task' }).click();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('tasks-create-dialog.png', {
      mask: [page.locator('[data-date]')],
    });
  });

  test('tasks with filters visual', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Click filter button
    await page.getByRole('button', { name: 'Filter' }).click();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('tasks-with-filters.png', {
      mask: [page.locator('[data-date]'), page.locator('[data-due]')],
    });
  });

  test('tasks empty state visual', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Verify empty state visual
    await expect(page).toHaveScreenshot('tasks-empty-state.png', {
      mask: [page.locator('[data-date]')],
    });
  });
});
