import { test, expect } from '@playwright/test';

test.describe('Calendar Visual Regression', () => {
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

  test('calendar event list visual', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Mask dynamic content like dates if present
    await expect(page).toHaveScreenshot('calendar-event-list.png', {
      mask: [page.locator('[data-date]'), page.locator('.timestamp')],
    });
  });

  test('calendar create dialog visual', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Click create button to open dialog
    await page.getByRole('button', { name: 'Create Event' }).click();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('calendar-create-dialog.png', {
      mask: [page.locator('[data-date]')],
    });
  });

  test('calendar with events visual', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Create a test event
    await page.getByLabel('Title').fill('Visual Test Event');
    await page.getByLabel('Start').fill('2026-06-06T09:00');
    await page.getByLabel('End').fill('2026-06-06T10:00');
    await page.getByRole('button', { name: 'Create Event' }).click();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('calendar-with-events.png', {
      mask: [page.locator('[data-date]')],
    });
  });

  test('calendar empty state visual', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Verify empty state visual
    await expect(page).toHaveScreenshot('calendar-empty-state.png', {
      mask: [page.locator('[data-date]')],
    });
  });
});
