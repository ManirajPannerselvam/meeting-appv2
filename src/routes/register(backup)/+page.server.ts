import { fail, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export const actions = {
	register: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;
		const password = formData.get('password') as string;

		if (!name || !email || !password) {
			return fail(400, { error: 'Fill all required fields' });
	}

		if(password.length < 6){
			return fail(400, { error: 'Password must be at least 6 characters' });
	}

		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { name, phone } // trigger reads this
			}
	});

		if (error) {
			return fail(400, { error: error.message });
	}
		
		throw redirect(303, '/signin?message=Check your email to confirm');
	}
};