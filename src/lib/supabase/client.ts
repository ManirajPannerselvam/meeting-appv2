/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/client.ts
 * ============================================================
 * PURPOSE
 *   Shared Supabase clients.
 *
 * DATABASES
 *   1. Chat Database - Auth + profiles + settings + avatars
 *   2. Template Database (Default) - templates only
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
// CHAT DATABASE - AUTH SOURCE
// =====================================================

export const supabaseChat = createClient(
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	{
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true,
			storageKey: 'temple-chat-auth'
		},
		realtime: {
			params: { eventsPerSecond: 10 }
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
			detectSessionInUrl: true,
			storageKey: 'temple-templates-auth'
		},
		realtime: {
			params: { eventsPerSecond: 10 }
		}
	}
);

// =====================================================
// FIX: AUTH IS IN CHAT DB - USE IT FOR SETTINGS/PROFILES
// =====================================================
// settings, profiles, user_profiles, avatars MUST be in Chat DB
// templates table only in Templates DB

export const supabaseAuth = supabaseChat;
export const supabaseSettings = supabaseChat;
export const supabaseProfiles = supabaseChat;

// =====================================================
// DEFAULT CLIENT - KEEP SAME FOR BACKWARD COMPATIBILITY
// =====================================================

export const supabase = supabaseTemplates;

export default supabase;