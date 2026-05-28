import { defineConfig } from "vite"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react-swc"
import TanStackRouterVite from "@tanstack/router-plugin/vite"
import { request as httpsRequest } from "node:https"

function openbisDynamicProxy(): Plugin {
  return {
    name: 'openbis-dynamic-proxy',
    configureServer(server) {
      // connect strips '/openbis' from req.url, leaving /openbis/rmi-...
      server.middlewares.use('/openbis', (req, res, next) => {
        // Guard: only handle /openbis/... paths (not /openbis_logo.png etc.)
        if (!req.url?.startsWith('/openbis/')) return next();

        // Read the target hostname from the openbis-instance cookie.
        const cookieHeader = req.headers.cookie ?? '';
        const match = cookieHeader.match(/openbis-instance=([^;]+)/);
        const hostname = match ? decodeURIComponent(match[1]) : null;
        if (!hostname) return next();

        // Restore the double /openbis/openbis/ path the server expects.
        const targetPath = '/openbis' + req.url;

        const proxyReq = httpsRequest(
          {
            hostname,
            port: 443,
            path: targetPath,
            method: req.method,
            headers: { ...req.headers, host: hostname },
            rejectUnauthorized: false,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode!, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          },
        );

        proxyReq.on('error', (err) => {
          console.error('[openbis-proxy]', err.message);
          if (!res.headersSent) next(err);
        });

        req.pipe(proxyReq, { end: true });
      });

      server.middlewares.use('/datastore_server', (req, res, next) => {
        const cookieHeader = req.headers.cookie ?? '';
        const match = cookieHeader.match(/openbis-instance=([^;]+)/);
        const hostname = match ? decodeURIComponent(match[1]) : null;
        if (!hostname) return next();

        const targetPath = '/datastore_server' + (req.url ?? '/');

        const proxyReq = httpsRequest(
          {
            hostname,
            port: 443,
            path: targetPath,
            method: req.method,
            headers: { ...req.headers, host: hostname },
            rejectUnauthorized: false,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode!, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          },
        );

        proxyReq.on('error', (err) => {
          console.error('[datastore-proxy]', err.message);
          if (!res.headersSent) next(err);
        });

        req.pipe(proxyReq, { end: true });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), TanStackRouterVite(), openbisDynamicProxy()],
  server: { cors: true },
})


// /// <reference types="vitest/config" />
// export default defineConfig(({ mode }) => {
//   const env = loadEnv(mode, process.cwd(), "");
//   return {
//     test: {
//       testTransformMode: "web",
//       printConsoleTrace: false,
//       environment: "happy-dom",
//       testUrl: `${env.OPENBIS_URL}`,
//     },
//     plugins: [react(), TanStackRouterVite()],
//     server: {
//       cors: true,
//       proxy: {
//         "/openbis/": {
//           target: `${env.OPENBIS_URL}`,
//           changeOrigin: true,
//           secure: false,
//         },
//         "/datastore_server/": {
//           target: `${env.OPENBIS_URL}`,
//           changeOrigin: true,
//           secure: false,
//         },
//       },
//     },
//   };
// });
