import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

/// <reference types="vitest/config" />
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    test: {
      testTransformMode: "web",
      printConsoleTrace: false,
      environment: "happy-dom",
      testUrl: `${env.VITE_APP_OPENBIS_URL}`,
    },
    plugins: [react(), TanStackRouterVite()],
    server: {
      cors: true,
      proxy: {
        "/openbis/": {
          target: `${env.VITE_APP_OPENBIS_URL}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
