import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
  const session = locals.supabaseSession ?? (await locals.supabase.auth.getSession()).data.session ?? null;
  return {
    session,
    user: session?.user ?? null,
    cookies: cookies.getAll()
  };
};