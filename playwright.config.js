import { defineConfig } from '@playwright/test'

// Smoke suite against a running stack (see .github/workflows/ci.yml, or docs/testing.md to run it locally).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8801',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
})
