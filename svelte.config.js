import adapterVercel from '@sveltejs/adapter-vercel';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Auto-detect: Tauri sets this env when building android/ios
const isTauri = !!process.env.TAURI_ENV_ARCH || !!process.env.TAURI_PLATFORM;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: isTauri 
			? adapterStatic({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html',
				precompress: false
			  })
			: adapterVercel({
				runtime: 'nodejs22.x',
				regions: ['bom1'],
				split: false
			  }),

		prerender: {
			entries: ['/', '/login', '/register'],
			handleHttpError: 'warn',
			handleMissingId: 'warn',
			origin: 'https://meeting-appv2-one.vercel.app'
		},

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
			pollInterval: 0
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