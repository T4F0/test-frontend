import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  // Load env file based on `mode` from the Frontend folder (where this config lives).
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, rootDir, "");
  const apiTarget = env.VITE_API_URL || "http://localhost:9077";
  // const apiTarget = env.VITE_API_URL || 'http://localhost:8000'

  // For Electron builds (file:// protocol), use relative base path
  const isElectronBuild =
    command === "build" &&
    process.env.npm_lifecycle_event?.includes("electron");
  const base = isElectronBuild ? "./" : "/";

  return {
    plugins: [react()],
    envDir: rootDir,
    base: base,
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/ws": {
          target: apiTarget.replace("http", "ws"),
          ws: true,
          changeOrigin: true,
        },
        "/media": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    define: {
      global: "window",
    },
  };
});
