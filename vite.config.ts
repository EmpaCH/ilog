import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";
import { log } from "console";

/// <reference types="vitest/config" />
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  log(env)
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
      },
    },
  };
});


