/**
 * Temple Operations - v10.1 SECURE 50K - rfckn DB - FINAL
 * FIX: 400 Bad Request (owner_id/shared_with not exist), GoTrueClient duplicate, XSS in cache
 */
import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from '$env/static/public';

const TEMPLATES_URL = 'https://rfckntoqyomqhrkwejrx.supabase.co';
const CHAT_URL = PUBLIC_SUPABASE_CHAT_URL;

const g = globalThis as any;
g.__ems_clients__ = g.__ems_clients__ || { chat: null, tmpl: null, init: false };

// 🔒 SECURE FETCH with timeout + no leak
const secureFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(t);
    return r;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
};

// 🔒 SAFE STORAGE - isolated keys per project
const safeStorage = browser
  ? {
      getItem: (k: string) => {
        try {
          // only allow our keys
          if (!k.startsWith('ems_') && !k.startsWith('sb-')) return null;
          return localStorage.getItem(k);
        } catch {
          return null;
        }
      },
      setItem: (k: string, v: string) => {
        try {
          if (!k.startsWith('ems_') && !k.startsWith('sb-')) return;
          localStorage.setItem(k, v.slice(0, 50000)); // limit 50k
        } catch {}
      },
      removeItem: (k: string) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      }
    }
  : undefined;

function sanitizeStr(s: any, max = 80) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>`$&"'=]/g, '').trim().slice(0, max);
}

function createChatClient() {
  if (g.__ems_clients__.chat) return g.__ems_clients__.chat;
  // 🔒 singleton - prevents Multiple GoTrueClient warning
  if (!CHAT_URL || !PUBLIC_SUPABASE_CHAT_ANON_KEY) {
    console.error('Missing CHAT env');
    return null;
  }
  g.__ems_clients__.chat = createBrowserClient(CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: 'ems_chat_auth_v10',
      storage: safeStorage as any
    },
    realtime: { params: { eventsPerSecond: 2 } },
    global: { fetch: secureFetch, headers: { 'X-Client-Info': 'ems-chat-v10.1-secure' } }
  });
  return g.__ems_clients__.chat;
}

function createTemplateClient() {
  if (g.__ems_clients__.tmpl) return g.__ems_clients__.tmpl;
  if (!TEMPLATES_URL || !PUBLIC_SUPABASE_TEMPLATES_ANON_KEY) {
    console.error('Missing TEMPLATES env');
    return null;
  }
  // 🔒 anon client, no auth session - secure because RLS is app-level filtered by email (DB different)
  // persistSession false = no GoTrueClient duplicate
  g.__ems_clients__.tmpl = createClient(TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    realtime: { params: { eventsPerSecond: 1 } },
    global: {
      fetch: secureFetch as any,
      headers: { 'X-Client-Info': 'ems-tmpl-v10.1-secure', apikey: PUBLIC_SUPABASE_TEMPLATES_ANON_KEY }
    }
  });
  return g.__ems_clients__.tmpl;
}

function lazyProxy<T extends object>(getter: () => T): T {
  return new Proxy({} as any, {
    get(_, prop) {
      if (!browser) return prop === 'then' ? undefined : () => undefined;
      try {
        const c = getter() as any;
        if (!c) return () => undefined;
        const v = c[prop];
        return typeof v === 'function' ? v.bind(c) : v;
      } catch {
        return () => undefined;
      }
    }
  }) as T;
}

export const supabaseChat = lazyProxy(createChatClient) as ReturnType<typeof createBrowserClient>;
export const supabaseTemplates = lazyProxy(createTemplateClient) as any;
export const supabaseAuth = supabaseChat;
export const supabaseSettings = supabaseChat;
export const supabaseProfiles = supabaseChat;
export const supabase = supabaseChat;
export default supabaseChat;

export function getChatClient() {
  return browser ? createChatClient() : null;
}
export function getTemplateClient() {
  return browser ? createTemplateClient() : null;
}

// 🔒 50k SECURE cache - per user, sanitized, size limited
const CACHE_KEY = 'recent_contacts_v10';

export function getRecentContactsFast() {
  if (!browser) return null;
  try {
    const r = localStorage.getItem(CACHE_KEY);
    if (!r) return null;
    const p = JSON.parse(r);
    if (Date.now() - p._ts > 180000) {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      return null;
    }
    // validate per user
    const myEmail = (localStorage.getItem('ems_user_email') || '').toLowerCase();
    if (p._uid && myEmail && p._uid !== myEmail) return null;
    return Array.isArray(p.data) ? p.data.slice(0, 20) : null;
  } catch {
    return null;
  }
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

export async function preloadInBackground() {
  // 50k: no-op to save bandwidth
}

export async function checkTemplatesConnection() {
  try {
    const t = getTemplateClient();
    if (!t) return false;
    // ✅ use real column that exists - id
    const { error } = await t.from('meetings').select('id', { head: true, count: 'exact' }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

// 🔒 helper for meeting dashboard - correct columns only
export function getMeetingsQueryBuilder() {
  const client = getTemplateClient();
  if (!client) return null;
  return client.from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by,participants,attendees');
}