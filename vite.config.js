/**
 * ============================================================
 * Temple Operations Reporting System
 * File : vite.config.ts
 * ============================================================
 * Vercel + Tauri - FAST + SECURE + NO 500
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

  resolve: {
    alias: {
      // ✅ VERCEL FIX: Use dummy db on Vercel, real db on Tauri
      ...(isVercel ? {} : {
        '$lib/server/db': path.resolve('./src/lib/server/db.desktop.ts')
      })
    }
  },

  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    exclude: ['@tauri-apps/api', 'better-sqlite3', '@tauri-apps/plugin-sql']
  },

  ssr: {
    noExternal: ['@supabase/supabase-js'],
    external: ['better-sqlite3', '@tauri-apps/api', '@tauri-apps/plugin-sql', 'ws']
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    // ✅ FIXED: Removed manualChunks function - it breaks Vercel SSR
    rollupOptions: {
      output: {
        // Use object form, not function - Vercel safe
        manualChunks: {
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  
  server: {
    port: 1420,
    strictPort: true,
    host: host || '0.0.0.0',
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
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  },

  envPrefix: ['VITE_', 'PUBLIC_']
}));