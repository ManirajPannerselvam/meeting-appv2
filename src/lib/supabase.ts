import { browser } from "$app/environment";
import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

let _chatClient: SupabaseClient | null = null;
let _templateClient: SupabaseClient | null = null;

// CHAT CLIENT - Use localStorage, NOT SSR cookies (fixes undefined session)
function createChatClient(): SupabaseClient {
	if (!browser) {
		// Server side - no session needed, create dummy
		return createClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY);
	}
	return createClient(
		PUBLIC_SUPABASE_CHAT_URL,
		PUBLIC_SUPABASE_CHAT_ANON_KEY,
		{
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				storage: window.localStorage,
				storageKey: 'chat-auth'
			}
		}
	);
}

function createTemplateClient(): SupabaseClient {
	if (!browser) {
		return createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY);
	}
	return createBrowserClient(
		PUBLIC_SUPABASE_TEMPLATES_URL,
		PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
	);
}

export function getChatClient(): SupabaseClient {
	if (_chatClient) return _chatClient;
	_chatClient = createChatClient();
	
	// FIXED: silent check, no warning on /login X click
	if (browser) {
		const path = window.location.pathname || '';
		const isPublic = ['/login', '/register', '/forgot-password', '/logout'].some(p => path.includes(p));
		if (!isPublic) {
			_chatClient.auth.getSession().then(({ data }) => {
				// only log when session exists, no warn when not
				if (data.session) {
					console.log("CHAT CLIENT SESSION:", data.session.user.id);
				}
			});
		}
	}
	
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