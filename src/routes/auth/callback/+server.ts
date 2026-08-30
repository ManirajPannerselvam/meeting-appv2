 
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ url, locals: { supabase } }: RequestEvent) {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user?.email) {
      await supabase.from('contact_invites')
        .update({
          invited_user: data.user.id,
          status: 'accepted'
        })
        .eq('email', data.user.email.toLowerCase())
        .is('invited_user', null);
    }
  }

  throw redirect(303, next);
}