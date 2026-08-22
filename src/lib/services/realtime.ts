/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/realtime.ts
 * ============================================================
 * PURPOSE
 *   Realtime message subscription helper.
 * ============================================================
 */

import { supabaseChat } from "$lib/supabase/client";

/* ============================================================
 * TYPES
 * ============================================================ */

type MessageRealtimeCallback = (payload: unknown) => void;

/* ============================================================
 * SUBSCRIBE TO MESSAGES
 * ============================================================ */

export function subscribeMessages(
	roomId: string,
	callback: MessageRealtimeCallback
) {
	return supabaseChat
		.channel(`room-${roomId}`)
		.on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "messages",
				filter: `room_id=eq.${roomId}`
			},
			callback
		)
		.subscribe();
}
