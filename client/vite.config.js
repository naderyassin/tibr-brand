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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("jodit") || id.includes("dompurify")) {
                return "vendor-editor";
              }
              if (id.includes("leaflet")) {
                return "vendor-map";
              }
              if (id.includes("lucide-react")) {
                return "vendor-icons";
              }
              if (id.includes("framer-motion") || id.includes("gsap") || id.includes("lenis")) {
                return "vendor-motion";
              }
              if (id.includes("@supabase")) {
                return "vendor-supabase";
              }
              if (id.includes("@tanstack")) {
                return "vendor-query";
              }
              if (
                id.includes("node_modules/react/") ||
                id.includes("node_modules/react-dom/") ||
                id.includes("node_modules/react-router") ||
                id.includes("node_modules/scheduler/")
              ) {
                return "vendor-react";
              }
            }
          },
        },
      },
    },
  };
});
