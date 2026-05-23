import { test, expect } from '@playwright/test';

test('root page console errors', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  await page.goto('http://localhost:5174/');
  // wait for some time to allow JS to load
  await page.waitForTimeout(2000);
  console.log('Console messages:', consoleMessages);
  // Write to a file for later inspection
  const fs = require('fs');
  fs.writeFileSync('playwright_console_root.txt', consoleMessages.join('\n'));
  expect(consoleMessages.length).toBe(0);
});
