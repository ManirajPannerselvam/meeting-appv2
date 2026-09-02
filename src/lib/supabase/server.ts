/**
 * Temple Operations Reporting System
 * File : src/lib/supabase/server.ts
 */
import {
	createServerClient,
	type CookieOptions
} from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

function createClient(
	event: RequestEvent,
	url: string,
	anonKey: string
) {
	if (!event) throw new Error('getSupabaseServer: event is undefined');

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
				cookiesToSet.forEach(({ name, value, options }) => {
					try {
						event.cookies.set(name, value, {
							...options,
							path: '/',
							httpOnly: true,
							sameSite: 'lax',
							secure:!import.meta.env.DEV
						});
					} catch {
						// ignore - called from +page.ts
					}
				});
			}
		}
	});
}

export function getSupabaseServer(event: RequestEvent) {
	const url = env.PUBLIC_SUPABASE_CHAT_URL || env.PUBLIC_SUPABASE_URL;
	const anonKey = env.PUBLIC_SUPABASE_CHAT_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url ||!anonKey) throw new Error('Missing CHAT_URL or ANON_KEY');
	return { supabase: createClient(event, url, anonKey) };
}

export function getSupabaseTemplatesServer(event: RequestEvent) {
	const url = env.PUBLIC_SUPABASE_TEMPLATES_URL || env.PUBLIC_SUPABASE_URL;
	const anonKey = env.PUBLIC_SUPABASE_TEMPLATES_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url ||!anonKey) throw new Error('Missing TEMPLATES_URL or ANON_KEY');
	return { supabaseTemplates: createClient(event, url, anonKey) };
}

export default getSupabaseServer;