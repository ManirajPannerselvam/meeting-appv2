/**
 * ============================================================
 * Temple Operations Reporting System
 * File : vite.config.ts
 * ============================================================
 * PURPOSE: Vercel + Tauri - FAST + SECURE + NO 500
 * ============================================================
 */

import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;
const isVercel = !!process.env.VERCEL;
const isTauri = !!process.env.TAURI_DEV_HOST || !!process.env.TAURI_PLATFORM;

export default defineConfig(async () => ({
  plugins: [sveltekit()],

  clearScreen: false,

  // Prevent Vercel analytics + Tauri env leak
  define: {
    'process.env.VERCEL_ANALYTICS_DEBUG': JSON.stringify(false),
  },

  resolve: {
    alias: {
      // ✅ FIX 1: Only alias in Tauri Desktop, NOT in Vercel and NOT in dev browser
      // Your dashboard 500 comes from this alias loading better-sqlite3 in browser
      ...(isTauri && !isVercel ? {
        '$lib/server/db': path.resolve('./src/lib/server/db.desktop.ts')
      } : {})
    }
  },

  optimizeDeps: {
    include: ['@supabase/supabase-js'],
    // ✅ FIX 2: Exclude Tauri deps from browser bundle
    exclude: ['@tauri-apps/api', '@tauri-apps/plugin-sql', 'better-sqlite3']
  },

  ssr: {
    // ✅ FIX 3: This is critical for dashboard 500
    // SvelteKit SSR must NOT bundle better-sqlite3
    external: ['better-sqlite3', 'ws', 'mock-aws-s3', 'nock'],
    noExternal: ['@supabase/supabase-js']
  },

  build: {
    target: 'esnext',
    minify: isVercel ? 'esbuild' : false, // Faster Tauri dev build
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
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
          overlay: true,
        }
      : {
          overlay: true,
        },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  envPrefix: ['VITE_', 'PUBLIC_'],

  // ✅ FIX 4: For SvelteKit SPA fallback - fixes GET /dashboard 500 on refresh
  // Add this in svelte.config.js NOT here, but keeping here for safety
  // In svelte.config.js make sure: adapter-static fallback: 'index.html'
})); 