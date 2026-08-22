/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/routes/(auth)/reset-password/+page.server.ts
 * ============================================================
 * PURPOSE
 *   Handles password update after reset email.
 *
 * RESPONSIBILITIES
 *   - Validate passwords
 *   - Update Supabase password
 *   - Redirect to login
 * ============================================================
 */

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// User must arrive through Supabase recovery flow.
	if (!locals.session) {
		throw redirect(302, '/login');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();

		const password = String(form.get('password') ?? '');
		const confirmPassword = String(form.get('confirmPassword') ?? '');

		if (!password) {
			return fail(400, {
				error: 'Password is required.'
			});
		}

		if (password.length < 8) {
			return fail(400, {
				error: 'Password must be at least 8 characters.'
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Passwords do not match.'
			});
		}

		const { error } = await locals.supabase.auth.updateUser({
			password
		});

		if (error) {
			return fail(400, {
				error: error.message
			});
		}

		throw redirect(303, '/login');
	}
};