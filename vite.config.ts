import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      manifest: {
        id: "/",
        name: "Food Truck",
        short_name: "Food Truck",
        description: "Mesas, pedidos y caja de Food Truck",
        lang: "es-PE",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#fffaf0",
        background_color: "#fffaf0",
        icons: [
          { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        inlineWorkboxRuntime: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: [
          "assets/**/*.{js,css,woff2}",
          "pwa/*.png",
          "offline.html",
          "favicon.svg",
        ],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin, url }) =>
              sameOrigin &&
              request.mode === "navigate" &&
              !/^\/(?:api|socket\.io)(?:\/|$)/.test(url.pathname),
            handler: "NetworkOnly",
            options: { precacheFallback: { fallbackURL: "/offline.html" } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
