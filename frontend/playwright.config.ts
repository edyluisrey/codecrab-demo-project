import { defineConfig, devices } from '@playwright/test'

const BACKEND_PORT = 8001
const FRONTEND_PORT = 5174
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  // Tests share one seeded database, so run them serially.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `.venv/bin/python -m app.seed && .venv/bin/uvicorn app.main:app --port ${BACKEND_PORT}`,
      cwd: '../backend',
      url: `http://localhost:${BACKEND_PORT}/health`,
      env: {
        DATABASE_URL: 'sqlite:///./e2e_test.db',
        SECRET_KEY: 'e2e-secret-key-not-for-production',
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${BACKEND_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
