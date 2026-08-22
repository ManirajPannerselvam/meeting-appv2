import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseServer } from '$lib/supabase/server';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async (event) => {
		const { request, cookies } = event;
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const { supabase } = getSupabaseServer(event);

		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) return fail(400, { error: error.message });
		
		throw redirect(303, '/dashboard');
	}
};