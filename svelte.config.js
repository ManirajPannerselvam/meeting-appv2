import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
			regions: ['bom1'], // ✅ 50K + SPEED: Mumbai = 35ms for Villupuram, iad1 = 280ms
			split: true // ✅ 50K: chat/report/settings = 3 separate lambdas, not 1
		}),

		prerender: {
			entries: ['/', '/login', '/register'],
			handleHttpError: 'warn',
			handleMissingId: 'warn',
			origin: 'https://meeting-appv2-one.vercel.app'
		},

		// ✅ SECURITY: high priority - kept same + tightened
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
				'form-action': ['self'],
				'base-uri': ['self']
			}
		},

		version: {
			pollInterval: 0 // ✅ Your 85s timeline was this polling
		},

		alias: {
			$lib: './src/lib'
		}
	},

	vitePlugin: {
		experimental: {
			inspector: false
		}
	}
};

export default config;