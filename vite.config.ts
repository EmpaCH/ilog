import { defineConfig, loadEnv, createLogger } from "vite";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

/// <reference types="vitest/config" />
export default defineConfig(({ command, mode }) => {
  const logger = createLogger()
  const env = loadEnv(mode, process.cwd(), "");
  return {
    logLevel: "info",
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
          rewrite: (path) => {logger.info(`AS ${path}`); return path}
        },
        "/datastore_server/":{
          target: `${env.VITE_APP_DSS_URL}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {logger.info(`DSS ${path}`); return path}
        },
        "/afs-server/": {
          target: `${env.VITE_APP_AFS_URL}`,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {logger.info(`AS ${path}`); return path},
        },
      },
    },
  };
});
