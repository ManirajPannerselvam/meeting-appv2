import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback', '/forgot-password', '/reset-password'];

export const handle: Handle = async ({ event, resolve }) => {
        const isSecure = event.url.protocol === 'https:' || process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

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
                                    httpOnly: true, // ✅ SECURITY high priority
                                    secure: isSecure,
                                    sameSite: 'lax' as const,
                                    maxAge: options?.maxAge ?? 60*60*24*7
                                  }))
                        },
                        global: { 
                          fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) as any
                        },
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        },
                        realtime: { transport: undefined as any } as any
                }
        );

        const path = event.url.pathname;
        
        // ✅ 50K + SPEED: Skip auth for static, images, _app, api - instant open
        if (path.startsWith('/_app/') || path.startsWith('/api/') || path.startsWith('/_vercel/') || /\.(png|jpg|jpeg|svg|ico|css|js|woff2?|webp|avif|json|map)$/.test(path)) {
            return resolve(event, {
              filterSerializedResponseHeaders: (n) => n==='content-range' || n==='x-supabase-api-version'
            });
        }

        const isPublicRoute = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/')) || path === '/';
        const isPrivate = ['/dashboard', '/d/', '/chat', '/c/', '/reports', '/r/', '/settings', '/meetings', '/logout'].some(p => {
                if (p.endsWith('/')) return path.startsWith(p) || path === p.slice(0,-1);
                return path === p || path.startsWith(p + '/');
        });

        // ✅ 50K: Public = 0 DB calls
        if (isPublicRoute && !isPrivate) {
            event.locals.session = null;
            event.locals.user = null;
            event.locals.safeGetSession = async () => ({ session: null, user: null });
            return resolve(event, { filterSerializedResponseHeaders: (n) => n==='content-range' || n==='x-supabase-api-version' });
        }

        // ✅ 50K + SPEED: ONE call only - getUser validates JWT locally, getSession was 2nd call causing your timeline
        let session: any = null;
        let user: any = null;
        try{
          const { data: { user: u } } = await event.locals.supabase.auth.getUser();
          if (u) {
            user = u;
            // Don't call getSession() - for 50k it hits Supabase Auth server every request = 400ms delay
            // Session is not needed for RLS, only user.id is needed
          }
        }catch{
          user = null;
        }

        event.locals.session = session;
        event.locals.user = user;
        event.locals.safeGetSession = async () => ({ session, user });

        if (isPrivate && !user) {
                if (event.request.headers.get('x-prerender') || event.url.searchParams.has('__prerender')) {
                    return resolve(event);
                }
                throw redirect(303, `/login?next=${encodeURIComponent(path)}`);
        }

        if (user && (path === '/login' || path === '/register' || path === '/')) {
                throw redirect(303, '/chat');
        }
        if (user && path === '/dashboard') {
                throw redirect(307, '/chat');
        }

        // ✅ 50K: Add cache headers for chat to make report->chat back button instant
        const response = await resolve(event, { 
          filterSerializedResponseHeaders: (n) => n==='content-range' || n==='x-supabase-api-version'
        });
        
        if(isPrivate && user){
          response.headers.set('cache-control', 'private, max-age=0, must-revalidate');
        }
        
        return response;
};