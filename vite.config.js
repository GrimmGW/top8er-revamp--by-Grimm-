import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tshAssetsPlugin } from "./src/plugin/tshPlugin.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const startggProxy = {
    target: "https://api.start.gg",
    changeOrigin: true,
    rewrite: () => "/gql/alpha",
    headers: env.STARTGG_TOKEN
      ? { Authorization: `Bearer ${env.STARTGG_TOKEN}` }
      : {},
  };

  return {
    plugins: [react(), tshAssetsPlugin()],
    server: {
      port: 5173,
      proxy: {
        "/api/startgg": startggProxy,
      },
    },
    preview: {
      port: 4173,
      proxy: {
        "/api/startgg": startggProxy,
      },
    },
  };
});
