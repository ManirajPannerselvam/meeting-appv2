/**
 * Temple Operations Reporting System
 * File : src/lib/supabase/client.ts
 * 2 PROJECT - FAST OPEN + SECURE - FIXED
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

let chatClient: ReturnType<typeof createBrowserClient> | null = null;
let templateClient: ReturnType<typeof createBrowserClient> | null = null;

function getChatSingleton(){
  if(chatClient) return chatClient;
  if(!browser){
    // ✅ SECURE: don't create browser client on server
    return null as any;
  }
  chatClient = createBrowserClient(
    PUBLIC_SUPABASE_CHAT_URL,
    PUBLIC_SUPABASE_CHAT_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storageKey: 'ems_chat_auth'
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      },
      global: { fetch: fetch }
    }
  );
  return chatClient;
}

function getTemplateSingleton(){
  if(templateClient) return templateClient;
  if(!browser) return null as any;
  templateClient = createBrowserClient(
    PUBLIC_SUPABASE_TEMPLATES_URL,
    PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 2 } },
      global: { fetch: fetch }
    }
  );
  return templateClient;
}

// ✅ SPEED: lazy getters - not created on SSR
export const supabaseChat = browser ? getChatSingleton() : null as any;
export const supabaseTemplates = browser ? getTemplateSingleton() : null as any;

export const supabaseAuth = supabaseChat;
export const supabaseSettings = supabaseChat;
export const supabaseProfiles = supabaseChat;
export const supabase = supabaseChat;
export default supabaseChat;

const CACHE_KEYS = {
  recentContacts: 'recent_contacts_cache_v2',
  settings: 'ems_settings_cache'
};

// ✅ FIXED: proper wrapper with _ts
type CacheWrapper = { _ts: number; data: any[] };

export function getRecentContactsFast(): any[] | null {
  if(!browser) return null;
  try{
    const cached = localStorage.getItem(CACHE_KEYS.recentContacts);
    if(!cached) return null;
    const parsed = JSON.parse(cached) as CacheWrapper | any[];
    // support old array format + new wrapper
    let arr: any[] = [];
    let ts = 0;
    if(Array.isArray(parsed)){
      arr = parsed;
      ts = (parsed as any)._ts || 0;
    } else if(parsed?.data && Array.isArray(parsed.data)){
      arr = parsed.data;
      ts = parsed._ts || 0;
    } else return null;
    if(ts && Date.now() - ts > 5*60*1000) return null;
    if(!Array.isArray(arr)) return null;
    return arr;
  }catch{ return null; }
}

export function setRecentContactsCache(data:any[]){
  if(!browser || !Array.isArray(data)) return;
  try{
    const safe = data.slice(0,30).map((c:any)=> ({
      id: String(c.id||'').slice(0,80),
      actual_user_id: String(c.actual_user_id || c.id || '').slice(0,80),
      name: String(c.name||'').slice(0,80),
      avatar_url: String(c.avatar_url||c.avatar||'').slice(0,300),
      last_message_at: String(c.last_message_at||c.lastAt||new Date().toISOString()).slice(0,40)
    }));
    const wrapper: CacheWrapper = { _ts: Date.now(), data: safe };
    localStorage.setItem(CACHE_KEYS.recentContacts, JSON.stringify(wrapper));
  }catch{}
}

export function getChatClient() {
  return getChatSingleton();
}

export function getTemplateClient() {
  return getTemplateSingleton();
}

export async function preloadInBackground(){
  if(!browser) return;
  try{
    const chat = getChatSingleton();
    if(!chat) return;
    const p1 = chat.from('profiles').select('id,name,avatar_url').limit(10).then(({data})=>{
      if(data?.length) setRecentContactsCache(data);
    }).catch(()=>{});
    const tmpl = getTemplateSingleton();
    const p2 = tmpl ? tmpl.from('templates').select('id').limit(1).then(()=>{}).catch(()=>{}) : Promise.resolve();
    await Promise.allSettled([p1, p2]);
  }catch{}
}

export async function checkTemplatesConnection() {
  try {
    const tmpl = getTemplateSingleton();
    if(!tmpl) return false;
    const { error } = await tmpl.from('templates').select('id').limit(1);
    return !error;
  } catch { return false; }
}

if(browser){
  const idle = (window as any).requestIdleCallback || ((cb:any)=> setTimeout(cb, 800));
  idle(()=> preloadInBackground());
}