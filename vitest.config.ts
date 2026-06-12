import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      REDIS_URL: "redis://localhost:6379",
      DATABASE_URL: "postgres://localhost:5432/testdb",
      ASI1_API_KEY: "test-key",
    },
  },
});
