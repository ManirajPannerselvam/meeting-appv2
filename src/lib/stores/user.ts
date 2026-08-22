/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/stores/user.ts
 * ============================================================
 * PURPOSE
 *   Central Svelte store for user state.
 *
 * IMPORTANT
 *   This store intentionally does NOT import userService.
 *   user.service.ts imports this store, so importing the service
 *   back into the store would create a circular dependency.
 * ============================================================
 */

import { writable, derived, get } from "svelte/store";

import type { UserRecord } from "$lib/types/database";

/* ============================================================
 * TYPES
 * ============================================================ */

export interface UserFilters {
	is_active?: boolean;
	role?: string;
	search?: string;
}

export interface UserState {
	users: UserRecord[];
	currentUser: UserRecord | null;
	selectedUser: UserRecord | null;
	loading: boolean;
	error: string | null;
	total: number;
	page: number;
	pageSize: number;
	filters: UserFilters;
}

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialState: UserState = {
	users: [],
	currentUser: null,
	selectedUser: null,
	loading: false,
	error: null,
	total: 0,
	page: 1,
	pageSize: 20,
	filters: {
		is_active: true
	}
};

/* ============================================================
 * STORE
 * ============================================================ */

function createUserStore() {
	const { subscribe, update, set } =
		writable<UserState>(initialState);

	return {
		subscribe,

		/* --------------------------------------------------------
		 * STATE
		 * -------------------------------------------------------- */

		setState(state: UserState): void {
			set(state);
		},

		getState(): UserState {
			return get({ subscribe });
		},

		reset(): void {
			set({
				...initialState,
				users: [],
				currentUser: null,
				selectedUser: null,
				error: null
			});
		},

		/* --------------------------------------------------------
		 * LOADING / ERROR
		 * -------------------------------------------------------- */

		setLoading(loading: boolean): void {
			update((state) => ({
				...state,
				loading
			}));
		},

		setError(error: string | null): void {
			update((state) => ({
				...state,
				error
			}));
		},

		/* --------------------------------------------------------
		 * USERS
		 * -------------------------------------------------------- */

		setUsers(users: UserRecord[]): void {
			update((state) => ({
				...state,
				users,
				total: users.length
			}));
		},

		setCurrentUser(user: UserRecord | null): void {
			update((state) => ({
				...state,
				currentUser: user
			}));
		},

		setSelectedUser(user: UserRecord | null): void {
			update((state) => ({
				...state,
				selectedUser: user
			}));
		},

		clearCurrentUser(): void {
			update((state) => ({
				...state,
				currentUser: null
			}));
		},

		clearSelectedUser(): void {
			update((state) => ({
				...state,
				selectedUser: null
			}));
		},

		/* --------------------------------------------------------
		 * PAGINATION
		 * -------------------------------------------------------- */

		setPage(page: number): void {
			const safePage = Math.max(1, page);

			update((state) => ({
				...state,
				page: safePage
			}));
		},

		setPageSize(pageSize: number): void {
			const safePageSize = Math.max(1, pageSize);

			update((state) => ({
				...state,
				pageSize: safePageSize,
				page: 1
			}));
		},

		/* --------------------------------------------------------
		 * FILTERS
		 * -------------------------------------------------------- */

		setFilters(filters: UserFilters): void {
			update((state) => ({
				...state,
				filters: {
					...filters
				},
				page: 1
			}));
		},

		clearFilters(): void {
			update((state) => ({
				...state,
				filters: {
					is_active: true
				},
				page: 1
			}));
		},

		/* --------------------------------------------------------
		 * OPTIMISTIC STATUS UPDATE
		 * -------------------------------------------------------- */

		updateUserStatus(
			userId: string,
			isActive: boolean
		): void {
			update((state) => ({
				...state,

				users: state.users.map((user) =>
					user.user_id === userId
						? {
								...user,
								is_active: isActive
							}
						: user
				),

				currentUser:
					state.currentUser?.user_id === userId
						? {
								...state.currentUser,
								is_active: isActive
							}
						: state.currentUser,

				selectedUser:
					state.selectedUser?.user_id === userId
						? {
								...state.selectedUser,
								is_active: isActive
							}
						: state.selectedUser
			}));
		},

		/* --------------------------------------------------------
		 * REMOVE USER FROM CURRENT LIST
		 * -------------------------------------------------------- */

		removeUser(userId: string): void {
			update((state) => ({
				...state,

				users: state.users.filter(
					(user) => user.user_id !== userId
				),

				total: Math.max(0, state.total - 1),

				currentUser:
					state.currentUser?.user_id === userId
						? null
						: state.currentUser,

				selectedUser:
					state.selectedUser?.user_id === userId
						? null
						: state.selectedUser
			}));
		},

		/* --------------------------------------------------------
		 * ADD / REPLACE USER
		 * -------------------------------------------------------- */

		upsertUser(user: UserRecord): void {
			update((state) => {
				const exists = state.users.some(
					(item) => item.user_id === user.user_id
				);

				if (exists) {
					return {
						...state,
						users: state.users.map((item) =>
							item.user_id === user.user_id
								? user
								: item
						)
					};
				}

				return {
					...state,
					users: [...state.users, user],
					total: state.total + 1
				};
			});
		}
	};
}

/* ============================================================
 * PUBLIC STORE
 * ============================================================ */

export const userStore = createUserStore();

/* ============================================================
 * DERIVED STORES
 * ============================================================ */

export const activeUsers = derived(
	userStore,
	($state) =>
		$state.users.filter(
			(user) => user.is_active === true
		)
);

export const inactiveUsers = derived(
	userStore,
	($state) =>
		$state.users.filter(
			(user) => user.is_active === false
		)
);

export const userCount = derived(
	userStore,
	($state) => $state.total
);

export const loading = derived(
	userStore,
	($state) => $state.loading
);

export const userError = derived(
	userStore,
	($state) => $state.error
);

export const currentUser = derived(
	userStore,
	($state) => $state.currentUser
);

export const selectedUser = derived(
	userStore,
	($state) => $state.selectedUser
);

export const usersByRole = derived(
	userStore,
	($state) => (role: string) =>
		$state.users.filter(
			(user) => user.role === role
		)
);

/* ============================================================
 * DEFAULT EXPORT
 * ============================================================ */

export default userStore;