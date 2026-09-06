/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/routes/+layout.server.ts
 * ============================================================
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
	const { session, user } = await safeGetSession();
	
	return {
		user,
		session,
		cookies: cookies.getAll() // needed for +layout.ts SSR sync
	};
};