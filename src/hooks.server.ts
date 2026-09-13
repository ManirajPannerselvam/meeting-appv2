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
                                    // ✅ SECURE HIGH PRIORITY - dynamic for Tauri dev + Vercel prod
                                    httpOnly: true,
                                    secure: isSecure,
                                    sameSite: 'lax' as const,
                                    maxAge: options?.maxAge ?? 60*60*24*30
                                  }))
                        }
                }
        );

        // ✅ SPEED: Skip auth for static + internal - instant open
        const path = event.url.pathname;
        if (path.startsWith('/_app/') || path.startsWith('/api/health') || /\.(png|jpg|jpeg|svg|ico|css|js|woff2?|webp)$/.test(path)) {
            return resolve(event);
        }

        // ✅ SPEED + SECURE: single auth call
        let session = null;
        let user = null;
        try{
          const { data: { session: s } } = await event.locals.supabase.auth.getSession();
          session = s;
          if(s){
            const { data: { user: u }, error } = await event.locals.supabase.auth.getUser();
            if(!error && u){ user = u; }
            else { session = null; }
          }
        }catch{
          session = null;
          user = null;
        }

        event.locals.session = session;
        event.locals.user = user;

        // ✅ Keep your safeGetSession for +layout.server.ts
        event.locals.safeGetSession = async () => {
                if(session && user) return { session, user };
                try{
                  const { data: { session: s } } = await event.locals.supabase.auth.getSession();
                  if (!s) return { session: null, user: null };
                  const { data: { user: u }, error } = await event.locals.supabase.auth.getUser();
                  if (error || !u) return { session: null, user: null };
                  return { session: s, user: u };
                }catch{
                  return { session: null, user: null };
                }
        };

        const isPublic = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/')) || path === '/' || path.startsWith('/_app');
        
        const isPrivate = ['/dashboard', '/d/', '/chat', '/c/', '/reports', '/r/', '/settings', '/meetings', '/logout'].some(p => {
                if (p.endsWith('/')) return path.startsWith(p) || path === p.slice(0,-1);
                return path === p || path.startsWith(p + '/');
        });

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

        return resolve(event, { filterSerializedResponseHeaders: (n) => n==='content-range' || n==='x-supabase-api-version' });
};