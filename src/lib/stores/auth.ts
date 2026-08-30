/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/stores/auth.ts
 * SECURE: uses getUser() not getSession() user
 * ============================================================
 */

import { writable, derived, get } from "svelte/store";
import type { Session, User } from "@supabase/supabase-js";
import type { UserRecord } from "$lib/types/database";
import type { Role, Permission } from "$lib/auth/rbac";
import { hasPermission, hasRole } from "$lib/auth/rbac";

// Merge Supabase User + our profile table
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

	return {
		subscribe,

		setState(state: AuthState): void {
			set(state);
		},

		getState(): AuthState {
			let current!: AuthState;
			const unsubscribe = subscribe((value) => {
				current = value;
			});
			unsubscribe();
			return current;
		},

		reset(): void {
			set({ user: null, session: null, loading: false, error: null });
		},

		// SECURE: Don't trust session.user directly - session is ok, but user must be from getUser()
		setSession(session: Session | null): void {
			update(state => ({
				...state,
				session,
				// Keep old user until getUser() verifies - don't set user from session
				loading: false,
				error: null
			}));
		},

		setUser(user: AuthUser | null): void {
			update(state => ({ ...state, user, loading: false }));
		},

		setLoading(loading: boolean): void {
			update(state => ({ ...state, loading }));
		},

		setError(error: string | null): void {
			update(state => ({ ...state, error }));
		}
	};
}

export const authStore = createAuthStore();

/**
 * Derived stores
 */
export const isAuthenticated = derived(authStore, ($auth) => !!$auth.user && !!$auth.session);
export const currentUser = derived(authStore, ($auth) => $auth.user);

export const userRole = derived(
	authStore,
	($auth): Role => {
		const role = $auth.user?.user_metadata?.role || 'user';
		return role as Role;
	}
);

export const can = derived(
	authStore,
	($auth) => (permission: Permission) => hasPermission($auth.user, permission)
);

export const isRole = derived(
	authStore,
	($auth) => (role: Role) => hasRole($auth.user, role)
);

export const isAdmin = derived(userRole, ($role) => $role === 'admin');
export const isManager = derived(userRole, ($role) => $role === 'manager');
export const isAccountant = derived(userRole, ($role) => $role === 'accountant');

export const displayName = derived(
	currentUser,
	($user) => $user?.user_metadata?.full_name || $user?.full_name || $user?.email || 'User'
);

/**
 * Template Owner Helpers
 */
export const authUserId = derived(
	currentUser,
	($user) => $user?.id || $user?.email || 'unknown_user'
);

export const authUserName = derived(
	currentUser,
	($user) => $user?.user_metadata?.full_name || $user?.full_name || $user?.email || 'Account User'
);

export const authUserEmail = derived(
	currentUser,
	($user) => $user?.email || ''
);

export function getTemplateOwner() {
	const state = get(authStore);
	const user = state.user;
	return {
		owner_id: user?.id || user?.email || 'unknown_user',
		owner_name: user?.user_metadata?.full_name || (user as any)?.full_name || user?.email || 'Account User',
		owner_email: user?.email || ''
	};
}

/**
 * SECURE INIT - Use this in +layout.ts / hooks
 * This fixes your warning: "mes directly from the storage medium..."
 */
export async function initSecureAuth(supabase: any) {
	try {
		// 1. Get session (ok to get session)
		const { data: { session } } = await supabase.auth.getSession();
		authStore.setSession(session);

		// 2. SECURE: Authenticate user via server - this contacts Supabase Auth server
		const { data: { user }, error } = await supabase.auth.getUser();
		if (error) throw error;
		
		if (user) {
			authStore.setUser(user as AuthUser);
		} else {
			authStore.setUser(null);
		}
		return { session, user };
	} catch (e: any) {
		authStore.setError(e.message);
		authStore.setUser(null);
		return { session: null, user: null };
	} finally {
		authStore.setLoading(false);
	}
}