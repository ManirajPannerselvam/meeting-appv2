/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/realtime/notification.ts
 * ============================================================
 * PURPOSE
 * Notification realtime synchronization.
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
// import { refreshNotifications } from "$lib/stores/notification"; // uncomment when store exists

let channel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Start notification realtime
 */
export function startNotificationRealtime(): void { // <-- ADDED export
	if (channel) return;

	channel = supabase
		.channel("notifications_realtime")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "notifications" },
			async () => {
				// await refreshNotifications();
				console.log("[Realtime] Notification change detected");
			}
	)
		.subscribe();
}

/**
 * Stop notification realtime
 */
export function stopNotificationRealtime(): void { // <-- ADDED export
	if (!channel) return;
	supabase.removeChannel(channel);
	channel = null;
}