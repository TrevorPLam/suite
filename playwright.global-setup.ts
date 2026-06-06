import { chromium, FullConfig } from '@playwright/test';
import { mkdir } from 'fs/promises';

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Ensure .auth directory exists
  await mkdir('.auth', { recursive: true });

  // Listen for console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.error('Browser console error:', msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
    errors.push(error.message);
  });

  // Navigate to calendar app (any app works for auth)
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

  // Wait a bit for React to hydrate
  await page.waitForTimeout(3000);

  // Check for any errors
  if (errors.length > 0) {
    console.error('Found errors during page load:', errors);
  }

  // Take screenshot to see current state
  await page.screenshot({ path: '.auth/debug-after-load.png' });
  console.log('Screenshot saved to .auth/debug-after-load.png');

  // Check if sign-in form is present
  const signInButton = page.getByRole('button', { name: 'Sign in' });
  const signOutButton = page.getByRole('button', { name: 'Sign out' });

  // If already signed in, just save state
  if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Already authenticated, saving storage state');
    await context.storageState({ path: '.auth/storage-state.json' });
    await browser.close();
    return;
  }

  // Wait for sign-in form to be visible
  console.log('Waiting for sign-in form...');
  await signInButton.waitFor({ state: 'visible', timeout: 10000 });

  // Perform login
  console.log('Filling in credentials...');
  await page.getByLabel('Email address').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  await signInButton.click();

  // Wait for sign in to complete - look for Sign Out button
  console.log('Waiting for sign-in to complete...');
  await signOutButton.waitFor({ state: 'visible', timeout: 10000 });

  // Save storage state
  console.log('Saving storage state...');
  await context.storageState({ path: '.auth/storage-state.json' });

  await browser.close();
}

export default globalSetup;
