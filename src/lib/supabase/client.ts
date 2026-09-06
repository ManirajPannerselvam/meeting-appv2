/**
 * Temple Operations Reporting System
 * File : src/lib/supabase/client.ts
 */
import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from '$env/static/public';

if (!PUBLIC_SUPABASE_CHAT_URL) throw new Error('Missing PUBLIC_SUPABASE_CHAT_URL');
if (!PUBLIC_SUPABASE_TEMPLATES_URL) throw new Error('Missing PUBLIC_SUPABASE_TEMPLATES_URL');

// Debug - check if both URLs are same (causes 404)
if (browser && PUBLIC_SUPABASE_CHAT_URL === PUBLIC_SUPABASE_TEMPLATES_URL) {
	console.warn('[Supabase] CHAT and TEMPLATES URLs are SAME - records table will 404 if not in chat DB');
}

export const supabaseChat = createBrowserClient(
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY
);

export const supabaseTemplates = createBrowserClient(
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
);

// aliases for your existing imports - keep same - DO NOT CHANGE
export const supabaseAuth = supabaseChat;
export const supabaseSettings = supabaseChat;
export const supabaseProfiles = supabaseChat;
export const supabase = supabaseChat; // main auth is CHAT
export default supabase;

// safe getChatClient without NO SESSION warning
export function getChatClient() {
	if (!browser) return supabaseChat;
	try {
		const path = window.location.pathname || '';
		const isPublic = ['/login', '/register', '/forgot-password', '/logout', '/(auth)'].some(p => path.includes(p));
		if (!isPublic) {
			// silent check, no warning
			supabaseChat.auth.getSession().then(() => {});
		}
	} catch {}
	return supabaseChat;
}

export function getTemplateClient() {
	return supabaseTemplates;
}

// NEW: check templates connection (call once to verify records table exists)
export async function checkTemplatesConnection() {
	try {
		const { error } = await supabaseTemplates.from('records').select('id').limit(1);
		if (error) {
			console.warn('[Templates DB] records check failed:', error.message);
			console.warn('Check: 1) PUBLIC_SUPABASE_TEMPLATES_URL in.env 2) table public.records exists in that project');
			return false;
		}
		console.log('[Templates DB] connected OK');
		return true;
	} catch (e) {
		console.warn('[Templates DB] connection error', e);
		return false;
	}
}