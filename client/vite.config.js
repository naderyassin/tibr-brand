import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    envDir: "..",
    define: {
      // server.js accepts either SUPABASE_URL or VITE_SUPABASE_URL; mirror that
      // fallback here so a fresh .env only needs one pair of these vars.
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL || env.SUPABASE_URL
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY
      ),
    },
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
  };
});
