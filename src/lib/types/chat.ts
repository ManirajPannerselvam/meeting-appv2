/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/types/chat.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Chat module shared types.
 *
 * DESCRIPTION
 *   Used by:
 *   - Temple Chat
 *   - Direct Chat
 *   - Group Chat
 *   - Meeting Chat
 *   - Realtime
 *   - Offline Queue
 *
 * DATABASE
 *   Chat Database
 * ============================================================
 */

import type {
	UUID,
	ISOTimestamp
} from './database';

/**
 * Room Types
 */
export type ChatRoomType =
	| 'direct'
	| 'group'
	| 'temple'
	| 'meeting'
	| 'announcement';

/**
 * Message Types
 */
export type ChatMessageType =
	| 'text'
	| 'image'
	| 'video'
	| 'audio'
	| 'document'
	| 'system';

/**
 * Delivery Status
 * ADDED: 'deleted' for soft delete
 */
export type MessageStatus =
	| 'queued'
	| 'sending'
	| 'sent'
	| 'delivered'
	| 'read'
	| 'deleted' // <-- ADDED for soft delete
	| 'failed';

/**
 * Chat Room
 */
export interface ChatRoom {
	room_id: UUID;
	room_name: string;
	room_type: ChatRoomType;
	created_by: UUID;
	created_at: ISOTimestamp;
	updated_at: ISOTimestamp;
	last_message?: string;
	last_message_at?: ISOTimestamp;
}

/**
 * Chat Message
 */
export interface ChatMessage {
	message_id: UUID;
	room_id: UUID;
	user_id: UUID; // <-- DB uses user_id
	message_type: ChatMessageType;
	content: string;
	status: MessageStatus;
	read_at?: ISOTimestamp | null; // <-- for mark as read
	created_at: ISOTimestamp;
	updated_at: ISOTimestamp;
}

/**
 * Chat Attachment
 */
export interface ChatAttachment {
	attachment_id: UUID;
	message_id: UUID;
	file_name: string;
	file_type: string;
	file_size: number;
	storage_path: string;
}

/**
 * Read Receipt
 */
export interface ChatReadReceipt {
	message_id: UUID;
	user_id: UUID;
	read_at: ISOTimestamp;
}

/**
 * User Presence
 */
export interface ChatPresence {
	user_id: UUID;
	is_online: boolean;
	last_seen: ISOTimestamp;
}

/**
 * Typing Indicator
 */
export interface TypingIndicator {
	room_id: UUID;
	user_id: UUID;
	is_typing: boolean;
}

/**
 * Offline Queue
 */
export interface ChatQueueItem {
	id: UUID;
	action: 'INSERT' | 'UPDATE' | 'DELETE';
	message: ChatMessage;
	created_at: ISOTimestamp;
	retry_count: number;
}