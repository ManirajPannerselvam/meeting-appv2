/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/stores/auth.ts
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

		setSession(session: Session | null): void {
			update(state => ({
				...state,
				session,
				user: session?.user ? { ...state.user, ...session.user } as AuthUser : null,
				loading: false,
				error: null
			}));
	},

		setUser(user: AuthUser | null): void {
			update(state => ({ ...state, user }));
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
export const isAuthenticated = derived(authStore, ($auth) => !!$auth.session);
export const currentUser = derived(authStore, ($auth) => $auth.user);

// Safe role extraction + default to 'user'
export const userRole = derived(
	authStore,
	($auth): Role => {
		const role = $auth.user?.user_metadata?.role || 'user';
		return role as Role;
	}
);

/**
 * Check permission: $can('finance:create')
 */
export const can = derived(
	authStore,
	($auth) => (permission: Permission) => hasPermission($auth.user, permission)
);

/**
 * Check role: $isRole('admin')
 */
export const isRole = derived(
	authStore,
	($auth) => (role: Role) => hasRole($auth.user, role)
);

export const isAdmin = derived(userRole, ($role) => $role === 'admin');
export const isManager = derived(userRole, ($role) => $role === 'manager');
export const isAccountant = derived(userRole, ($role) => $role === 'accountant');

/**
 * Display name helper
 */
export const displayName = derived(
	currentUser,
	($user) => $user?.user_metadata?.full_name || $user?.full_name || $user?.email || 'User'
);