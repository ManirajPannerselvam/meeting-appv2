/**
 * Temple Operations Reporting System
 * File : src/lib/supabase/client.ts
 * 2 PROJECT - FAST OPEN + SECURE
 */
import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from '$env/static/public';

if (!PUBLIC_SUPABASE_CHAT_URL) throw new Error('Missing PUBLIC_SUPABASE_CHAT_URL');
if (!PUBLIC_SUPABASE_TEMPLATES_URL) throw new Error('Missing PUBLIC_SUPABASE_TEMPLATES_URL');

if (browser && PUBLIC_SUPABASE_CHAT_URL === PUBLIC_SUPABASE_TEMPLATES_URL) {
	console.warn('[Supabase] CHAT and TEMPLATES URLs SAME');
}

let chatClient: ReturnType<typeof createBrowserClient> | null = null;
let templateClient: ReturnType<typeof createBrowserClient> | null = null;

function getChatSingleton(){
  if(chatClient) return chatClient;
  chatClient = createBrowserClient(
    PUBLIC_SUPABASE_CHAT_URL,
    PUBLIC_SUPABASE_CHAT_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce'
      },
      global: { fetch: fetch }
    }
  );
  return chatClient;
}

function getTemplateSingleton(){
  if(templateClient) return templateClient;
  templateClient = createBrowserClient(
    PUBLIC_SUPABASE_TEMPLATES_URL,
    PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetch }
    }
  );
  return templateClient;
}

export const supabaseChat = getChatSingleton();
export const supabaseTemplates = getTemplateSingleton();

export const supabaseAuth = supabaseChat;
export const supabaseSettings = supabaseChat;
export const supabaseProfiles = supabaseChat;
export const supabase = supabaseChat;
export default supabase;

const CACHE_KEYS = {
  recentContacts: 'recent_contacts_cache_v2',
  settings: 'ems_settings_cache'
};

export function getRecentContactsFast(): any[] | null {
  if(!browser) return null;
  try{
    const cached = localStorage.getItem(CACHE_KEYS.recentContacts);
    if(!cached) return null;
    const parsed = JSON.parse(cached);
    if(!Array.isArray(parsed)) return null;
    if((parsed as any)._ts && Date.now() - (parsed as any)._ts > 5*60*1000) return null;
    return parsed;
  }catch{ return null; }
}

export function setRecentContactsCache(data:any[]){
  if(!browser) return;
  try{
    const safe = data.slice(0,30).map((c:any)=> ({
      id: c.id,
      actual_user_id: c.actual_user_id || c.id,
      name: String(c.name||'').slice(0,80),
      avatar_url: c.avatar_url||c.avatar||'',
      last_message_at: c.last_message_at||c.lastAt||new Date().toISOString()
    }));
    (safe as any)._ts = Date.now();
    localStorage.setItem(CACHE_KEYS.recentContacts, JSON.stringify(safe));
  }catch{}
}

export function getChatClient() {
  return getChatSingleton();
}

export function getTemplateClient() {
  return getTemplateSingleton();
}

// ✅ FIXED: no contacts table - use profiles, handle 400 gracefully
export async function preloadInBackground(){
  if(!browser) return;
  try{
    // Project 1 CHAT: profiles exists - safe
    const p1 = supabaseChat.from('profiles').select('id,name,avatar_url').limit(10).then(({data, error})=>{
      if(!error && data && data.length) setRecentContactsCache(data);
    }).catch(()=>{});

    // Project 2 TEMPLATES: safe check - ignore 404
    const p2 = supabaseTemplates.from('templates').select('id').limit(1).then(()=>{}).catch(()=>{});

    await Promise.allSettled([p1, p2]);
  }catch{}
}

export async function checkTemplatesConnection() {
  try {
    const { data, error } = await supabaseTemplates.from('templates').select('id').limit(1);
    if (error) {
      console.warn('[Templates DB] check failed:', error.message);
      return false;
    }
    return true;
  } catch { return false; }
}

if(browser){
  const idle = (window as any).requestIdleCallback || ((cb:any)=> setTimeout(cb, 800));
  idle(()=> preloadInBackground());
}