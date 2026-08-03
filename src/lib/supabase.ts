import { createClient } from "@supabase/supabase-js";
import { browser } from "$app/environment";

// =====================================================
// CHAT DATABASE
// =====================================================

const chatUrl = import.meta.env.VITE_SUPABASE_CHAT_URL;
const chatAnonKey = import.meta.env.VITE_SUPABASE_CHAT_ANON_KEY;

// =====================================================
// TEMPLATE DATABASE
// =====================================================

const templatesUrl = import.meta.env.VITE_SUPABASE_TEMPLATES_URL;
const templatesAnonKey = import.meta.env.VITE_SUPABASE_TEMPLATES_ANON_KEY;

// =====================================================
// VALIDATION
// =====================================================

if (!chatUrl || !chatAnonKey) {
    throw new Error("Missing Chat Supabase environment variables");
}

if (!templatesUrl || !templatesAnonKey) {
    throw new Error("Missing Template Supabase environment variables");
}

// =====================================================
// CHAT CLIENT
// =====================================================

export const supabaseChat = createClient(
    chatUrl,
    chatAnonKey,
    {
        auth: {
            persistSession: browser,
            autoRefreshToken: browser
        }
    }
);

// =====================================================
// TEMPLATE CLIENT
// =====================================================

export const supabaseTemplates = createClient(
    templatesUrl,
    templatesAnonKey,
    {
        auth: {
            persistSession: browser,
            autoRefreshToken: browser
        }
    }
);

// Default client (Templates DB)
export const supabase = supabaseTemplates;