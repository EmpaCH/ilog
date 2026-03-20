import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

/// <reference types="vitest/config" />
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const openbisTarget = env.OPENBIS_URL;
  const dssTarget = env.OPENBIS_DSS_URL ?? openbisTarget;
  const afsTarget = env.OPENBIS_AFS_URL ?? openbisTarget;

  return {
    test: {
      testTransformMode: "web",
      printConsoleTrace: false,
      environment: "happy-dom",
      testUrl: openbisTarget,
      setupFiles: ["./src/tests/vitest.setup.ts"],
    },
    plugins: [react(), TanStackRouterVite()],
    server: {
      cors: true,
      proxy: {
        "/openbis/": {
          target: openbisTarget,
          changeOrigin: true,
          secure: false,
        },
        "/datastore_server/": {
          target: dssTarget,
          changeOrigin: true,
          secure: false,
        },
        "/afs-server/": {
          target: afsTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
