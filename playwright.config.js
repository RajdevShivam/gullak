// Browser test for the real page: `npx playwright test`. Kept apart from `node --test tests/` (no browser needed there).
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  testMatch: /(e2e|theme).spec.js/,
  timeout: 120000,
  use: { baseURL: 'http://localhost:5176', channel: 'chrome', viewport: { width: 1280, height: 800 } },
  webServer: { command: 'python -m http.server 5176 --directory gullak', url: 'http://localhost:5176/', reuseExistingServer: true },
});
