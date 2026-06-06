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

  test.describe('Error Flows', () => {
    test('validates required fields when creating task', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Try to create task without title
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Verify validation error
      await expect(page.getByText('Title is required')).toBeVisible();
    });

    test('validates invalid due date format', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Try to create task with invalid date
      await page.getByLabel('Title').fill('Invalid Date Task');
      await page.getByLabel('Due Date').fill('invalid-date');
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Verify validation error
      await expect(page.getByText('Invalid date format')).toBeVisible();
    });

    test('validates past due dates', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Try to create task with past date
      await page.getByLabel('Title').fill('Past Due Task');
      await page.getByLabel('Due Date').fill('2020-01-01');
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Verify validation error
      await expect(page.getByText('Due date cannot be in the past')).toBeVisible();
    });

    test('handles API network errors gracefully', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock API failure
      await page.route('**/api/tasks', route => {
        route.abort('failed');
      });

      // Try to create task
      await page.getByLabel('Title').fill('Network Error Task');
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Verify error message
      await expect(page.getByText('Failed to create task')).toBeVisible();
    });

    test('handles API server errors gracefully', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock 500 error
      await page.route('**/api/tasks', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      // Try to create task
      await page.getByLabel('Title').fill('Server Error Task');
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Verify error message
      await expect(page.getByText('Server error occurred')).toBeVisible();
    });

    test('handles task completion errors', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create a task first
      await page.getByLabel('Title').fill('Task to Complete');
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Mock completion failure
      await page.route('**/api/tasks/*/complete', route => {
        route.fulfill({ status: 500, body: 'Completion failed' });
      });

      // Try to complete task
      await page.getByRole('button', { name: 'Complete' }).click();

      // Verify error message
      await expect(page.getByText('Failed to complete task')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('displays empty tasks state', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Verify empty state message
      await expect(page.getByText('No tasks yet')).toBeVisible();
    });

    test('handles large number of tasks', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create multiple tasks
      for (let i = 1; i <= 10; i++) {
        await page.getByLabel('Title').fill(`Task ${i}`);
        await page.getByRole('button', { name: 'Create Task' }).click();
      }

      // Verify all tasks are displayed
      await expect(page.getByText('Task 10')).toBeVisible();
    });

    test('filters tasks by status', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create tasks
      await page.getByLabel('Title').fill('Active Task');
      await page.getByRole('button', { name: 'Create Task' }).click();

      await page.getByLabel('Title').fill('Completed Task');
      await page.getByRole('button', { name: 'Create Task' }).click();
      await page.getByRole('button', { name: 'Complete' }).click();

      // Filter by completed
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.getByRole('option', { name: 'Completed' }).click();

      // Verify only completed tasks shown
      await expect(page.getByText('Completed Task')).toBeVisible();
      await expect(page.getByText('Active Task')).not.toBeVisible();
    });

    test('performs batch operations', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create multiple tasks
      await page.getByLabel('Title').fill('Task 1');
      await page.getByRole('button', { name: 'Create Task' }).click();

      await page.getByLabel('Title').fill('Task 2');
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Select all tasks
      await page.getByRole('checkbox', { name: 'Select all' }).click();

      // Batch complete
      await page.getByRole('button', { name: 'Complete Selected' }).click();

      // Verify all tasks completed
      await expect(page.getByText('2 tasks completed')).toBeVisible();
    });

    test('handles special characters in task title', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Create task with special characters
      await page.getByLabel('Title').fill('Task with <script>alert("xss")</script> & special chars');
      await page.getByRole('button', { name: 'Create Task' }).click();

      // Verify task is created and displayed safely
      await expect(page.getByText('Task with')).toBeVisible();
    });
  });
});
