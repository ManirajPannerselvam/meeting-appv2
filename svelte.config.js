import adapterVercel from '@sveltejs/adapter-vercel';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// ✅ FIX: Correct detection for Tauri dev + build
const isTauri = !!process.env.TAURI_DEV_HOST || !!process.env.TAURI_PLATFORM || !!process.env.TAURI_ENV_ARCH;
const isVercel = !!process.env.VERCEL;

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: isTauri 
			? adapterStatic({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html', // ✅ FIXES GET /dashboard 500 on refresh in Tauri
				precompress: false,
				strict: false
			  })
			: adapterVercel({
				runtime: 'nodejs22.x',
				regions: ['bom1'],
				split: false
			  }),

		prerender: {
			// ✅ FIX: Only prerender public pages. /dashboard must NOT be prerendered - it needs auth
			entries: isTauri ? ['*'] : ['/', '/login', '/register'],
			handleHttpError: 'warn',
			handleMissingId: 'warn',
			// ✅ FIX: Remove hardcoded origin - it breaks localhost:1420
			origin: isVercel ? 'https://meeting-appv2-one.vercel.app' : undefined
		},

		// ✅ FIX: CSP was blocking localhost:1420 ws:// and tauri:// - causes 500 in dev
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'unsafe-inline'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'img-src': ['self', 'data:', 'https:', 'blob:', 'asset:', 'tauri:'],
				'media-src': ['self', 'data:', 'https:', 'blob:', 'asset:', 'tauri:'],
				'connect-src': [
					'self', 
					'https://*.supabase.co', 
					'wss://*.supabase.co', 
					'https:', 
					'http://localhost:*',
					'http://127.0.0.1:*',
					'ws://localhost:*',
					'ws://127.0.0.1:*',
					'tauri:',
					'ipc:'
				],
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
			$lib: './src/lib',
			// ✅ FIX: This must be here too - fixes startTime BUG + dashboard 500
			// When not Tauri, use supabase db, when Tauri use desktop db
			'$lib/server/db': isTauri && !isVercel ? './src/lib/server/db.desktop.ts' : './src/lib/server/db.ts'
		},

		// ✅ FIX: Dashboard should not be prerendered, it needs session
		paths: {
			relative: false
		}
	},

	vitePlugin: {
		experimental: {
			inspector: false
		}
	}
};

export default config;