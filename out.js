import {test, expect} from '@playwright/test';

test('generated test', async ({page}) => {
  // go to bing.com
  // Navigate to Bing's home page directly using the Playwright API
  await page.goto('https://www.bing.com');
});
