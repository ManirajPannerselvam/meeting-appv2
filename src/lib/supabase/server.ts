/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/server.ts
 * ============================================================
 */

import {
	createServerClient,
	type CookieOptions
} from '@supabase/ssr';

import type { RequestEvent } from '@sveltejs/kit';

import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from '$env/static/public';

function createClient(
	event: RequestEvent,
	url: string,
	anonKey: string
) {
	if (!event) throw new Error('getSupabaseServer: event is undefined. Did you forget to pass event?');

	return createServerClient(url, anonKey, {
	cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
				cookiesToSet.forEach(({ name, value, options }) => {
					// cookies.set must be called in a server load/hook/action
					try {
						event.cookies.set(name, value, {
							...options,
							path: '/',
							httpOnly: true,
							sameSite: 'lax',
							secure: !import.meta.env.DEV // https in prod
						});
					} catch (error) {
						// This can happen if you call it from +page.ts instead of +page.server.ts
						console.error(`Failed to set cookie ${name}`, error);
					}
				});
			}
		}
	});
}

export function getSupabaseServer(event: RequestEvent) {
	if (!PUBLIC_SUPABASE_CHAT_URL || !PUBLIC_SUPABASE_CHAT_ANON_KEY) {
		throw new Error('Missing PUBLIC_SUPABASE_CHAT_URL or PUBLIC_SUPABASE_CHAT_ANON_KEY.');
	}

	const supabase = createClient(event, PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY);

	return { supabase };
}

// NEW: separate client for templates/production records
export function getSupabaseTemplatesServer(event: RequestEvent) {
	if (!PUBLIC_SUPABASE_TEMPLATES_URL || !PUBLIC_SUPABASE_TEMPLATES_ANON_KEY) {
		throw new Error('Missing PUBLIC_SUPABASE_TEMPLATES_URL or PUBLIC_SUPABASE_TEMPLATES_ANON_KEY.');
	}

	const supabaseTemplates = createClient(event, PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY);

	return { supabaseTemplates };
}

export default getSupabaseServer;