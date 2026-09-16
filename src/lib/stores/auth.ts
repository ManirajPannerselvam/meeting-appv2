/**
 * Temple Operations Reporting System
 * File : src/lib/stores/auth.ts
 * SECURE: uses getUser() not session.user + 50k optimized
 */
import { writable, derived, get } from "svelte/store";
import type { Session, User } from "@supabase/supabase-js";
import type { UserRecord } from "$lib/types/database";
import type { Role, Permission } from "$lib/auth/rbac";
import { hasPermission, hasRole } from "$lib/auth/rbac";

export type AuthUser = User & Partial<UserRecord>;

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  error: null
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);
  let cachedState = initialState;
  const unsubCache = subscribe(v=>{ cachedState=v; });

  return {
    subscribe,
    setState(state: AuthState){ cachedState=state; set(state); },
    getState(): AuthState { return cachedState; },
    reset(){ const s={ user: null, session: null, loading: false, error: null }; cachedState=s; set(s); },
    setSession(session: Session | null){
      update(state => { const ns={ ...state, session, loading:false, error:null }; cachedState=ns; return ns; });
    },
    setUser(user: AuthUser | null){
      update(state => { const ns={ ...state, user, loading:false }; cachedState=ns; return ns; });
    },
    setLoading(loading: boolean){ update(state => { const ns={...state, loading}; cachedState=ns; return ns; }); },
    setError(error: string | null){ update(state => { const ns={...state, error}; cachedState=ns; return ns; }); }
  };
}

export const authStore = createAuthStore();

// Derived - fast, no extra subscribe
export const isAuthenticated = derived(authStore, ($auth) => !!$auth.user && !!$auth.session);
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const userRole = derived(authStore, ($auth): Role => ($auth.user?.user_metadata?.role || 'user') as Role);
export const can = derived(authStore, ($auth) => (permission: Permission) => hasPermission($auth.user, permission));
export const isRole = derived(authStore, ($auth) => (role: Role) => hasRole($auth.user, role));
export const isAdmin = derived(userRole, ($role) => $role === 'admin');
export const isManager = derived(userRole, ($role) => $role === 'manager');
export const isAccountant = derived(userRole, ($role) => $role === 'accountant');
export const displayName = derived(currentUser, ($user) => $user?.user_metadata?.full_name || $user?.full_name || $user?.email || 'User');
export const authUserId = derived(currentUser, ($user) => $user?.id || $user?.email || 'unknown_user');
export const authUserName = derived(currentUser, ($user) => $user?.user_metadata?.full_name || $user?.full_name || $user?.email || 'Account User');
export const authUserEmail = derived(currentUser, ($user) => $user?.email || '');

export function getTemplateOwner() {
  const state = get(authStore);
  const user = state.user;
  return {
    owner_id: user?.id || user?.email || 'unknown_user',
    owner_name: user?.user_metadata?.full_name || (user as any)?.full_name || user?.email || 'Account User',
    owner_email: user?.email || ''
  };
}

// SECURE INIT - 1 time login reference for all pages
export async function initSecureAuth(supabase: any) {
  try {
    authStore.setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    authStore.setSession(session);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (user) authStore.setUser(user as AuthUser);
    else authStore.setUser(null);
    return { session, user };
  } catch (e: any) {
    authStore.setError(e.message);
    authStore.setUser(null);
    return { session: null, user: null };
  } finally {
    authStore.setLoading(false);
  }
}

// FAST getter for meetings page - no supabase call, uses cache
export function getCurrentUserIdFast(): string | null {
  const s = authStore.getState();
  return s.user?.id || s.session?.user?.id || null;
}