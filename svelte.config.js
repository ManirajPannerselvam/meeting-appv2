// Uses adapter-vercel on Vercel, adapter-static for Tauri/local builds
// Vercel sets VERCEL=1 automatically during builds
import adapterVercel from '@sveltejs/adapter-vercel';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Check if we're building on Vercel
const isVercel = process.env.VERCEL === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: isVercel 
      ? adapterVercel()  // For Vercel: handles SSR + routing
      : adapterStatic({  // For Tauri: SPA mode
          pages: 'build',
          assets: 'build',
          fallback: 'index.html',
          precompress: false
        }),
    prerender: { 
      entries: []
    }
  }
};

export default config;