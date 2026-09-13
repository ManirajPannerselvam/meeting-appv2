/**
 * ============================================================
 * Temple Operations Reporting System
 * File : vite.config.ts
 * ============================================================
 * PURPOSE
 * Vite + Tauri dev + Vercel prod - FAST OPEN + SECURE + NO 500
 * ============================================================
 */

import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;
const isVercel = !!process.env.VERCEL;

export default defineConfig(async () => ({
  plugins: [sveltekit()],

  clearScreen: false,

  // ✅ VERCEL FIX: Isolate better-sqlite3 to desktop only
  resolve: {
    alias: isVercel ? {} : {
      // On Tauri dev/build -> use full sqlite file
      // On Vercel -> uses dummy src/lib/server/db.ts (no crash)
      '$lib/server/db': path.resolve('./src/lib/server/db.desktop.ts')
    }
  },

  // ✅ SPEED: pre-bundle supabase for instant open
  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    exclude: ['@tauri-apps/api', 'better-sqlite3']
  },

  // ✅ SSR FIX: Prevent external error + Vercel 500 fix
  ssr: {
    noExternal: ['@supabase/supabase-js'],
    external: ['better-sqlite3', '@tauri-apps/api', '@tauri-apps/plugin-sql', 'ws']
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