import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "take-screenshots.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  // No globalSetup — we don't want to re-seed
  // No webServer — assume dev server is already running
});
