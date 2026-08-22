import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseServer } from '$lib/supabase/server';

export const actions = {
	login: async ({ request, cookies, fetch }) => { // <-- name is 'login'
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const { supabase } = getSupabaseServer({ cookies, fetch });

		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) return fail(400, { error: error.message });
		
		throw redirect(303, '/dashboard');
	}
};