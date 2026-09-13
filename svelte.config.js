import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x'
		}),

		// ✅ FIX: Only prerender public pages - prevents 303 / FUNCTION_INVOCATION_FAILED
		prerender: {
			entries: ['/', '/login', '/register'],
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