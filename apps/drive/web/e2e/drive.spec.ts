import { test, expect } from '@playwright/test';

test.describe('Drive E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5175');
  });

  test('signs in and uploads a file', async ({ page }) => {
    // Sign in
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for sign in to complete
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Click upload button
    await page.getByRole('button', { name: 'Upload' }).click();

    // Verify upload dialog appears
    await expect(page.getByText('Upload File')).toBeVisible();
  });

  test('displays sign in form when not authenticated', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
