/**
 * ============================================================
 * Temple Operations Reporting System
 * File : vite.config.ts
 * ============================================================
 * Vercel + Tauri - FAST + SECURE + NO 500 + NO startTime BUG
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

  // ✅ SECURE + SPEED: kill Vercel analytics in dev
  define: {
    'process.env.VERCEL_ANALYTICS_DEBUG': JSON.stringify(false),
    'process.env.NEXT_PUBLIC_VERCEL_ANALYTICS': JSON.stringify(false),
    '__VERCEL_ANALYTICS__': JSON.stringify(false)
  },

  resolve: {
    alias: {
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
    rollupOptions: {
      output: {
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
      'X-XSS-Protection': '1; mode=block',
      // ✅ SECURE: extra
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  },

  envPrefix: ['VITE_', 'PUBLIC_']
}));