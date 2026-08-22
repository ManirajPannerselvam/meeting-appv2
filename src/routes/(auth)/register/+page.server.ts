import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseServer } from '$lib/supabase/server';

export const actions = {
	register: async ({ request, cookies, fetch }) => { // <-- name is 'register' to match ?/register
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const phone = formData.get('phone') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		const { supabase } = getSupabaseServer({ cookies, fetch });

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