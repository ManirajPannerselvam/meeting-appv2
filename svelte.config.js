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
                runtime: 'nodejs20.x',
                // ✅ FIX: Don't use ISR for auth pages - causes 303 cache
                // isr: { expiration: 3600 }  <-- REMOVE THIS, it caches redirect
              })
            : adapterNode({
                precompress: true
              }),

        // ✅ FIX: Don't prerender auth pages - they need user session
        // Prerendering /chat causes FUNCTION_INVOCATION_FAILED + 303
        prerender: {
            entries: ['*'], // only static public pages, not /chat
            handleHttpError: 'warn',
            handleMissingId: 'warn',
            origin: 'https://your-app.vercel.app' // replace with your domain
        },

        // ✅ SECURITY: high priority - CSP + secure headers - KEPT
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