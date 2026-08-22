/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/routes/(auth)/forgot-password/+page.server.ts
 * ============================================================
 * PURPOSE
 *   Sends a password reset email.
 *
 * RESPONSIBILITIES
 *   - Validate email
 *   - Request password reset
 *   - Return validation errors
 *   - Display success message
 * ============================================================
 */

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();

		const email = String(form.get('email') ?? '').trim();

		if (!email) {
			return fail(400, {
				error: 'Email is required.',
				email
			});
		}

		const { error } = await locals.supabase.auth.resetPasswordForEmail(
			email,
			{
				redirectTo: `${url.origin}/reset-password`
			}
		);

		if (error) {
			return fail(400, {
				error: error.message,
				email
			});
		}

		return {
			success: true,
			message:
				'If an account exists for this email, a password reset link has been sent.'
		};
	}
};