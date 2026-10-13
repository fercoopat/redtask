import { defineConfig } from "@playwright/test";

export const browserTestSessionPassword = "synthetic-browser-test-secret-at-least-32-characters";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3220",
    browserName: "chromium",
    locale: "es-ES",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node --import tsx tests/fixtures/redmine-server.ts",
      url: "http://127.0.0.1:3219/__health",
      reuseExistingServer: false,
    },
    {
      command: "pnpm exec next dev --hostname localhost --port 3220",
      url: "http://localhost:3220/login",
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        REDMINE_BASE_URL: "http://127.0.0.1:3219",
        IRON_SESSION_PASSWORD: browserTestSessionPassword,
        NEXT_TEST_DIST_DIR: ".next-e2e",
      },
    },
  ],
});
