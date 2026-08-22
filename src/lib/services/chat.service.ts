/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/chat.service.ts
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { chatStore } from "$lib/stores/chat";

import type {
	ChatMessage,
	ChatRoom,
	MessageStatus
} from "$lib/types/chat";

export class ChatService {
	private subscription: ReturnType<typeof supabase.channel> | null = null;

	private handleError(
		error: unknown,
		message: string
	): void {
		console.error(message, error);
		chatStore.setError(message);
	}

	private handleSuccess(message: string): void {
		console.info(message);
	}

	/**
	 * Load all chat rooms
	 */
	async loadRooms(): Promise<void> {
		try {
			chatStore.setLoading(true);

			const { data, error } = await supabase
				.from("chat_rooms")
				.select("*")
				.order("last_message_at", { ascending: false });

			if (error) throw error;

			chatStore.setRooms((data ?? []) as ChatRoom[]);
	} catch (error) {
			this.handleError(error, "Failed to load chat rooms");
	} finally {
			chatStore.setLoading(false);
		}
	}

	/**
	 * Load messages for one room
	 */
	async loadMessages(roomId: string): Promise<void> {
		try {
			chatStore.setLoading(true);

			const { data, error } = await supabase
				.from("chat_messages")
				.select("*")
				.eq("room_id", roomId)
				.order("created_at", { ascending: true });

			if (error) throw error;

			chatStore.setMessages((data ?? []) as ChatMessage[]);
	} catch (error) {
			this.handleError(error, "Failed to load messages");
	} finally {
			chatStore.setLoading(false);
	}
	}

	/**
	 * Delete message - soft delete
	 */
	async deleteMessage(
		messageId: string,
	roomId: string
	): Promise<void> {
		try {
			const updatedAt = new Date().toISOString();

			const { error } = await supabase
				.from("chat_messages")
				.update({
					status: "deleted" as MessageStatus, // FIX: lowercase
					content: "This message was deleted",
					updated_at: updatedAt
				})
				.eq("message_id", messageId)
				.eq("room_id", roomId);

			if (error) throw error;

			chatStore.updateMessage(messageId, {
				status: "deleted", // FIX: lowercase
				content: "This message was deleted",
				updated_at: updatedAt
			});

			await this.loadRooms();
			this.handleSuccess("Message deleted");
		} catch (error) {
			this.handleError(error, "Failed to delete message");
	}
	}

	/**
	 * Update message delivery/read status
	 */
	async updateStatus(
		messageId: string,
		status: MessageStatus
	): Promise<void> {
		try {
			const updatedAt = new Date().toISOString();

			const { error } = await supabase
				.from("chat_messages")
				.update({ status, updated_at: updatedAt })
				.eq("message_id", messageId);

			if (error) throw error;

			chatStore.updateMessage(messageId, { status, updated_at: updatedAt });
	} catch (error) {
			this.handleError(error, "Failed to update message status");
	}
	}

	/**
	 * Mark messages in a room as read
	 */
	async markRoomAsRead(roomId: string, userId: string): Promise<void> {
		try {
			const readAt = new Date().toISOString();

			const { error } = await supabase
				.from("chat_messages")
				.update({
					status: "read", // FIX: lowercase
					read_at: readAt,
					updated_at: readAt
				})
				.eq("room_id", roomId)
				.neq("user_id", userId) // FIX: user_id not sender_id
				.neq("status", "read"); // FIX: lowercase

			if (error) throw error;

			chatStore.markRoomAsRead(roomId);
	} catch (error) {
			this.handleError(error, "Failed to mark messages as read");
		}
	}

	/**
	 * Refresh rooms and optionally messages
	 */
	async refresh(roomId?: string): Promise<void> {
		try {
			await this.loadRooms();
			if (roomId) await this.loadMessages(roomId);
		} catch (error) {
			this.handleError(error, "Failed to refresh chat");
		}
	}

	/**
	 * Remove realtime subscription
	 */
	unsubscribe(): void {
		if (this.subscription) {
			supabase.removeChannel(this.subscription);
			this.subscription = null;
	}
	}

	/**
	 * Destroy service resources
	 */
	destroy(): void {
		this.unsubscribe();
	}
}

export const chatService = new ChatService();