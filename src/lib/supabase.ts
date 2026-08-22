import { browser } from "$app/environment";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

const authOptions = {
	auth: {
		persistSession: browser,
		autoRefreshToken: browser,
		detectSessionInUrl: browser,
	flowType: 'pkce'
	}
};

// 1. MAIN CLIENT: USE THIS FOR LOGIN + REGISTER + AUTH + RECORDS + MEETINGS + CHAT
export const supabase: SupabaseClient = createClient(
	PUBLIC_SUPABASE_CHAT_URL,  // CHAT project
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	authOptions
);

// 2. ALIAS: For old code that uses supabaseChat
export const supabaseChat: SupabaseClient = supabase;

// 3. TEMPLATES CLIENT: USE THIS ONLY FOR READING TEMPLATES - NO AUTH
export const supabaseTemplates: SupabaseClient = createClient(
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
	{ auth: { persistSession: false } }
);

export default supabase;