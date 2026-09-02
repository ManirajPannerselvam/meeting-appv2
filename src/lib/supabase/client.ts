/**
 * Temple Operations Reporting System
 * File : src/lib/supabase/client.ts
 */
import { createBrowserClient } from '@supabase/ssr';
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from '$env/static/public';

if (!PUBLIC_SUPABASE_CHAT_URL) throw new Error('Missing PUBLIC_SUPABASE_CHAT_URL');
if (!PUBLIC_SUPABASE_TEMPLATES_URL) throw new Error('Missing PUBLIC_SUPABASE_TEMPLATES_URL');

export const supabaseChat = createBrowserClient(
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY
);

export const supabaseTemplates = createBrowserClient(
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
);

export const supabaseAuth = supabaseChat;
export const supabaseSettings = supabaseChat;
export const supabaseProfiles = supabaseChat;
export const supabase = supabaseTemplates;
export default supabase;