import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to calendar app (any app works for auth)
  await page.goto('http://localhost:5173');

  // Perform login
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for sign in to complete
  await page.getByRole('button', { name: 'Sign Out' }).waitFor({ state: 'visible' });

  // Save storage state
  await context.storageState({ path: '.auth/storage-state.json' });

  await browser.close();
}

export default globalSetup;
