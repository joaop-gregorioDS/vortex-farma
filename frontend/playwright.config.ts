import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.VF_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: {
      ...(process.env.VF_BROWSER_PATH
        ? { executablePath: process.env.VF_BROWSER_PATH }
        : {}),
    },
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
