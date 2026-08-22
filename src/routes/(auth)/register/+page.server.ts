import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseServer } from '$lib/supabase/server';
import type { Actions } from './$types';

export const actions: Actions = {
	register: async (event) => {
		const { request } = event;
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const phone = formData.get('phone') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const { supabase } = getSupabaseServer(event);

		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { name, phone }
			}
		});

		if (error) {
			console.log('REGISTER ERROR:', error.message);
			return fail(400, { error: error.message });
		}

		console.log('REGISTER SUCCESS:', email);
		throw redirect(303, '/dashboard');
	}
};