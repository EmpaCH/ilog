import { defineConfig } from "vite"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react-swc"
import TanStackRouterVite from "@tanstack/router-plugin/vite"
import { request as httpsRequest } from "node:https"

function openbisDynamicProxy(): Plugin {
  function createProxyMiddleware(
    prefix: string,
    logName: string,
    guard?: (url: string) => boolean,
  ) {
    return (req: any, res: any, next: any) => {
      if (guard && !guard(req.url ?? '')) return next();

      const cookieHeader: string = req.headers?.cookie ?? '';
      const match = cookieHeader.match(/openbis-instance=([^;]+)/);
      const hostname = match ? decodeURIComponent(match[1]) : null;
      if (!hostname) return next();

      const targetPath = prefix + (req.url ?? '/');

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

      proxyReq.on('error', (err: Error) => {
        console.error(`[${logName}]`, err.message);
        if (!res.headersSent) next(err);
      });

      req.pipe(proxyReq, { end: true });
    };
  }

  return {
    name: 'openbis-dynamic-proxy',
    configureServer(server) {
      server.middlewares.use('/openbis', createProxyMiddleware('/openbis', 'openbis-proxy', (url) => url.startsWith('/openbis/')));
      server.middlewares.use('/datastore_server', createProxyMiddleware('/datastore_server', 'datastore-proxy'));
      server.middlewares.use('/afs-server', createProxyMiddleware('/afs-server', 'afs-proxy'));
    },
  };
}

export default defineConfig({
  plugins: [react(), TanStackRouterVite(), openbisDynamicProxy()],
  server: { cors: true },
})
