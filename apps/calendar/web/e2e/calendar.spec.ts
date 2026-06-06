import { test, expect } from '@playwright/test';

test.describe('Calendar E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('signs in and creates an event', async ({ page }) => {
    // Sign in
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for sign in to complete
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Create an event
    await page.getByLabel('Title').fill('E2E Test Event');
    await page.getByLabel('Start').fill('2026-06-06T09:00');
    await page.getByLabel('End').fill('2026-06-06T10:00');
    await page.getByRole('button', { name: 'Create Event' }).click();

    // Verify event appears in the list
    await expect(page.getByText('E2E Test Event')).toBeVisible();
  });

  test('displays sign in form when not authenticated', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
