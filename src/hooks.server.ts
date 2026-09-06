import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/login', '/auth/callback'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_CHAT_URL, 
		PUBLIC_SUPABASE_CHAT_ANON_KEY, 
		{
			cookies: { 
				getAll: () => event.cookies.getAll(), 
				setAll: (cs) => cs.forEach(({name,value,options}) => event.cookies.set(name,value,{...options, path:'/'})) 
			}
		}
	);

	// SECURE: validate session with getUser(), not getSession() alone
	const { data: { session } } = await event.locals.supabase.auth.getSession();
	
	if (session) {
		const { data: { user }, error } = await event.locals.supabase.auth.getUser();
		if (error || !user) {
			event.locals.session = null;
			event.locals.user = null;
		} else {
			event.locals.session = session;
			event.locals.user = user;
		}
	} else {
		event.locals.session = null;
		event.locals.user = null;
	}

	// helper for pages to use secure session
	event.locals.safeGetSession = async () => {
		const { data: { session: s } } = await event.locals.supabase.auth.getSession();
		if (!s) return { session: null, user: null };
		const { data: { user }, error } = await event.locals.supabase.auth.getUser();
		if (error || !user) return { session: null, user: null };
		return { session: s, user };
	};

	// === ADD GUARD - THIS FIXES YOUR 5 POINTS ===
	const path = event.url.pathname;
	const isPublic = PUBLIC_ROUTES.some(r => path.startsWith(r)) || path === '/';
	const isPrivate = ['/dashboard', '/d', '/chat', '/c', '/reports', '/r', '/settings', '/meetings', '/logout'].some(p => path.startsWith(p));

	if (isPrivate && !event.locals.user) {
		return new Response(null, {
			status: 303,
			headers: { location: `/login?next=${encodeURIComponent(path)}` }
		});
	}

	if (event.locals.user && path === '/login') {
		return new Response(null, {
			status: 303,
			headers: { location: '/dashboard' }
		});
	}

	return resolve(event, { filterSerializedResponseHeaders: (n) => n==='content-range' || n==='x-supabase-api-version' });
};