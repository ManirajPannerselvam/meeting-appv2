/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/stores/notification.ts
 * ============================================================
 * PURPOSE
 *   Central reactive notification state.
 *
 * USED BY
 *   src/lib/services/notification.service.ts
 *   Notification UI components
 *
 * COMPATIBILITY
 *   - Exports `notificationStore` for services
 *   - Keeps `notifications` export for existing components
 *   - Keeps `unreadNotifications` derived store
 * ============================================================
 */

import { writable, derived, get } from "svelte/store";

/* ============================================================
 * TYPES
 * ============================================================ */

export type NotificationType =
	| "info"
	| "warning"
	| "error"
	| "success";

export interface Notification {
	id: string;
	title: string;
	message: string;
	read: boolean;
	created_at: string;
	type?: NotificationType;
}

export interface NotificationState {
	notifications: Notification[];
	loading: boolean;
	error: string | null;
}

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialState: NotificationState = {
	notifications: [],
	loading: false,
	error: null
};

/* ============================================================
 * STORE
 * ============================================================ */

function createNotificationStore() {
	const { subscribe, set, update } =
		writable<NotificationState>(initialState);

	return {
		subscribe,

		/* ======================================================
		 * STATE
		 * ====================================================== */

		setState(state: NotificationState): void {
			set(state);
		},

		getState(): NotificationState {
			return get({ subscribe });
		},

		reset(): void {
			set({
				notifications: [],
				loading: false,
				error: null
			});
		},

		/* ======================================================
		 * LOADING
		 * ====================================================== */

		setLoading(loading: boolean): void {
			update(state => ({
				...state,
				loading
			}));
		},

		/* ======================================================
		 * ERROR
		 * ====================================================== */

		setError(error: string | null): void {
			update(state => ({
				...state,
				error
			}));
		},

		clearError(): void {
			update(state => ({
				...state,
				error: null
			}));
		},

		/* ======================================================
		 * NOTIFICATIONS
		 * ====================================================== */

		setNotifications(
			notifications: Notification[]
		): void {
			update(state => ({
				...state,
				notifications,
				error: null
			}));
		},

		add(
			notification: Omit<
				Notification,
				"id" | "created_at" | "read"
			>
		): void {
			update(state => ({
				...state,
				notifications: [
					{
						...notification,
						id: crypto.randomUUID(),
						created_at: new Date().toISOString(),
						read: false
					},
					...state.notifications
				]
			}));
		},

		addNotification(
			notification: Notification
		): void {
			update(state => ({
				...state,
				notifications: [
					notification,
					...state.notifications.filter(
						item => item.id !== notification.id
					)
				]
			}));
		},

		updateNotification(
			notification: Notification
		): void {
			update(state => ({
				...state,
				notifications: state.notifications.map(
					item =>
						item.id === notification.id
							? notification
							: item
				)
			}));
		},

		removeNotification(id: string): void {
			update(state => ({
				...state,
				notifications: state.notifications.filter(
					item => item.id !== id
				)
			}));
		},

		/* ======================================================
		 * READ STATE
		 * ====================================================== */

		markRead(id: string): void {
			update(state => ({
				...state,
				notifications: state.notifications.map(
					item =>
						item.id === id
							? {
									...item,
									read: true
								}
							: item
				)
			}));
		},

		markUnread(id: string): void {
			update(state => ({
				...state,
				notifications: state.notifications.map(
					item =>
						item.id === id
							? {
									...item,
									read: false
								}
							: item
				)
			}));
		},

		markAllRead(): void {
			update(state => ({
				...state,
				notifications: state.notifications.map(
					item => ({
						...item,
						read: true
					})
				)
			}));
		},

		/* ======================================================
		 * CLEAR
		 * ====================================================== */

		clear(): void {
			update(state => ({
				...state,
				notifications: []
			}));
		},

		clearNotifications(): void {
			update(state => ({
				...state,
				notifications: []
			}));
		}
	};
}

/* ============================================================
 * CANONICAL STORE EXPORT
 *
 * notification.service.ts expects:
 *
 * import { notificationStore }
 *   from "$lib/stores/notification";
 * ============================================================ */

export const notificationStore =
	createNotificationStore();

/* ============================================================
 * BACKWARD-COMPATIBLE EXPORT
 *
 * Existing components can continue using:
 *
 * import { notifications }
 *   from "$lib/stores/notification";
 * ============================================================ */

export const notifications =
	notificationStore;

/* ============================================================
 * DERIVED STORES
 * ============================================================ */

export const notificationList = derived(
	notificationStore,
	$notification => $notification.notifications
);

export const unreadNotifications = derived(
	notificationStore,
	$notification =>
		$notification.notifications.filter(
			notification => !notification.read
		).length
);

export const hasUnreadNotifications = derived(
	unreadNotifications,
	count => count > 0
);

export const notificationLoading = derived(
	notificationStore,
	$notification => $notification.loading
);

export const notificationError = derived(
	notificationStore,
	$notification => $notification.error
);

/* ============================================================
 * TYPE-SPECIFIC DERIVED STORES
 * ============================================================ */

export const infoNotifications = derived(
	notificationStore,
	$notification =>
		$notification.notifications.filter(
			item => item.type === "info"
		)
);

export const warningNotifications = derived(
	notificationStore,
	$notification =>
		$notification.notifications.filter(
			item => item.type === "warning"
		)
);

export const errorNotifications = derived(
	notificationStore,
	$notification =>
		$notification.notifications.filter(
			item => item.type === "error"
		)
);

export const successNotifications = derived(
	notificationStore,
	$notification =>
		$notification.notifications.filter(
			item => item.type === "success"
		)
);