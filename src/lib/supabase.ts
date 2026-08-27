import { browser } from "$app/environment";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

let _supabase: SupabaseClient | null = null;
export const supabase: SupabaseClient = (() => {
	if(!_supabase){
		_supabase = createClient(
			PUBLIC_SUPABASE_CHAT_URL,
			PUBLIC_SUPABASE_CHAT_ANON_KEY,
			{ auth: { persistSession: browser, autoRefreshToken: browser, detectSessionInUrl: browser, flowType: 'pkce' as const, storageKey: 'sb-chat-auth' } }
		);
	}
	return _supabase;
})();
export const supabaseChat: SupabaseClient = supabase;
export const supabaseTemplates: SupabaseClient = createClient(
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
	{ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-templates-noauth' } }
);
export default supabase;