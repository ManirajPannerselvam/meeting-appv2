import { browser } from "$app/environment";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// ✅ FIX: Support both PUBLIC_ and VITE_ + fail-safe for.env missing
const CHAT_URL = (import.meta.env.PUBLIC_SUPABASE_CHAT_URL as string) || (import.meta.env.VITE_SUPABASE_CHAT_URL as string) || '';
const CHAT_KEY = (import.meta.env.PUBLIC_SUPABASE_CHAT_ANON_KEY as string) || (import.meta.env.VITE_SUPABASE_CHAT_ANON_KEY as string) || '';
const TMPL_URL = (import.meta.env.PUBLIC_SUPABASE_TEMPLATES_URL as string) || (import.meta.env.VITE_SUPABASE_TEMPLATES_URL as string) || '';
const TMPL_KEY = (import.meta.env.PUBLIC_SUPABASE_TEMPLATES_ANON_KEY as string) || (import.meta.env.VITE_SUPABASE_TEMPLATES_ANON_KEY as string) || '';

// Global singleton - survives HMR
const g = globalThis as unknown as {
  __temple_clients__?: { chat: SupabaseClient | null, tmpl: SupabaseClient | null }
};
g.__temple_clients__ = g.__temple_clients__ || { chat: null, tmpl: null };

// ✅ FIX: safeStorage was blocking your own key
const safeStorage = browser? {
  getItem: (key: string) => {
    try {
      // Only allow our specific key
      if (key!== 'chat-auth-v3' &&!key.startsWith('chat-auth-v3.')) return null;
      const v = localStorage.getItem(key);
      if (v && v.length > 200000) {
        console.warn('[Supabase] Cleaning large storage item', key);
        localStorage.removeItem(key);
        return null;
      }
      return v;
    } catch { return null; }
  },
  setItem: (key: string, value: string) => {
    try {
      if (key!== 'chat-auth-v3' &&!key.startsWith('chat-auth-v3.')) return;
      if (value.length > 200000) return;
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string) => { try { localStorage.removeItem(key); } catch {} }
} : undefined;

function createChatClient(): SupabaseClient {
  if (g.__temple_clients__!.chat) return g.__temple_clients__!.chat;

  if (!CHAT_URL ||!CHAT_KEY) {
    console.error('[Supabase] Missing PUBLIC_SUPABASE_CHAT_URL / KEY in.env');
    // Return dummy client to prevent crash, init.ts will handle offline
    throw new Error('Missing CHAT Supabase env');
  }

  console.info('[Supabase] Creating CHAT client');
  g.__temple_clients__!.chat = createClient(CHAT_URL, CHAT_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: browser,
      storage: safeStorage as any,
      storageKey: 'chat-auth-v3',
      flowType: 'pkce'
    },
    realtime: { params: { eventsPerSecond: 2 } }
  });
  return g.__temple_clients__!.chat;
}

function createTemplateClient(): SupabaseClient {
  if (g.__temple_clients__!.tmpl) return g.__temple_clients__!.tmpl;

  if (!TMPL_URL ||!TMPL_KEY) {
    console.warn('[Supabase] Missing TEMPLATES env, using CHAT client as fallback');
    return getChatClient();
  }

  g.__temple_clients__!.tmpl = createClient(TMPL_URL, TMPL_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'tmpl-auth-v1'
    }
  });
  return g.__temple_clients__!.tmpl;
}

// ✅ FIX: LAZY getters - don't create at import time!
export function getChatClient(): SupabaseClient {
  return g.__temple_clients__!.chat || createChatClient();
}

export function getTemplateClient(): SupabaseClient {
  return g.__temple_clients__!.tmpl || createTemplateClient();
}

// ✅ FIX: Use getters, not direct instances - prevents Multiple GoTrueClient
export const getSupabase = getChatClient;
export const getChatDB = getChatClient;

// For backwards compat - but now lazy
export const supabaseChat = { get: getChatClient } as any;
export const supabaseTemplates = { get: getTemplateClient } as any;

// Default export as function wrapper
const supabaseProxy = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getChatClient();
    const value = (client as any)[prop];
    return typeof value === 'function'? value.bind(client) : value;
  }
});

export default supabaseProxy;
export const supabase = supabaseProxy;
export const chatDB = supabaseProxy;

export function getMeetingsQueryBuilder() {
  return getTemplateClient().from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by,participants,attendees');
}