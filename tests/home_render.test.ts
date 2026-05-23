import { test, expect } from '@playwright/test';

test('home page renders and capture screenshot', async ({ page }) => {
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const screenshot = await page.screenshot({ path: 'homepage.png' });
  // Ensure screenshot file was created
  expect(screenshot).toBeTruthy();
});
