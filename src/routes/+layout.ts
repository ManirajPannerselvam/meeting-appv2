/**
 * ============================================================
 * FIXED + 50K + SECURE - 2 Supabase clients (Chat + Templates)
 * NO BLINK - Singleton + Same storageKey
 * ============================================================
 */
export const prerender = false;
export const ssr = true;
export const csr = true;

import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { 
  PUBLIC_SUPABASE_CHAT_URL, 
  PUBLIC_SUPABASE_CHAT_ANON_KEY,
  PUBLIC_SUPABASE_TEMPLATES_URL,
  PUBLIC_SUPABASE_TEMPLATES_ANON_KEY 
} from '$env/static/public';
import type { LayoutLoad } from './$types';

// Singleton - FIXES BLINK
let browserChatClient: any = null;
let browserTemplateClient: any = null;

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  depends('supabase:auth');

  const supabase = isBrowser()
    ? (browserChatClient ??= createBrowserClient(
        PUBLIC_SUPABASE_CHAT_URL, 
        PUBLIC_SUPABASE_CHAT_ANON_KEY, 
        {
          global: { fetch },
          auth: {
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storageKey: 'chat-auth-v3', // SAME KEY as lib/supabase
            autoRefreshToken: true
          },
          realtime: {
            params: { eventsPerSecond: 2 },
            heartbeatIntervalMs: 30000
          }
        }
      ))
    : createServerClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY, {
        global: { fetch },
        cookies: {
          getAll() { return data.cookies ?? []; },
          setAll() {} // Set in hooks.server.ts
        }
      });

  const supabaseTemplates = isBrowser()
    ? (browserTemplateClient ??= createBrowserClient(
        PUBLIC_SUPABASE_TEMPLATES_URL,
        PUBLIC_SUPABASE_TEMPLATES_ANON_KEY,
        {
          global: { fetch },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          },
          realtime: { transport: undefined as any }
        }
      ))
    : createServerClient(PUBLIC_SUPABASE_TEMPLATES_URL, PUBLIC_SUPABASE_TEMPLATES_ANON_KEY, {
        global: { fetch },
        cookies: {
          getAll() { return []; },
          setAll() {}
        }
      });

  const session = data.session ?? null;
  const user = data.user ?? session?.user ?? null;

  return {
    supabase, // Chat client - main auth
    supabaseChat: supabase,
    supabaseTemplates,
    session,
    user
  };
};