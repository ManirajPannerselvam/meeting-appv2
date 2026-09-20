import { browser } from "$app/environment";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PUBLIC_SUPABASE_CHAT_URL,
  PUBLIC_SUPABASE_CHAT_ANON_KEY,
  PUBLIC_SUPABASE_TEMPLATES_URL,
  PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

const g = globalThis as any;
g.__temple_clients__ = g.__temple_clients__ || { chat: null, tmpl: null };

const safeStorage = browser ? {
  getItem: (key: string) => {
    try {
      if (!key.startsWith('chat-auth-') && key !== 'chat-auth-v3') return null;
      const v = localStorage.getItem(key);
      if (v && v.length > 200000) { localStorage.removeItem(key); return null; }
      return v;
    } catch { return null; }
  },
  setItem: (key: string, value: string) => {
    try {
      if (!key.startsWith('chat-auth-') && key !== 'chat-auth-v3') return;
      if (value.length > 200000) return;
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string) => { try { localStorage.removeItem(key); } catch {} }
} : undefined;

function createChatClient(): SupabaseClient {
  if (g.__temple_clients__.chat) return g.__temple_clients__.chat;
  g.__temple_clients__.chat = createClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: safeStorage as any,
      storageKey: 'chat-auth-v3',
      flowType: 'pkce'
    },
    realtime: { params: { eventsPerSecond: 2 } }
  });
  return g.__temple_clients__.chat;
}

function createTemplateClient(): SupabaseClient {
  if (g.__temple_clients__.tmpl) return g.__temple_clients__.tmpl;
  g.__temple_clients__.tmpl = createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return g.__temple_clients__.tmpl;
}

export function getChatClient() { return g.__temple_clients__.chat || createChatClient(); }
export function getTemplateClient() { return g.__temple_clients__.tmpl || createTemplateClient(); }

export const supabaseChat = getChatClient();
export const supabase = getChatClient();
export const chatDB = getChatClient();
export const supabaseTemplates = getTemplateClient();
export default supabase;

export function getMeetingsQueryBuilder() {
  return getTemplateClient().from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by,participants,attendees');
}