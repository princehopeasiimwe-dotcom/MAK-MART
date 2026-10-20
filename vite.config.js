import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Writes public/sitemap.xml + public/robots.txt on every production build,
// no matter which build command the host runs (npm run build or vite build).
function sitemapPlugin() {
  return {
    name: "mak-mart-sitemap",
    apply: "build",
    buildStart() {
      try {
        execFileSync(process.execPath, ["scripts/generate-sitemap.mjs"], {
          stdio: "inherit",
        });
      } catch (err) {
        console.warn("sitemap: skipped (" + err.message + ")");
      }
    },
  };
}

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Third-party code changes rarely, so keep it in its own
        // cacheable files instead of one big bundle.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  plugins: [
    sitemapPlugin(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "MAK MART | Makerere Student Marketplace",
        short_name: "MAK MART",
        description:
          "MAK MART - Makerere University's student marketplace for products, events and services.",
        theme_color: "#15352a",
        background_color: "#faf8f6",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // phone notification handlers (public/push-sw.js)
        importScripts: ["push-sw.js"],
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallbackDenylist: [
          /^\/admin/,
          /^\/vendor/,
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/,
          /^\/google.*\.html$/,
        ],
      },
    }),
  ],
});