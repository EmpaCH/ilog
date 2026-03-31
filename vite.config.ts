import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

/// <reference types="vitest/config" />
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    test: {
      testTransformMode: "web",
      printConsoleTrace: false,
      environment: "happy-dom",
      testUrl: `${env.OPENBIS_URL}`,
    },
    plugins: [react(), TanStackRouterVite()],
    server: {
      cors: true,
      proxy: {
        "/openbis/": {
          target: `${env.OPENBIS_URL}`,
          changeOrigin: true,
          secure: false,
        },
        "/datastore_server/": {
          target: `${env.OPENBIS_URL}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
