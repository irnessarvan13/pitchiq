// playwright.config.ts — settings for the end-to-end test (#48)
// The app must already be running (Docker Compose, see the README) — Playwright only drives the browser.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,                                   // one test may take up to 60 seconds
  expect: { timeout: 15_000 },                       // each check waits up to 15 s — the first page load in Docker can be slow
  retries: process.env.CI ? 1 : 0,                   // on GitHub, try a failed test once more before calling it red
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',                // the React app from docker compose
    trace: 'retain-on-failure',                      // if a test fails, keep a step-by-step recording to look at
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },   // a real Chrome-like browser
  ],
})
