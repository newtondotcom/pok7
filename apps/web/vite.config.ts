import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({}),
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "public",
      filename: "sw.js",
      injectRegister: "auto",
      pwaAssets: { disabled: false, config: true },
      devOptions: { enabled: false },
      manifest: {
        name: "pok7",
        short_name: "pok7",
        description:
          "An enhancement of Meta pokes in a modern PWA with liquid glass theme",
        theme_color: "#31d748",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "portrait-primary",
        categories: ["social", "entertainment"],
        shortcuts: [
          {
            name: "Poke someone",
            short_name: "Poke",
            description: "Quickly see your pokes",
            url: "/",
            icons: [
              {
                src: "/favicon-32x32.png",
                sizes: "32x32",
                type: "image/png",
              },
            ],
          },
          {
            name: "Leaderboard",
            short_name: "Leaderboard",
            description: "Quickly see your pokes ranking",
            url: "/leaderboard",
            icons: [
              {
                src: "/favicon-32x32.png",
                sizes: "32x32",
                type: "image/png",
              },
            ],
          },
          {
            name: "Account",
            short_name: "Account",
            description: "Manage your account",
            url: "/account",
            icons: [
              {
                src: "/favicon-32sx32.png",
                sizes: "32x32",
                type: "image/png",
              },
            ],
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});