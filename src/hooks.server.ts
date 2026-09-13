import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback', '/forgot-password', '/reset-password'];

export const handle: Handle = async ({ event, resolve }) => {
        event.locals.supabase = createServerClient(
                PUBLIC_SUPABASE_CHAT_URL,
                PUBLIC_SUPABASE_CHAT_ANON_KEY,
                {
                        cookies: {
                                getAll: () => event.cookies.getAll(),
                                setAll: (cs) => cs.forEach(({name,value,options}) => 
                                  event.cookies.set(name,value,{
                                    ...options, 
                                    path:'/',
                                    httpOnly: true, // ✅ SECURE: prevent XSS
                                    secure: true, // ✅ SECURE: HTTPS only
                                    sameSite: 'lax' as const // ✅ SECURE: CSRF protection
                                  }))
                        }
                }
        );

        // ✅ SPEED: Skip auth check for static assets - fast open
        const path = event.url.pathname;
        if (path.startsWith('/_app/') || path.startsWith('/api/health') || /\.(png|jpg|jpeg|svg|ico|css|js|woff2?)$/.test(path)) {
            return resolve(event);
        }

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

        event.locals.safeGetSession = async () => {
                const { data: { session: s } } = await event.locals.supabase.auth.getSession();
                if (!s) return { session: null, user: null };
                const { data: { user }, error } = await event.locals.supabase.auth.getUser();
                if (error || !user) return { session: null, user: null };
                return { session: s, user };
        };

        const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/')) || path === '/' || path.startsWith('/_app');
        
        const isPrivate = ['/dashboard', '/d/', '/chat', '/c/', '/reports', '/r/', '/settings', '/meetings', '/logout'].some(p => {
                if (p.endsWith('/')) return path.startsWith(p) || path === p.slice(0,-1);
                return path === p || path.startsWith(p + '/');
        });

        // ✅ FIX: Use SvelteKit redirect() not manual Response - fixes FUNCTION_INVOCATION_FAILED on Vercel
        if (isPrivate && !event.locals.user) {
                // ✅ FIX: Don't redirect during Vercel build prerender check
                if (event.request.headers.get('x-prerender') || event.url.searchParams.has('__prerender')) {
                    return resolve(event);
                }
                throw redirect(303, `/login?next=${encodeURIComponent(path)}`);
        }

        // ✅ FIXED - directly go to /chat after login, not /dashboard - use redirect()
        // ✅ FIX: Only redirect logged-in user from /login, /, /register - not /dashboard to avoid loop
        if (event.locals.user && (path === '/login' || path === '/register' || path === '/')) {
                throw redirect(303, '/chat');
        }
        // ✅ FIX: /dashboard -> /chat should be 307 not loop
        if (event.locals.user && path === '/dashboard') {
                throw redirect(307, '/chat');
        }

        return resolve(event, { filterSerializedResponseHeaders: (n) => n==='content-range' || n==='x-supabase-api-version' });
};