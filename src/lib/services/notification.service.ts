/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/services/notification.service.ts
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { notificationStore } from "$lib/stores/notification";
import { toast } from "$lib/stores/toast";
import type { UUID, ISOTimestamp } from "$lib/types/database";

/* ============================================================
 * TYPES - DB type
 * ============================================================ */

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "MEETING" | "WORKFLOW" | "FINANCE";

interface NotificationRecord {
	notification_id: UUID;
	user_id: UUID;
	title: string;
	message: string;
	type: NotificationType | string;
	is_read: boolean;
	read_at?: ISOTimestamp | null;
	created_at: ISOTimestamp;
	updated_at?: ISOTimestamp;
	[key: string]: unknown;
}

/* ============================================================
 * HELPER: Map DB -> Store
 * ============================================================ */
function toStoreNotification(n: NotificationRecord) {
	return {
		id: n.notification_id,
		title: n.title,
		message: n.message,
		read: n.is_read,
		created_at: n.created_at,
		type: n.type.toLowerCase() as any
	};
}

class NotificationService {
	private subscription: ReturnType<typeof supabase.channel> | null = null;

	private setLoading(value: boolean): void {
		notificationStore.setLoading(value);
	}

	private handleError(error: unknown, msg = "Notification error"): never {
		console.error(msg, error);
		toast.error(error instanceof Error ? error.message : String(error));
		throw error instanceof Error ? error : new Error(String(error));
	}

	/**
	 * Load all notifications for current user
	 */
	async loadUserNotifications(userId: UUID, limit = 50) {
		this.setLoading(true);
		try {
			const { data, error } = await supabase
				.from("notifications")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.limit(limit);

			if (error) throw error;

			const notifications = (data ?? []).map(toStoreNotification);

			notificationStore.setNotifications(notifications); // now works

			return notifications;
	} catch (error) {
			this.handleError(error, "Failed to load notifications");
		} finally {
			this.setLoading(false);
	}
	}

	async getUnreadCount(userId: UUID): Promise<number> {
		const { count, error } = await supabase
			.from("notifications")
			.select("*", { count: "exact", head: true })
			.eq("user_id", userId)
			.eq("is_read", false);

		if (error) {
			console.error("Failed to load unread notification count", error);
			return 0;
		}
		return count ?? 0;
	}

	async markAsRead(notificationId: UUID): Promise<void> {
		const { error } = await supabase
			.from("notifications")
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq("notification_id", notificationId);

		if (error) throw new Error(error.message);

		notificationStore.markRead(notificationId); // matches store
	}

	async markAllAsRead(userId: UUID): Promise<void> {
		const { error } = await supabase
			.from("notifications")
			.update({ is_read: true, read_at: new Date().toISOString() })
			.eq("user_id", userId)
			.eq("is_read", false);

		if (error) throw new Error(error.message);

		notificationStore.markAllRead(); // matches store
	}

	async deleteNotification(notificationId: UUID): Promise<void> {
		const { error } = await supabase
			.from("notifications")
			.delete()
			.eq("notification_id", notificationId);

		if (error) throw new Error(error.message);

		notificationStore.removeNotification(notificationId); // matches store
	}

	subscribeToUser(userId: UUID): void {
		this.unsubscribe();
		this.subscription = supabase
			.channel(`notifications:${userId}`)
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
				(payload) => {
					const newNotification = toStoreNotification(payload.new as NotificationRecord);
					notificationStore.addNotification(newNotification); // matches store
					toast.info(newNotification.title);
				}
			)
			.subscribe();
	}

	unsubscribe(): void {
		if (!this.subscription) return;
		supabase.removeChannel(this.subscription);
		this.subscription = null;
	}
}

export const notificationService = new NotificationService();
export default notificationService;