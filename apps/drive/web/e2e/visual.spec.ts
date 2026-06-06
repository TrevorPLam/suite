import { test, expect } from '@playwright/test';

test.describe('Drive Visual Regression', () => {
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

  test('drive file list visual', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Mask dynamic content like file sizes and dates
    await expect(page).toHaveScreenshot('drive-file-list.png', {
      mask: [page.locator('[data-date]'), page.locator('[data-size]'), page.locator('.timestamp')],
    });
  });

  test('drive upload dialog visual', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Click upload button to open dialog
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('drive-upload-dialog.png', {
      mask: [page.locator('[data-date]')],
    });
  });

  test('drive folder view visual', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Click on a folder
    await page.getByRole('button', { name: 'Documents' }).click();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('drive-folder-view.png', {
      mask: [page.locator('[data-date]'), page.locator('[data-size]')],
    });
  });

  test('drive empty state visual', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    
    // Verify empty state visual
    await expect(page).toHaveScreenshot('drive-empty-state.png', {
      mask: [page.locator('[data-date]')],
    });
  });
});
