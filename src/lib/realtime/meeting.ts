/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/realtime/meeting.ts
 * ============================================================
 * PURPOSE
 *   Meeting realtime synchronization.
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { refreshMeetings, removeMeeting } from "$lib/stores/meetings"; // now exists
import type { MeetingRecord } from "$lib/types/database";

let channel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Start meeting realtime
 */
export function startMeetingRealtime(): void {
	if (channel) return;

	channel = supabase
		.channel("meetings_realtime")
		.on(
			"postgres_changes",
			{ event: "INSERT", schema: "public", table: "meetings" },
			async () => {
				// New meeting added in DB. Just refresh local store
				await refreshMeetings();
			}
	)
		.on(
			"postgres_changes",
			{ event: "UPDATE", schema: "public", table: "meetings" },
			async () => {
				// Meeting updated. Refresh
				await refreshMeetings();
			}
		)
		.on(
			"postgres_changes",
			{ event: "DELETE", schema: "public", table: "meetings" },
			async (payload) => {
				const oldMeeting = payload.old as any; // FIXED: use any until we define MeetingRecord
				// Delete locally and refresh. DB uses 'id' not 'meeting_id'
				await removeMeeting(oldMeeting.id); // FIXED
			}
		)
		.subscribe();
}

/**
 * Stop meeting realtime
 */
export function stopMeetingRealtime(): void {
	if (!channel) return;
	supabase.removeChannel(channel);
	channel = null;
}