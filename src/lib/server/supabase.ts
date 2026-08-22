import { createClient } from "@supabase/supabase-js";
import { PUBLIC_SUPABASE_CHAT_URL } from "$env/static/public";
import { env } from "$env/dynamic/private";

const SUPABASE_CHAT_URL = PUBLIC_SUPABASE_CHAT_URL;
const SUPABASE_CHAT_SERVICE_KEY = env.SUPABASE_CHAT_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_TEMPLATES_SERVICE_KEY;

if (!SUPABASE_CHAT_URL) {
    throw new Error('Missing PUBLIC_SUPABASE_CHAT_URL');
}
if (!SUPABASE_CHAT_SERVICE_KEY) {
    console.warn('Missing SUPABASE_CHAT_SERVICE_KEY, build may fail');
}

export const supabaseChatServer =
    createClient(
        SUPABASE_CHAT_URL,
        SUPABASE_CHAT_SERVICE_KEY,
        {
            auth:{
                persistSession:false,
                autoRefreshToken:false
            }
        }
    );