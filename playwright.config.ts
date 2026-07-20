import { defineConfig } from "@playwright/test";

const PORT = 3123;
const baseURL = `http://localhost:${PORT}`;

// A unique client IP per test-run invocation. The app's rate limiter buckets by
// x-forwarded-for, so this gives every run its own bucket — signup/order limits
// never accumulate across repeated runs against a reused (in-memory) server.
const CLIENT_IP = `10.88.${1 + Math.floor(Math.random() * 254)}.${1 + Math.floor(Math.random() * 254)}`;

/**
 * E2E config. Playwright builds and serves a PRODUCTION build (not `next dev`)
 * on its own port, with MONGODB_URI forced empty so the app runs its in-memory
 * data path: tests are hermetic, reset every run, and never touch a real
 * MongoDB. Production mode matters — `next dev` double-renders (SSR + hydration)
 * and re-renders on every fetch, which detaches elements mid-action and makes
 * e2e flaky; the production build is stable. Runs serially (workers: 1) because
 * the in-memory store is shared per server process — serial keeps it
 * deterministic.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    extraHTTPHeaders: { "x-forwarded-for": CLIENT_IP },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // In CI the workflow runs `npm run build` as its own step (a clear build/
    // typecheck signal) and this just serves it. Locally, build+serve so the
    // whole suite runs from one command.
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Empty MONGODB_URI → the app's no-database (in-memory) path. @next/env
      // does not overwrite an already-set process env var, so this wins over
      // .env.local.
      MONGODB_URI: "",
      PORT: String(PORT),
      // `next start` runs in production mode, where the app requires AUTH_SECRET.
      // This is a throwaway value for the ephemeral in-memory test server only —
      // it protects nothing real and is never used outside the e2e run.
      AUTH_SECRET: "e2e-throwaway-not-a-real-secret-0123456789",
    },
  },
});
