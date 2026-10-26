import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. In CI they run against a local Supabase (Docker) and a production build.
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    ...devices["Pixel 5"],
    baseURL: "http://127.0.0.1:3000",
    locale: "ar",
    trace: "retain-on-failure",
    // Full Chromium (new headless), not the reduced headless shell: it handles service workers like real Chrome.
    channel: process.env.PW_CHROMIUM_PATH ? undefined : "chromium",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  webServer: {
    command: "npm run start -- -p 3000 -H 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
