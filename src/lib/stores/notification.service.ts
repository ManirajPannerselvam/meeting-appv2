import {
	writable,
	derived,
	get
} from "svelte/store";

import type {
	NotificationRecord,
	UUID
} from "$lib/types/database";

export interface NotificationState {
	notifications: NotificationRecord[];
	currentNotification: NotificationRecord | null;
	selectedNotification: NotificationRecord | null;
	loading: boolean;
	error: string | null;
	unreadCount: number;
}

const initialState: NotificationState = {
	notifications: [],
	currentNotification: null,
	selectedNotification: null,
	loading: false,
	error: null,
	unreadCount: 0
};

function createNotificationStore() {
	const { subscribe, set, update } = writable<NotificationState>(initialState);

	const store = {
	subscribe,

		setState(state: NotificationState): void {
			set(state);
		},

		getState(): NotificationState {
			return get({ subscribe });
		},

		reset(): void {
			set(initialState);
		},

		setLoading(loading: boolean): void {
			update(state => ({ ...state, loading }));
		},

		setError(error: string | null): void {
			update(state => ({ ...state, error }));
		},

		setNotifications(notifications: NotificationRecord[]): void {
			update(state => ({
				...state,
				notifications,
				unreadCount: notifications.filter(n => !n.is_read).length
			}));
	},

		setCurrentNotification(notification: NotificationRecord | null): void {
			update(state => ({ ...state, currentNotification: notification }));
		},

		setSelectedNotification(notification: NotificationRecord | null): void {
			update(state => ({ ...state, selectedNotification: notification }));
		},

		addNotification(notification: NotificationRecord): void {
			update(state => {
				const notifications = [notification, ...state.notifications];
				return {
					...state,
					notifications,
					unreadCount: notifications.filter(n => !n.is_read).length
				};
			});
	},

		updateNotification(notification: NotificationRecord): void {
			update(state => {
				const notifications = state.notifications.map(item =>
					item.notification_id === notification.notification_id ? notification : item
				);
				return {
					...state,
					notifications,
					unreadCount: notifications.filter(n => !n.is_read).length
				};
			});
		},

		removeNotification(notificationId: UUID): void {
			update(state => {
				const notifications = state.notifications.filter(
					item => item.notification_id !== notificationId
				);
				return {
					...state,
					notifications,
					unreadCount: notifications.filter(n => !n.is_read).length
				};
			});
		},

		markAsRead(notificationId: UUID): void {
			update(state => {
				const notifications = state.notifications.map(item =>
					item.notification_id === notificationId ? { ...item, is_read: true } : item
				);
				return {
					...state,
					notifications,
					unreadCount: notifications.filter(n => !n.is_read).length
				};
			});
		},

		markAllAsRead(): void {
			update(state => {
				const notifications = state.notifications.map(item => ({ ...item, is_read: true }));
				return { ...state, notifications, unreadCount: 0 };
			});
		},

		clearCurrentNotification(): void {
			store.setCurrentNotification(null); // fixed: use store. instead of this.
	},

		clearSelectedNotification(): void {
			store.setSelectedNotification(null); // fixed
		},

		clearNotifications(): void {
			update(state => ({ ...state, notifications: [], unreadCount: 0 }));
	},

		setUnreadCount(count: number): void {
			update(state => ({ ...state, unreadCount: count }));
	},
	};

	return store; // <-- added
}

export const notificationStore = createNotificationStore();

export const unreadNotifications = derived(
	notificationStore,
	($notification) => $notification.notifications.filter(n => !n.is_read)
);

export const readNotifications = derived(
	notificationStore,
	($notification) => $notification.notifications.filter(n => n.is_read)
);

export const notificationCount = derived(
	notificationStore,
	($notification) => $notification.notifications.length
);