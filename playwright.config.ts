import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // The suite uses one shared admin account and intentionally mutates/reverts
  // database fixtures. Parallel workers would race those writes and auth limits.
  workers: 1,

  use: {
    baseURL: process.env.E2E_BASE_URL || "https://sara-masala.vercel.app",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
});
