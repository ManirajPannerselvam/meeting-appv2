import { createServerClient } from '@supabase/ssr'
import { type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public'

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
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
		const { data: { session }, error } = await event.locals.supabase.auth.getSession();
		
		if (error) throw error; // catch bad refresh token
		
		event.locals.user = session?.user?? null;
	} catch (error: any) {
		console.log('[Hook] Auth error - clearing supabase cookies:', error.message);
		
	// Delete all sb- cookies so user can login fresh
		event.cookies.getAll().forEach(c => {
			if (c.name.startsWith('sb-')) {
				event.cookies.delete(c.name, { path: '/' });
			}
	});
		event.locals.user = null;
	}

	return resolve(event);
};

export const handle = sequence(supabase);