import { defineConfig, devices } from "@playwright/test";

const useExistingServer = process.env.PLAYWRIGHT_USE_EXISTING === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4326",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  webServer: useExistingServer
    ? undefined
    : {
        command: "pnpm dev --host 127.0.0.1 --port 4326",
        url: "http://127.0.0.1:4326",
        reuseExistingServer: !process.env.CI,
      },
});
