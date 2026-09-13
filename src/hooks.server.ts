import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback', '/forgot-password', '/reset-password'];

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

        const path = event.url.pathname;
        
        const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/')) || path === '/';
        
        const isPrivate = ['/dashboard', '/d/', '/chat', '/c/', '/reports', '/r/', '/settings', '/meetings', '/logout'].some(p => {
                if (p.endsWith('/')) return path.startsWith(p) || path === p.slice(0,-1);
                return path === p || path.startsWith(p + '/');
        });

        if (isPrivate && !event.locals.user) {
                return new Response(null, {
                        status: 303,
                        headers: { location: `/login?next=${encodeURIComponent(path)}` }
                });
        }

        // ✅ FIXED - directly go to /chat after login, not /dashboard
        if (event.locals.user && (path === '/login' || path === '/register' || path === '/' || path === '/dashboard')) {
                return new Response(null, {
                        status: 303,
                        headers: { location: '/chat' }
                });
        }

        return resolve(event, { filterSerializedResponseHeaders: (n) => n==='content-range' || n==='x-supabase-api-version' });
};