import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so the tests don't run the router plugin or the openBIS proxy
export default defineConfig({
  test: {
    // The openBIS JS API needs a browser environment (window, jQuery) to load
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
