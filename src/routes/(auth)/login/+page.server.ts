import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) return fail(400, { error: 'Email and password required' });

		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { error: error.message });

		const next = url.searchParams.get('next') || '/dashboard';
		throw redirect(303, next);
	}
};