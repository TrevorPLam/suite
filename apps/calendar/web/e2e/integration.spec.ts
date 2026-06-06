import { test, expect } from '@playwright/test';

test.describe('Cross-App Integration E2E', () => {
  test('creates a task from a calendar event', async ({ page }) => {
    // Navigate to calendar
    await page.goto('http://localhost:5173');
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Create a calendar event
    await page.getByLabel('Title').fill('Meeting with Team');
    await page.getByLabel('Start').fill('2026-06-06T09:00');
    await page.getByLabel('End').fill('2026-06-06T10:00');
    await page.getByRole('button', { name: 'Create Event' }).click();
    await expect(page.getByText('Meeting with Team')).toBeVisible();

    // Click on event to view details
    await page.getByText('Meeting with Team').click();

    // Click "Create Task" button in event details
    await page.getByRole('button', { name: 'Create Task' }).click();

    // Verify navigation to tasks app
    await expect(page).toHaveURL('http://localhost:5174');

    // Verify task is pre-filled with event details
    await expect(page.getByLabel('Title')).toHaveValue('Meeting with Team');
    await expect(page.getByLabel('Due Date')).toHaveValue('2026-06-06');

    // Create the task
    await page.getByRole('button', { name: 'Create Task' }).click();

    // Verify task appears in tasks list
    await expect(page.getByText('Meeting with Team')).toBeVisible();
  });

  test('navigates between apps using global navigation', async ({ page }) => {
    // Start on calendar
    await page.goto('http://localhost:5173');
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Navigate to tasks via global nav
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page).toHaveURL('http://localhost:5174');

    // Navigate to drive via global nav
    await page.getByRole('link', { name: 'Drive' }).click();
    await expect(page).toHaveURL('http://localhost:5175');

    // Navigate back to calendar via global nav
    await page.getByRole('link', { name: 'Calendar' }).click();
    await expect(page).toHaveURL('http://localhost:5173');
  });

  test('shares calendar event as task with team member', async ({ page }) => {
    // Navigate to calendar
    await page.goto('http://localhost:5173');
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // Create a calendar event
    await page.getByLabel('Title').fill('Project Review');
    await page.getByLabel('Start').fill('2026-06-06T14:00');
    await page.getByLabel('End').fill('2026-06-06T15:00');
    await page.getByRole('button', { name: 'Create Event' }).click();
    await expect(page.getByText('Project Review')).toBeVisible();

    // Click on event to view details
    await page.getByText('Project Review').click();

    // Click "Share" button
    await page.getByRole('button', { name: 'Share' }).click();

    // Select team member
    await page.getByRole('combobox', { name: 'Assign to' }).selectOption('team@example.com');

    // Click "Create and Share Task"
    await page.getByRole('button', { name: 'Create and Share Task' }).click();

    // Verify success message
    await expect(page.getByText('Task shared with team@example.com')).toBeVisible();
  });
});
