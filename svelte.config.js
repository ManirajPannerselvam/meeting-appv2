// Uses adapter-vercel on Vercel, adapter-node for local/desktop
import adapterVercel from '@sveltejs/adapter-vercel';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isVercel = process.env.VERCEL === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: isVercel
            ? adapterVercel({
                runtime: 'nodejs20.x'
              })
            : adapterNode({
                precompress: true
              }),

        prerender: {
            // ✅ FIX: Only prerender truly public pages - not auth pages
            entries: ['/', '/login', '/register'],
            handleHttpError: 'warn',
            handleMissingId: 'warn'
        },

        // ✅ SECURITY: high priority - KEPT, optimized for speed
        csp: {
            mode: 'auto',
            directives: {
                'default-src': ['self'],
                'script-src': ['self', 'unsafe-inline'],
                'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
                'img-src': ['self', 'data:', 'https:', 'blob:'],
                'media-src': ['self', 'data:', 'https:', 'blob:'],
                'connect-src': ['self', 'https://*.supabase.co', 'wss://*.supabase.co', 'https:'],
                'font-src': ['self', 'https://fonts.gstatic.com', 'data:'],
                'frame-ancestors': ['none'],
                'form-action': ['self']
            }
        },

        version: {
            pollInterval: 1000 * 60 * 5
        }
    },

    vitePlugin: {
        experimental: {
            inspector: false
        }
    }
};

export default config;