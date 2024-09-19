import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import TanStackRouterVite from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), TanStackRouterVite()],
    server: {
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
