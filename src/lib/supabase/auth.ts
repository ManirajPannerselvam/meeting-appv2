/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/auth.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Centralized authentication helper functions.
 *
 * DESCRIPTION
 *   - Email OTP Sign In
 *   - Verify Session
 *   - Get Current User
 *   - Get Current Session
 *   - Refresh Session
 *   - Sign Out
 *
 * DEPENDS ON
 *   src/lib/supabase/client.ts
 *
 * USED BY
 *   Login
 *   Dashboard
 *   Reports
 *   Chat
 *   Meetings
 * ============================================================
 */

import { supabase } from './client';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Send Email OTP
 */
export async function signInWithOtp(email: string) {
	return await supabase.auth.signInWithOtp({
		email
	});
}

/**
 * Get Current Session
 */
export async function getSession(): Promise<Session | null> {
	const { data } = await supabase.auth.getSession();
	return data.session;
}

/**
 * Get Current User
 */
export async function getUser(): Promise<User | null> {
	const { data } = await supabase.auth.getUser();
	return data.user;
}

/**
 * Refresh Authentication Session
 */
export async function refreshSession() {
	return await supabase.auth.refreshSession();
}

/**
 * Sign Out
 */
export async function signOut() {
	return await supabase.auth.signOut();
}

/**
 * Check Authentication Status
 */
export async function isAuthenticated(): Promise<boolean> {
	const session = await getSession();
	return session !== null;
}