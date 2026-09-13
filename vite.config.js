/**
 * ============================================================
 * Temple Operations Reporting System
 * File : vite.config.ts
 * ============================================================
 * PURPOSE
 * Vite + Tauri dev config - FAST OPEN + SECURE
 * ============================================================
 */

import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [sveltekit()],

  clearScreen: false,

  // ✅ SPEED: pre-bundle supabase for instant open
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    exclude: ['@tauri-apps/api']
  },

  // ✅ SSR FIX: Prevent external error for manualChunks
  ssr: {
    noExternal: ['@supabase/supabase-js']
  },

  // ✅ SPEED + SECURE: build split
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false, // ✅ SECURE: no source in prod
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // ✅ FIX: Function form avoids "external module" error
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('svelte')) return 'svelte-vendor';
          }
        }
      }
    }
  },
  
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
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
    // ✅ SECURE: headers for dev
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  },

  // ✅ SECURE + SPEED: env prefix
  envPrefix: ['VITE_', 'PUBLIC_']
}));