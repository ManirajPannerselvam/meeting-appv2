/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/app.d.ts
 * ============================================================
 * PURPOSE
 *   Global SvelteKit type declarations.
 * ============================================================
 */

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
	interface Locals {
			supabase: SupabaseClient;
			session: Session | null; // Real Supabase session
			user: User | null;       // Real Supabase user
		}

	interface PageData {
			session: Session | null;
			user: User | null;
	}

	// Optional: for page load data typing
	interface PageState {
			[key: string]: any;
	}
	}
}

export {};