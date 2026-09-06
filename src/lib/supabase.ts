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

// CHAT CLIENT - Use localStorage, NOT SSR cookies (fixes undefined session)
function createChatClient(): SupabaseClient {
	if (!browser) {
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
	// FIXED: Don't use createBrowserClient - it needs cookies and gives 403
	// Use createClient same as chat, with separate storage key
	return createClient(
		PUBLIC_SUPABASE_TEMPLATES_URL,
		PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
		{
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				storage: window.localStorage,
				storageKey: 'templates-auth'
			},
			// FIXED: Add realtime and global fetch options to bypass cache
			global: {
				headers: {
					'x-client-info': 'temple-ops'
				}
			}
		}
	);
}

export function getChatClient(): SupabaseClient {
	if (_chatClient) return _chatClient;
	_chatClient = createChatClient();
	
	if (browser) {
		const path = window.location.pathname || '';
		const isPublic = ['/login', '/register', '/forgot-password', '/logout'].some(p => path.includes(p));
		if (!isPublic) {
			_chatClient.auth.getSession().then(({ data }) => {
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