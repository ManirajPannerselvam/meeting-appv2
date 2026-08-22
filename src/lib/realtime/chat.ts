/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/realtime/chat.ts
 * ============================================================
 * PURPOSE
 *   Chat realtime synchronization.
 *
 * DESCRIPTION
 *   Synchronizes chat messages with Supabase Realtime.
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { chatStore } from "$lib/stores/chat";

import type { ChatMessage } from "$lib/types/chat";

/* ============================================================
 * STATE
 * ============================================================ */

let channel:
	ReturnType<typeof supabase.channel> | null = null;

/* ============================================================
 * START REALTIME
 * ============================================================ */

/**
 * Start realtime listener.
 *
 * Prevents duplicate realtime channels from being created.
 */
export function startChatRealtime(): void {
	if (channel) {
		return;
	}

	channel = supabase
		.channel("chat_messages_realtime")

		/* --------------------------------------------------------
		 * INSERT
		 * -------------------------------------------------------- */

		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "chat_messages"
			},
			(payload) => {
				const message = payload.new as ChatMessage;
				const state = chatStore.getState();

				/*
				 * If the message belongs to the currently
				 * active room, add it immediately.
				 */
				if (state.activeRoom?.room_id === message.room_id) {
					chatStore.addMessage(message);
					return;
				}

				/*
				 * Otherwise increment the unread count.
				 */
				chatStore.setUnreadCount(state.unreadCount + 1);
			}
		)

		/* --------------------------------------------------------
		 * UPDATE
		 * -------------------------------------------------------- */

	.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "chat_messages"
			},
			(payload) => {
				const message = payload.new as ChatMessage;

				// FIX: updateMessage now takes (id, partialData)
				chatStore.updateMessage(message.message_id, message);
			}
		)

	/* --------------------------------------------------------
		 * DELETE
		 * -------------------------------------------------------- */

	.on(
			"postgres_changes",
			{
				event: "DELETE",
				schema: "public",
				table: "chat_messages"
			},
			(payload) => {
				const message = payload.old as ChatMessage;

				/*
				 * Supabase must expose message_id in the
				 * DELETE payload for this to work.
				 */
				if (!message?.message_id) {
					return;
				}

				chatStore.removeMessage(message.message_id);
			}
		)

		/* --------------------------------------------------------
		 * SUBSCRIBE
		 * -------------------------------------------------------- */

	.subscribe((status) => {
			console.info(`[Realtime:Chat] ${status}`);

			if (status === "CHANNEL_ERROR") {
				console.error("[Realtime:Chat] Channel error");
			}

			if (status === "TIMED_OUT") {
				console.error("[Realtime:Chat] Subscription timed out");
			}
	});
}

/* ============================================================
 * STOP REALTIME
 * ============================================================ */

/**
 * Stop realtime listener.
 */
export function stopChatRealtime(): void {
	if (!channel) {
		return;
	}

	const activeChannel = channel;
	channel = null;

	void supabase.removeChannel(activeChannel);

	console.info("[Realtime:Chat] Stopped");
}

/* ============================================================
 * STATUS
 * ============================================================ */

/**
 * Returns whether the chat realtime channel is active.
 */
export function isChatRealtimeActive(): boolean {
	return channel !== null;
}