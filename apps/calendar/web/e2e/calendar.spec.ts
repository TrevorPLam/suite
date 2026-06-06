import { test, expect } from '@playwright/test';

test.describe('Calendar E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('creates an event', async ({ page }) => {
    // Already authenticated via storageState
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
    // This test does not use storageState
    test.use({ storageState: undefined });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test.describe('Error Flows', () => {
    test('validates required fields when creating event', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Try to create event without title
      await page.getByLabel('Start').fill('2026-06-06T09:00');
      await page.getByLabel('End').fill('2026-06-06T10:00');
      await page.getByRole('button', { name: 'Create Event' }).click();

      // Verify validation error
      await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('validates invalid date format', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Try to create event with invalid date
      await page.getByLabel('Title').fill('Invalid Date Event');
      await page.getByLabel('Start').fill('invalid-date');
      await page.getByLabel('End').fill('2026-06-06T10:00');
      await page.getByRole('button', { name: 'Create Event' }).click();

      // Verify validation error
      await expect(page.getByText('Invalid date format')).toBeVisible();
    });

    test('validates end date before start date', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Try to create event with end before start
      await page.getByLabel('Title').fill('Time Travel Event');
      await page.getByLabel('Start').fill('2026-06-06T10:00');
      await page.getByLabel('End').fill('2026-06-06T09:00');
      await page.getByRole('button', { name: 'Create Event' }).click();

      // Verify validation error
      await expect(page.getByText('End time must be after start time')).toBeVisible();
    });

    test('handles API network errors gracefully', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock API failure
      await page.route('**/api/events', route => {
        route.abort('failed');
      });

      // Try to create event
      await page.getByLabel('Title').fill('Network Error Event');
      await page.getByLabel('Start').fill('2026-06-06T09:00');
      await page.getByLabel('End').fill('2026-06-06T10:00');
      await page.getByRole('button', { name: 'Create Event' }).click();

      // Verify error message
      await expect(page.getByText('Failed to create event')).toBeVisible();
    });

    test('handles API server errors gracefully', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock 500 error
      await page.route('**/api/events', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      // Try to create event
      await page.getByLabel('Title').fill('Server Error Event');
      await page.getByLabel('Start').fill('2026-06-06T09:00');
      await page.getByLabel('End').fill('2026-06-06T10:00');
      await page.getByRole('button', { name: 'Create Event' }).click();

      // Verify error message
      await expect(page.getByText('Server error occurred')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('displays empty calendar state', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Verify empty state message
      await expect(page.getByText('No events scheduled')).toBeVisible();
    });

    test('handles large number of events', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create multiple events
      for (let i = 1; i <= 10; i++) {
        await page.getByLabel('Title').fill(`Event ${i}`);
        await page.getByLabel('Start').fill(`2026-06-06T${9 + i}:00`);
        await page.getByLabel('End').fill(`2026-06-06T${10 + i}:00`);
        await page.getByRole('button', { name: 'Create Event' }).click();
      }

      // Verify all events are displayed
      await expect(page.getByText('Event 10')).toBeVisible();
    });

    test('deletes an event', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create an event
      await page.getByLabel('Title').fill('Event to Delete');
      await page.getByLabel('Start').fill('2026-06-06T09:00');
      await page.getByLabel('End').fill('2026-06-06T10:00');
      await page.getByRole('button', { name: 'Create Event' }).click();

      // Delete the event
      await page.getByRole('button', { name: 'Delete' }).click();

      // Verify event is removed
      await expect(page.getByText('Event to Delete')).not.toBeVisible();
    });

    test('handles special characters in event title', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create event with special characters
      await page.getByLabel('Title').fill('Event with <script>alert("xss")</script> & special chars');
      await page.getByLabel('Start').fill('2026-06-06T09:00');
      await page.getByLabel('End').fill('2026-06-06T10:00');
      await page.getByRole('button', { name: 'Create Event' }).click();

      // Verify event is created and displayed safely
      await expect(page.getByText('Event with')).toBeVisible();
    });
  });
});
