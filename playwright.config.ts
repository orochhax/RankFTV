import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? `http://127.0.0.1:${port}`;
const vercelBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const serialSandboxAuth = process.env.E2E_SERIAL_AUTH === "1";

// The authentication safety guard reads E2E_BASE_URL directly. Keep it in
// sync with Playwright's effective default so local Sandbox runs are checked
// against the same destination that the browser actually opens.
process.env.E2E_BASE_URL ??= baseURL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI || serialSandboxAuth ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    extraHTTPHeaders: vercelBypass ? {
      "x-vercel-protection-bypass": vercelBypass,
    } : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 14"] } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
