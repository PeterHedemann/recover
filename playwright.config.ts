import { defineConfig } from "@playwright/test";

// Deliberately use a separate local database. Never point this suite at production.
const database =
  process.env.TEST_DATABASE_URL ||
  "mysql://myuser:mypass@127.0.0.1:3306/app_test";
const url = new URL(database);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !url.pathname.endsWith("_test")
) {
  throw new Error(
    "Browser tests require a localhost database whose name ends in _test.",
  );
}
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: { baseURL: "http://localhost:3011", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node --import tsx tests/mock-openai.ts",
      url: "http://127.0.0.1:4011/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run db:migrate && npm run dev -- --webpack --port 3011",
      url: "http://localhost:3011",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: database,
        DATABASE_SSL: "false",
        BETTER_AUTH_URL: "http://localhost:3011",
        BETTER_AUTH_SECRET: "local-browser-tests-only-secret-123456789",
        OPENAI_API_KEY: "test-only",
        OPENAI_BASE_URL: "http://127.0.0.1:4011/v1",
        OPENAI_IMAGE_MODEL: "gpt-image-2",
        MAX_SAVED_UPLOADS: "50",
        DAILY_PROCESSING_LIMIT: "3",
      },
    },
  ],
});
