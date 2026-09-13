import { browser } from "$app/environment";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

let _chatClient: SupabaseClient | null = null;
let _templateClient: SupabaseClient | null = null;

function createChatClient(): SupabaseClient {
	if (!browser) {
		// ✅ FIX: Server build - disable realtime to prevent WebSocket crash
		return createClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
			realtime: { transport: undefined as any },
			global: { fetch }
		});
	}
	return createClient(
		PUBLIC_SUPABASE_CHAT_URL,
		PUBLIC_SUPABASE_CHAT_ANON_KEY,
		{
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
				storage: window.localStorage,
				storageKey: 'chat-auth'
			},
			realtime: {
				params: { eventsPerSecond: 10 }
			}
		}
	);
}

function createTemplateClient(): SupabaseClient {
	if (!browser) {
		return createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false },
			realtime: { transport: undefined as any },
			global: { fetch }
		});
	}
	return createClient(
		PUBLIC_SUPABASE_TEMPLATES_URL,
		PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
		{
			auth: {
				// ✅ SECURE: Templates DB is public anon - no need to persist auth
				persistSession: false,
				autoRefreshToken: false
			},
			global: {
				fetch,
				headers: { 'x-client-info': 'temple-ops' }
			}
		}
	);
}

export function getChatClient(): SupabaseClient {
	if (_chatClient) return _chatClient;
	_chatClient = createChatClient();
	return _chatClient;
}

export function getTemplateClient(): SupabaseClient {
	if (_templateClient) return _templateClient;
	_templateClient = createTemplateClient();
	return _templateClient;
}

// KEEP SAME EXPORTS - NO BREAKING CHANGE
export const supabase = getChatClient();
export const supabaseChat = getChatClient();
export const chatDB = getChatClient();
export const supabaseTemplates = getTemplateClient();
export default supabase;