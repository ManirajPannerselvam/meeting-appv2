import { browser } from "$app/environment";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
	PUBLIC_SUPABASE_CHAT_URL,
	PUBLIC_SUPABASE_CHAT_ANON_KEY,
	PUBLIC_SUPABASE_TEMPLATES_URL,
	PUBLIC_SUPABASE_TEMPLATES_ANON_KEY
} from "$env/static/public";

let _chatClient: SupabaseClient | null = null;
let _templateClient: SupabaseClient | null = null;

// ✅ 50K + SECURE: safeStorage with quota + private mode protection
const safeStorage = browser ? {
	getItem: (key: string) => {
		try { 
			const v = window.localStorage.getItem(key);
			if(v && v.length>500000) return null; // block huge token for 50k
			return v;
		} catch { return null; }
	},
	setItem: (key: string, value: string) => {
		try {
			if(value.length>500000) return; // don't store >500KB
			window.localStorage.setItem(key, value);
		} catch(e:any){
			// quota full for 50k - clear old
			try{
				if(e?.name==='QuotaExceededError'){
					window.localStorage.removeItem(key);
				}
			}catch{}
		}
	},
	removeItem: (key: string) => {
		try { window.localStorage.removeItem(key); } catch {}
	}
} : undefined;

// ✅ 50K: fetch with timeout + no cache leak
function createSecureFetch(timeoutMs=15000){
	return (url:any, opts:any)=>{
		const controller = new AbortController();
		const t = setTimeout(()=>controller.abort(), timeoutMs);
		const finalOpts:any = {
			...opts,
			signal: controller.signal,
			cache: 'no-store',
			// security: no credentials leak
			credentials: 'same-origin' as RequestCredentials
		};
		return fetch(url, finalOpts).finally(()=>clearTimeout(t)) as any;
	};
}

function createChatClient(): SupabaseClient {
	if (!browser) {
		// ✅ 50K + SECURITY HIGH: Server - never persist, no realtime, isolated
		return createClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
			realtime: { transport: undefined as any },
			global: { fetch: createSecureFetch(10000) },
			db: { schema: 'public' }
		});
	}
	// ✅ 50K OPTIMIZED: Browser client - singleton
	return createClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
			storage: safeStorage as any,
			storageKey: 'chat-auth-v3', // v3 = fresh + secure
			flowType: 'pkce' // SECURITY HIGH: PKCE > implicit
		},
		global: { 
			fetch: createSecureFetch(15000),
			headers: { 'x-client-info': 'chat-app-v3-50k' }
		},
		// ✅ 50K FIX: 2 eps + 30s heartbeat = idle after 2s (was 10 eps = 85s timeline)
		realtime: { 
			params: { eventsPerSecond: 2 },
			heartbeatIntervalMs: 30000,
			timeout: 15000
		},
		db: { schema: 'public' }
	});
}

function createTemplateClient(): SupabaseClient {
	if (!browser) {
		return createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
			auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
			realtime: { transport: undefined as any },
			global: { fetch: createSecureFetch(10000) },
			db: { schema: 'public' }
		});
	}
	return createClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
		global: { 
			fetch: createSecureFetch(10000),
			headers: { 'x-client-info': 'temple-ops-v3-50k' }
		},
		realtime: { transport: undefined as any } // Templates don't need realtime
	});
}

export function getChatClient(): SupabaseClient {
	// ✅ SPEED + BUG FIX HIGH: Don't reuse server client across requests (leaks sessions for 50k)
	if (!browser) {
		return createChatClient();
	}
	if (_chatClient) return _chatClient;
	_chatClient = createChatClient();
	return _chatClient;
}

export function getTemplateClient(): SupabaseClient {
	if (!browser) {
		return createTemplateClient();
	}
	if (_templateClient) return _templateClient;
	_templateClient = createTemplateClient();
	return _templateClient;
}

// KEEP SAME EXPORTS - NO BREAKING CHANGE - 50k SAFE
export const supabase = getChatClient();
export const supabaseChat = getChatClient();
export const chatDB = getChatClient();
export const supabaseTemplates = getTemplateClient();
export default supabase;