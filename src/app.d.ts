/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/app.d.ts
 * ============================================================
 */

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			session: Session | null;
			user: User | null;
			getSession?: () => Promise<Session | null>;
		}

		interface PageData {
			session: Session | null;
			user: User | null;
		}

		interface PageState {
			[key: string]: any;
		}

		// interface Error {}
		// interface Platform {}
	}
}

export {};