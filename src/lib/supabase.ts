import { createClient } from "@supabase/supabase-js";
import { browser } from "$app/environment";
import { supabaseTemplates } from "$lib/supabase";

// ================================
// CHAT PROJECT
// ================================

const chatUrl = import.meta.env.VITE_SUPABASE_CHAT_URL;
const chatKey = import.meta.env.VITE_SUPABASE_CHAT_ANON_KEY;
const chatServiceKey = !browser
    ? process.env.SUPABASE_CHAT_SERVICE_KEY
    : undefined;

// ================================
// TEMPLATE PROJECT
// ================================

const templatesUrl = import.meta.env.VITE_SUPABASE_TEMPLATES_URL;
const templatesKey = import.meta.env.VITE_SUPABASE_TEMPLATES_ANON_KEY;
const templatesServiceKey = !browser
    ? process.env.SUPABASE_TEMPLATES_SERVICE_KEY
    : undefined;

if (!chatUrl || !chatKey)
    throw new Error("Missing CHAT Supabase Keys");

if (!templatesUrl || !templatesKey)
    throw new Error("Missing TEMPLATE Supabase Keys");

// ================================
// CHAT CLIENT
// ================================

export const supabaseChat = createClient(chatUrl, chatKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "sb-chat-auth-token"
    }
});

// ================================
// TEMPLATE CLIENT
// ================================

export const supabaseTemplates = createClient(
    templatesUrl,
    templatesKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: "sb-template-auth-token"
        }
    }
);
if (browser) {
    (window as any).supabaseTemplates = supabaseTemplates;
}
// ================================
// ADMIN CLIENTS
// ================================

export const supabaseChatAdmin = chatServiceKey
    ? createClient(chatUrl, chatServiceKey, {
          auth: { persistSession: false }
      })
    : null;

export const supabaseTemplatesAdmin = templatesServiceKey
    ? createClient(templatesUrl, templatesServiceKey, {
          auth: { persistSession: false }
      })
    : null;