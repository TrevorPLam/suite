import { test, expect } from '@playwright/test';

test.describe('Drive E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175');
  });

  test('uploads a file', async ({ page }) => {
    // Already authenticated via storageState
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Click upload button
    await page.getByRole('button', { name: 'Upload' }).click();

    // Verify upload dialog appears
    await expect(page.getByText('Upload File')).toBeVisible();
  });

  test('displays sign in form when not authenticated', async ({ page }) => {
    // This test does not use storageState
    test.use({ storageState: undefined });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
