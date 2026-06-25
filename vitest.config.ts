import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setupEnv.ts"],
    testTimeout: 15000,
    fileParallelism: false, // tests share one Postgres DB; avoid cross-test races
  },
});