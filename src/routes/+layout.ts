/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/+layout.ts
 * ============================================================
 */

export const ssr = true;

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
				global: { fetch }
			})
		: createServerClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
				global: { fetch },
				cookies: {
					getAll: () => data.cookies ?? []
				}
			});

	// Realtime auth check on client
	const { data: { session } } = await supabase.auth.getSession();

	return {
		supabase,
		session,
		user: data.user,
		cookies: data.cookies
	};
};