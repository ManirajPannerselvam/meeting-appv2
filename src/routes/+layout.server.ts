/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/+layout.server.ts
 * ============================================================
 * PURPOSE: FAST + SECURE - Server session load
 * ============================================================
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	// ✅ SECURE: safeGetSession is set in hooks.server.ts - guard if missing on build
	try {
		const safeGetSession = (locals as any).safeGetSession;
		
		if (!safeGetSession) {
			// ✅ FIX: During Vercel build, hooks may not run - don't crash, return null session
			// This prevents FUNCTION_INVOCATION_FAILED
			return {
				user: null,
				session: null,
				cookies: cookies.getAll()
			};
		}

		const { session, user } = await safeGetSession();
		
		return {
			user: user ?? session?.user ?? null,
			session: session ?? null,
			cookies: cookies.getAll() // needed for +layout.ts SSR sync
		};
	} catch (e) {
		// ✅ SECURE: Don't leak error to client, log server side only
		console.error('[+layout.server.ts] safeGetSession failed:', e);
		return {
			user: null,
			session: null,
			cookies: cookies.getAll()
		};
	}
};

// ✅ FIX: This file must be dynamic - don't prerender auth
export const prerender = false;