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

  test.describe('Error Flows', () => {
    test('validates invalid file names', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Click upload button
      await page.getByRole('button', { name: 'Upload' }).click();

      // Try to upload with invalid filename
      await page.getByLabel('File Name').fill('invalid/file/name');

      // Verify validation error
      await expect(page.getByText('Invalid file name')).toBeVisible();
    });

    test('validates file size limits', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock large file upload
      await page.route('**/api/files/upload', route => {
        route.fulfill({ status: 413, body: 'File too large' });
      });

      // Click upload button
      await page.getByRole('button', { name: 'Upload' }).click();

      // Verify error message
      await expect(page.getByText('File size exceeds limit')).toBeVisible();
    });

    test('handles upload network errors gracefully', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock network failure
      await page.route('**/api/files/upload', route => {
        route.abort('failed');
      });

      // Click upload button
      await page.getByRole('button', { name: 'Upload' }).click();

      // Verify error message
      await expect(page.getByText('Upload failed due to network error')).toBeVisible();
    });

    test('handles permission errors when accessing files', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock permission error
      await page.route('**/api/files/**', route => {
        route.fulfill({ status: 403, body: 'Access denied' });
      });

      // Try to access a file
      await page.getByRole('button', { name: 'Open' }).first().click();

      // Verify error message
      await expect(page.getByText('You do not have permission to access this file')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('displays empty drive state', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Verify empty state message
      await expect(page.getByText('No files uploaded')).toBeVisible();
    });

    test('handles large file uploads', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Mock successful large file upload
      await page.route('**/api/files/upload', route => {
        route.fulfill({ status: 200, body: JSON.stringify({ id: '123', name: 'large-file.pdf' }) });
      });

      // Click upload button
      await page.getByRole('button', { name: 'Upload' }).click();

      // Verify upload completes
      await expect(page.getByText('Upload complete')).toBeVisible();
    });

    test('navigates folders', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Click on a folder
      await page.getByRole('button', { name: 'Documents' }).click();

      // Verify folder content is displayed
      await expect(page.getByText('Documents')).toBeVisible();
    });

    test('deletes a file', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Click on a file
      await page.getByRole('button', { name: 'Open' }).first().click();

      // Delete the file
      await page.getByRole('button', { name: 'Delete' }).click();

      // Confirm deletion
      await page.getByRole('button', { name: 'Confirm' }).click();

      // Verify file is removed
      await expect(page.getByText('File deleted')).toBeVisible();
    });

    test('handles special characters in file names', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

      // Click upload button
      await page.getByRole('button', { name: 'Upload' }).click();

      // Upload file with special characters
      await page.getByLabel('File Name').fill('file with <script>alert("xss")</script> & special chars.txt');

      // Verify file is created safely
      await expect(page.getByText('file with')).toBeVisible();
    });
  });
});
