import { browser } from "$app/environment";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PUBLIC_SUPABASE_CHAT_URL,
  PUBLIC_SUPABASE_CHAT_ANON_KEY,
  PUBLIC_SUPABASE_TEMPLATES_URL,
  PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

// 50K + SECURE: globalThis singleton survives HMR
const g = globalThis as any;
g.__temple_clients__ = g.__temple_clients__ || { chat: null, tmpl: null };

function sanitizeStr(s: any, max = 80) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>`$&"'=]/g, '').trim().slice(0, max);
}

// 0 LEAKAGE: only allow our keys, block others, block huge payload
const safeStorage = browser ? {
  getItem: (key: string) => {
    try {
      if (!key.startsWith('chat-auth-') && !key.startsWith('ems_')) return null;
      const v = window.localStorage.getItem(key);
      if (!v) return null;
      if (v.length > 200000) { try { window.localStorage.removeItem(key); } catch {} return null; }
      return v;
    } catch { return null; }
  },
  setItem: (key: string, value: string) => {
    try {
      if (!key.startsWith('chat-auth-') && !key.startsWith('ems_')) return;
      if (value.length > 200000) return;
      window.localStorage.setItem(key, value);
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError') {
        try {
          ['ems_chat_auth_v10','chat-auth-v2'].forEach(k => { try{ localStorage.removeItem(k);}catch{} });
        } catch {}
      }
    }
  },
  removeItem: (key: string) => {
    try { window.localStorage.removeItem(key); } catch {}
  }
} : undefined;

function createSecureFetch(timeoutMs = 12000) {
  return (url: any, opts: any) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...opts, signal: controller.signal, cache: 'no-store' } as any)
      .finally(() => clearTimeout(t)) as any;
  };
}

function createChatClient(): SupabaseClient {
  if (!browser) {
    return createClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: undefined as any },
      global: { fetch: createSecureFetch(8000) },
      db: { schema: 'public' }
    });
  }
  if (g.__temple_clients__.chat) return g.__temple_clients__.chat as SupabaseClient;

  g.__temple_clients__.chat = createClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: safeStorage as any,
      storageKey: 'chat-auth-v3',
      flowType: 'pkce'
    },
    global: {
      fetch: createSecureFetch(12000),
      headers: { 'x-client-info': 'chat-v3' }
    },
    realtime: {
      params: { eventsPerSecond: 2 },
      heartbeatIntervalMs: 30000,
      timeout: 15000
    },
    db: { schema: 'public' }
  });
  return g.__temple_clients__.chat as SupabaseClient;
}

function createTemplateClient(): SupabaseClient {
  if (!browser) {
    return createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { transport: undefined as any },
      global: { fetch: createSecureFetch(8000) },
      db: { schema: 'public' }
    });
  }
  if (g.__temple_clients__.tmpl) return g.__temple_clients__.tmpl as SupabaseClient;

  g.__temple_clients__.tmpl = createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: createSecureFetch(10000),
      headers: { 'x-client-info': 'tmpl-v3' }
    },
    realtime: { transport: undefined as any }
  });
  return g.__temple_clients__.tmpl as SupabaseClient;
}

// NEVER NULL - FIXES ALL "possibly null"
export function getChatClient(): SupabaseClient {
  return g.__temple_clients__.chat || createChatClient();
}

export function getTemplateClient(): SupabaseClient {
  return g.__temple_clients__.tmpl || createTemplateClient();
}

// NON-NULL EXPORTS - NO PROXY (Proxy breaks TS + RLS)
export const supabaseChat: SupabaseClient = getChatClient();
export const supabase: SupabaseClient = getChatClient();
export const chatDB: SupabaseClient = getChatClient();
export const supabaseTemplates: SupabaseClient = getTemplateClient();
export default supabase;

export function getMeetingsQueryBuilder() {
  const client = getTemplateClient();
  return client.from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by,participants,attendees');
}

// 50K cache - only id + name, no email leakage
const CACHE_KEY = 'recent_contacts_v3_secure';
export function getRecentContactsFast() {
  if (!browser) return null;
  try {
    const r = localStorage.getItem(CACHE_KEY);
    if (!r) return null;
    const p = JSON.parse(r);
    if (Date.now() - p._ts > 180000) return null;
    const myEmail = (localStorage.getItem('ems_user_email') || '').toLowerCase();
    if (p._uid && myEmail && p._uid !== myEmail) return null;
    return Array.isArray(p.data) ? p.data.slice(0, 20) : null;
  } catch { return null; }
}
export function setRecentContactsCache(d: any[]) {
  try {
    if (!browser || !d?.length) return;
    const myEmail = (localStorage.getItem('ems_user_email') || '').toLowerCase().slice(0, 100);
    const s = d.slice(0, 20).map((c: any) => ({
      id: sanitizeStr(String(c.id), 80),
      name: sanitizeStr(String(c.name || ''), 60)
    })).filter((x: any) => x.id);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ _ts: Date.now(), _uid: myEmail, data: s }));
  } catch {}
}
export async function preloadInBackground() {}
export async function checkTemplatesConnection() {
  try {
    const t = getTemplateClient();
    const { error } = await t.from('meetings').select('id', { head: true, count: 'exact' }).limit(1);
    return !error;
  } catch { return false; }
}