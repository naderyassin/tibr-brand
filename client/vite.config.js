import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  envDir: "..",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/assets": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/js/config.js": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
});
