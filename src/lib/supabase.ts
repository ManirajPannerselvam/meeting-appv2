import { createClient } from "@supabase/supabase-js";
import { browser } from "$app/environment";


// =====================================================
// CHAT DATABASE
// =====================================================

const chatUrl =
    import.meta.env.VITE_SUPABASE_CHAT_URL;

const chatAnonKey =
    import.meta.env.VITE_SUPABASE_CHAT_ANON_KEY;


// =====================================================
// TEMPLATE DATABASE
// =====================================================

const templatesUrl =
    import.meta.env.VITE_SUPABASE_TEMPLATES_URL;

const templatesAnonKey =
    import.meta.env.VITE_SUPABASE_TEMPLATES_ANON_KEY;



// =====================================================
// VALIDATION
// =====================================================

if (!chatUrl) {

    console.error(
        "Missing VITE_SUPABASE_CHAT_URL"
    );

}


if (!chatAnonKey) {

    console.error(
        "Missing VITE_SUPABASE_CHAT_ANON_KEY"
    );

}



// =====================================================
// CHAT CLIENT
// =====================================================


export const supabaseChat =
    chatUrl && chatAnonKey
    ?
    createClient(
        chatUrl,
        chatAnonKey,
        {
            auth:{
                persistSession: browser,
                autoRefreshToken: browser
            }
        }
    )
    :
    null;



// =====================================================
// TEMPLATE CLIENT
// =====================================================


export const supabaseTemplates =
    templatesUrl && templatesAnonKey
    ?
    createClient(
        templatesUrl,
        templatesAnonKey,
        {
            auth:{
                persistSession: browser,
                autoRefreshToken: browser
            }
        }
    )
    :
    null;



// Default
export const supabase =
    supabaseTemplates;