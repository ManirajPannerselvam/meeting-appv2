/**
 * ============================================================
 * FAST + SECURE - Universal supabase client
 * ============================================================
 */
export const prerender = false;
export const ssr = true;
export const csr = true;

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
				global: { fetch },
				auth: {
					persistSession: true,
					detectSessionInUrl: true,
					flowType: 'pkce' // ✅ SECURE: PKCE prevents code interception
				}
			})
		: createServerClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
				global: { fetch },
				cookies: {
					getAll() {
						return data.cookies ?? [];
					},
					setAll() {
						// ✅ Cookies are set in hooks.server.ts + +layout.server.ts
						// Don't set here - this is server LOAD, not server HOOK
					}
				}
			});

	// ✅ SPEED: Don't re-fetch session on server - use data from +layout.server.ts
	// ✅ SPEED: On client, session already available from server, no extra network
	const session = data.session ?? null;
	const user = data.user ?? session?.user ?? null;

	return {
		supabase,
		session,
		user
	};
};