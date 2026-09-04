import { browser } from "$app/environment";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

let _chatClient: SupabaseClient | null = null;

function createChatClient(): SupabaseClient {
	return createBrowserClient(
		PUBLIC_SUPABASE_CHAT_URL,
		PUBLIC_SUPABASE_CHAT_ANON_KEY
	);
}

export function getChatClient(): SupabaseClient {
	if (!browser) {
		// on server, create fresh
		return createChatClient();
	}
	if (_chatClient) {
		return _chatClient;
	}
	_chatClient = createChatClient();
	return _chatClient;
}

// simple exports - no Proxy
export const supabase = getChatClient();
export const supabaseChat = getChatClient();
export const chatDB = getChatClient();

export const supabaseTemplates = createBrowserClient(
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
);

export default supabase;