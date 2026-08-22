/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/client.ts
 * ============================================================
 * PURPOSE
 *   Shared Supabase clients.
 *
 * DATABASES
 *   1. Chat Database
 *   2. Template Database (Default)
 * ============================================================
 */

import { createClient } from "@supabase/supabase-js";

import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

// =====================================================
// VALIDATION
// =====================================================

if (!PUBLIC_SUPABASE_CHAT_URL) {
	throw new Error("Missing PUBLIC_SUPABASE_CHAT_URL");
}

if (!PUBLIC_SUPABASE_CHAT_ANON_KEY) {
	throw new Error("Missing PUBLIC_SUPABASE_CHAT_ANON_KEY");
}

if (!PUBLIC_SUPABASE_TEMPLATES_URL) {
	throw new Error("Missing PUBLIC_SUPABASE_TEMPLATES_URL");
}

if (!PUBLIC_SUPABASE_TEMPLATES_ANON_KEY) {
	throw new Error("Missing PUBLIC_SUPABASE_TEMPLATES_ANON_KEY");
}

// =====================================================
// CHAT DATABASE
// =====================================================

export const supabaseChat = createClient(
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	{
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true
		},
		realtime: {
			params: {
				eventsPerSecond: 10
			}
		}
	}
);

// =====================================================
// TEMPLATE DATABASE
// =====================================================

export const supabaseTemplates = createClient(
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
	{
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true
		},
		realtime: {
			params: {
				eventsPerSecond: 10
			}
		}
	}
);

// =====================================================
// DEFAULT CLIENT
// =====================================================

export const supabase = supabaseTemplates;

export default supabase;