import { redirect, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// INSTANT - No await on signOut
export const GET: RequestHandler = async ({ cookies }) => {
  // Clear cookies instantly - 1ms
  cookies.getAll().forEach(c => {
    if (c.name.startsWith('sb-')) {
      cookies.delete(c.name, { path: '/' });
    }
  });
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });

  // DO NOT await supabase signOut - let it happen background
  // locals.supabase?.auth.signOut().catch(()=>{});

  throw redirect(303, '/login');
};

export const POST: RequestHandler = async ({ cookies }) => {
  cookies.getAll().forEach(c => {
    if (c.name.startsWith('sb-')) {
      cookies.delete(c.name, { path: '/' });
    }
  });
  return json({ ok: true });
};