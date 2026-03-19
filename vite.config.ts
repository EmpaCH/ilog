import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

/// <reference types="vitest/config" />
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const originFromUrl = (value?: string): string | undefined => {
    if (!value) return undefined;
    try {
      return new URL(value).origin;
    } catch {
      return undefined;
    }
  };

  const proxyTargetFromUrl = (value?: string): string | undefined => {
    if (!value) return undefined;
    try {
      return new URL(value).origin;
    } catch {
      return value;
    }
  };

  const openbisOrigin = originFromUrl(env.OPENBIS_URL);
  const isLocalhostOrigin = (origin?: string) =>
    origin != null && /^(http|https):\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const isLocalDockerIngress =
    env.OPENBIS_FQDN === "localhost.openbis.net" || openbisOrigin === "https://localhost.openbis.net";

  const asTarget = isLocalDockerIngress
    ? `http://localhost:${env.OPENBIS_AS_PORT || "8080"}`
    : (proxyTargetFromUrl(env.OPENBIS_URL) ?? env.OPENBIS_URL);

  const dssTarget = isLocalDockerIngress
    ? `http://localhost:${env.OPENBIS_DSS_PORT || "8081"}`
    : (proxyTargetFromUrl(env.OPENBIS_DSS_URL ?? env.OPENBIS_URL) ?? env.OPENBIS_DSS_URL ?? env.OPENBIS_URL);

  // Prefer an explicit AFS base URL if provided.
  // Otherwise:
  // - For remote deployments, proxy AFS to the same origin as OPENBIS_URL (AFS is typically served at /afs-server).
  // - For the local docker stack, go directly to the plain HTTP AFS service on localhost:8085.
  const afsTarget =
    proxyTargetFromUrl(env.OPENBIS_AFS_URL) ??
    (isLocalDockerIngress
      ? "http://localhost:8085"
      : (!isLocalhostOrigin(openbisOrigin) && openbisOrigin ? openbisOrigin : "http://localhost:8085"));

  return {
    test: {
      testTransformMode: "web",
      printConsoleTrace: false,
      environment: "happy-dom",
      testUrl: `${env.OPENBIS_URL}`,
      setupFiles: ["./src/tests/vitest.setup.ts"],
    },
    plugins: [react(), TanStackRouterVite()],
    server: {
      cors: true,
      proxy: {
        "/openbis/": {
          target: asTarget,
          changeOrigin: true,
          secure: false,
        },
        "/datastore_server/": {
          target: dssTarget,
          changeOrigin: true,
          secure: false,
        },
        "/afs-server/": {
          // AFS is served separately from the DSS/AS in this docker setup.
          // The openbis-app container exposes the AFS server on port 8085.
          // We proxy it through Vite to keep same-origin requests from the browser.
          target: afsTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});


