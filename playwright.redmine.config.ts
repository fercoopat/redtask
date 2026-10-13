import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/redmine",
  outputDir: "./test-results-redmine",
  testMatch: "*.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3031",
    browserName: "chromium",
    locale: "es-ES",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm redmine:test:app",
    url: "http://localhost:3031/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
