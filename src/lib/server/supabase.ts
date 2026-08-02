import { createClient } from "@supabase/supabase-js";
import {
    SUPABASE_CHAT_URL,
    SUPABASE_CHAT_SERVICE_KEY
} from "$env/static/private";


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