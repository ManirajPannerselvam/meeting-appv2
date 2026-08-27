/**
 * ============================================================
 * Temple Operations Reporting System
 * File : vite.config.ts
 * ============================================================
 * PURPOSE
 * Vite + Tauri dev config
 * ============================================================
 */

import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [sveltekit()],

  clearScreen: false,
  
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0', // LAN testing ku. host || false use pannadhinga
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
          overlay: false,
        }
      : {
          overlay: false,
        },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));