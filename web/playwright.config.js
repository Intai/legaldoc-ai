import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './src',
  testMatch: '**/docs/*.spec.js',
  fullyParallel: false,
  forbidOnly: false,
  maxFailures: 1,
  retries: 0,
  workers: 1,
  timeout: 60000, // 1 minute for all tests
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  expect: {
    timeout: 30000, // 30 seconds for assertions
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  }],
  webServer: [{
    cwd: '..',
    command: 'make dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
  }],
})
