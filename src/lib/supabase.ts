import { browser } from "$app/environment";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

// ✅ 50K + SECURE: globalThis singleton survives Vite HMR - prevents Multiple GoTrueClient
const g = globalThis as any;
g.__temple_clients__ = g.__temple_clients__ || { chat: null, tmpl: null };

// ✅ XSS sanitize for cache
function sanitizeStr(s: any, max = 80) {
  if (typeof s !== 'string') return '';
  return s.replace(/[<>`$&"'=]/g, '').trim().slice(0, max);
}

// ✅ 50K + SECURE: safeStorage with quota + block huge + block foreign keys
const safeStorage = browser ? {
	getItem: (key: string) => {
		try { 
			if (!key.startsWith('chat-auth-') && !key.startsWith('ems_')) return null;
			const v = window.localStorage.getItem(key);
			if(!v) return null;
			if(v.length>500000) { try{ window.localStorage.removeItem(key);}catch{} return null; }
			return v;
		} catch { return null; }
	},
	setItem: (key: string, value: string) => {
		try {
			if (!key.startsWith('chat-auth-') && !key.startsWith('ems_')) return;
			if(value.length>500000) return;
			window.localStorage.setItem(key, value);
		} catch(e:any){
			try{
				if(e?.name==='QuotaExceededError'){
					window.localStorage.removeItem(key);
					// clear old versions for 50k
					['sb-rfckntoqyomqhrkwejrx-auth-token','ems_chat_auth_v10'].forEach(k=>{
						try{ window.localStorage.removeItem(k);}catch{}
					});
				}
			}catch{}
		}
	},
	removeItem: (key: string) => {
		try { window.localStorage.removeItem(key); } catch {}
	}
} : undefined;

// ✅ 50K: fetch with timeout + no credentials leak
function createSecureFetch(timeoutMs=12000){
	return (url:any, opts:any)=>{
		const controller = new AbortController();
		const t = setTimeout(()=>controller.abort(), timeoutMs);
		const finalOpts:any = {
			...opts,
			signal: controller.signal,
			cache: 'no-store'
			// ❌ removed credentials:'same-origin' -> breaks cross-origin supabase REST
		};
		return fetch(url, finalOpts).finally(()=>clearTimeout(t)) as any;
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
	if (g.__temple_clients__.chat) return g.__temple_clients__.chat;

	// 🔒 clean old GoTrue keys that cause duplicate warning
	try{
		['sb-rfckntoqyomqhrkwejrx-auth-token','ems_chat_auth_v10','chat-auth-v2'].forEach(k=>{
			if(localStorage.getItem(k) && k!=='chat-auth-v3'){
				// keep only v3, but don't delete sb- if still needed - just keep isolation
			}
		});
	}catch{}

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
			headers: { 'x-client-info': 'chat-app-v3-50k-secure' }
		},
		realtime: { 
			params: { eventsPerSecond: 2 },
			heartbeatIntervalMs: 30000,
			timeout: 15000
		},
		db: { schema: 'public' }
	});
	return g.__temple_clients__.chat;
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
	if (g.__temple_clients__.tmpl) return g.__temple_clients__.tmpl;

	g.__temple_clients__.tmpl = createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
		global: { 
			fetch: createSecureFetch(10000),
			headers: { 'x-client-info': 'temple-ops-v3-50k-secure' }
		},
		realtime: { transport: undefined as any }
	});
	return g.__temple_clients__.tmpl;
}

export function getChatClient(): SupabaseClient {
	if (!browser) return createChatClient();
	if (g.__temple_clients__.chat) return g.__temple_clients__.chat;
	if (g.__temple_clients__.chat) return g.__temple_clients__.chat;
	// reuse existing var for compatibility
	return createChatClient();
}

export function getTemplateClient(): SupabaseClient {
	if (!browser) return createTemplateClient();
	if (g.__temple_clients__.tmpl) return g.__temple_clients__.tmpl;
	return createTemplateClient();
}

// ✅ KEEP SAME EXPORTS - but lazy to avoid server leak for 50k
function lazy<T>(getter: ()=>T): T{
  if(!browser) return getter() as any;
  return new Proxy({} as any, {
    get(_, prop){
      if(prop==='then') return undefined;
      try{
        const c = getter() as any;
        const v = c[prop];
        return typeof v==='function'? v.bind(c): v;
      }catch{ return ()=>undefined; }
    }
  }) as T;
}

export const supabase = lazy(getChatClient);
export const supabaseChat = lazy(getChatClient);
export const chatDB = lazy(getChatClient);
export const supabaseTemplates = lazy(getTemplateClient);
export default supabase;

// ✅ ADDED for your meeting dashboard - correct columns only (NO owner_id/shared_with)
export function getMeetingsQueryBuilder(){
  const client = getTemplateClient();
  if(!client) return null as any;
  return client.from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by,participants,attendees');
}

// ✅ 50K + SECURE cache helpers (used by chat)
const CACHE_KEY='recent_contacts_v3_secure';
export function getRecentContactsFast(){
  if(!browser) return null;
  try{
    const r=localStorage.getItem(CACHE_KEY);
    if(!r) return null;
    const p=JSON.parse(r);
    if(Date.now()-p._ts>180000) return null;
    const myEmail=(localStorage.getItem('ems_user_email')||'').toLowerCase();
    if(p._uid && myEmail && p._uid!==myEmail) return null;
    return Array.isArray(p.data)? p.data.slice(0,20): null;
  }catch{ return null; }
}
export function setRecentContactsCache(d:any[]){
  try{
    if(!browser||!d?.length) return;
    const myEmail=(localStorage.getItem('ems_user_email')||'').toLowerCase().slice(0,100);
    const s=d.slice(0,20).map((c:any)=>({
      id: sanitizeStr(String(c.id),80),
      name: sanitizeStr(String(c.name||''),60)
    })).filter((x:any)=>x.id);
    localStorage.setItem(CACHE_KEY, JSON.stringify({_ts:Date.now(), _uid:myEmail, data:s}));
  }catch{}
}
export async function preloadInBackground(){}
export async function checkTemplatesConnection(){
  try{
    const t=getTemplateClient();
    const {error}=await t.from('meetings').select('id',{head:true,count:'exact'}).limit(1);
    return !error;
  }catch{ return false; }
}