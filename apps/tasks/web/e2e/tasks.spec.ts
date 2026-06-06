import { test, expect } from '@playwright/test';

test.describe('Tasks E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5174');
  });

  test('signs in and creates a task', async ({ page }) => {
    // Sign in
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for sign in to complete
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Create a task
    await page.getByLabel('Title').fill('E2E Test Task');
    await page.getByRole('button', { name: 'Create Task' }).click();

    // Verify task appears in the list
    await expect(page.getByText('E2E Test Task')).toBeVisible();
  });

  test('displays sign in form when not authenticated', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
