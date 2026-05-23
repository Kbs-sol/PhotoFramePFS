import { test, expect } from '@playwright/test';

test('home page console errors', async ({ page }) => {
  const messages: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      messages.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  // Wait a bit for scripts to execute
  await page.waitForTimeout(2000);
  // Assert no console errors
  expect(messages).toEqual([]);
});
