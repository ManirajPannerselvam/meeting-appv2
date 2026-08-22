import { createServerClient } from '@supabase/ssr'
import { type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { env } from '$env/dynamic/public'

const supabase: Handle = async ({ event, resolve }) => {
	const supabaseUrl = env.PUBLIC_SUPABASE_CHAT_URL || env.PUBLIC_SUPABASE_URL
	const supabaseAnonKey = env.PUBLIC_SUPABASE_CHAT_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl ||!supabaseAnonKey) {
		console.error('Missing Supabase env');
		return resolve(event);
	}

	event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, {...options, path: '/' });
				});
			}
		}
	});

	try {
		const {
			data: { session },
			error
		} = await event.locals.supabase.auth.getSession();

		if (error) throw error;

		event.locals.user = session?.user?? null;
	} catch (error: any) {
		console.log('[Hook] Auth error - clearing supabase cookies:', error.message);
		event.cookies.getAll().forEach((c) => {
			if (c.name.startsWith('sb-')) {
				event.cookies.delete(c.name, { path: '/' });
			}
		});
		event.locals.user = null;
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

export const handle = sequence(supabase);