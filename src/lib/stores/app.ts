/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/stores/app.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Global application state.
 *
 * DESCRIPTION
 *   Stores application-wide UI state shared across
 *   Dashboard, Reports, Chat, Meetings and Settings.
 *
 * NOTE
 *   This store is ONLY for application state.
 *   Do NOT store report or chat data here.
 * ============================================================
 */

import { writable } from 'svelte/store';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppState {
	loading: boolean;
	online: boolean;
	drawerOpen: boolean;
	theme: ThemeMode;
}

const initialState: AppState = {
	loading: false,
	online: true,
	drawerOpen: false,
	theme: 'system'
};

function createAppStore() {
	const { subscribe, set, update } = writable<AppState>(initialState);

	return {
		subscribe,

		/**
		 * Reset application state
		 */
		reset() {
			set(initialState);
		},

		/**
		 * Global loading
		 */
		setLoading(loading: boolean) {
			update((state) => ({
				...state,
				loading
			}));
		},

		/**
		 * Online / Offline status
		 */
		setOnline(online: boolean) {
			update((state) => ({
				...state,
				online
			}));
		},

		/**
		 * Navigation drawer
		 */
		setDrawerOpen(drawerOpen: boolean) {
			update((state) => ({
				...state,
				drawerOpen
			}));
		},

		/**
		 * Theme
		 */
		setTheme(theme: ThemeMode) {
			update((state) => ({
				...state,
				theme
			}));
		}
	};
}

export const appStore = createAppStore();