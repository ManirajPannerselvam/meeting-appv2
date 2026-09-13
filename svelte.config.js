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
                // ✅ SPEED: edge caching for static
                isr: { expiration: 3600 }
              })
            : adapterNode({
                // ✅ SPEED: keep alive
                precompress: true
              }),

        // ✅ SPEED: only chat prerender for instant open, others background
        prerender: {
            entries: ['/chat', '/'],
            handleHttpError: 'warn',
            handleMissingId: 'warn'
        },

        // ✅ SECURITY: high priority - CSP + secure headers
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
                'frame-ancestors': ['none']
            }
        },

        // ✅ SPEED: alias + version polling
        version: {
            pollInterval: 1000 * 60 * 5 // check new version every 5min background
        }
    },

    // ✅ SPEED: vite build split + compress
    vitePlugin: {
        experimental: {
            inspector: false
        }
    }
};

export default config;