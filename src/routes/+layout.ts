/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/+layout.ts
 * ============================================================
 * PURPOSE: FAST + SECURE - Universal supabase client
 * ============================================================
 */

// ✅ FIX: Tell Vercel this is DYNAMIC - don't prerender / cache 303
export const prerender = false;
export const ssr = true;
export const csr = true;

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	// ✅ SPEED: Reuse fetch for caching
	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
				global: { fetch },
				// ✅ SECURE: No localStorage persist for sensitive data - use cookies
				auth: {
					persistSession: true,
					detectSessionInUrl: true,
					flowType: 'pkce' // ✅ SECURE: PKCE flow
				}
			})
		: createServerClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
				global: { fetch },
				cookies: {
					getAll: () => data.cookies ?? [],
					// ✅ FIX: Missing setAll causes FUNCTION_INVOCATION_FAILED on Vercel
					setAll: () => {} // handled in +layout.server.ts
				}
			});

	// ✅ FIX: Don't call getSession() on server during build - causes 303
	// Use session from server load if exists, otherwise get on client only
	let session = (data as any).session ?? null;
	
	if (isBrowser()) {
		try {
			const { data: { session: clientSession } } = await supabase.auth.getSession();
			session = clientSession ?? session;
		} catch {
			// ignore auth error on build - don't crash function
			session = null;
		}
	}

	return {
		supabase,
		session,
		user: (data as any).user ?? session?.user ?? null,
		cookies: data.cookies
	};
};