import { test, expect } from '@playwright/test';

test.describe('Tasks E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
  });

  test('creates a task', async ({ page }) => {
    // Already authenticated via storageState
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Create a task
    await page.getByLabel('Title').fill('E2E Test Task');
    await page.getByRole('button', { name: 'Create Task' }).click();

    // Verify task appears in the list
    await expect(page.getByText('E2E Test Task')).toBeVisible();
  });

  test('displays sign in form when not authenticated', async ({ page }) => {
    // This test does not use storageState
    test.use({ storageState: undefined });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
