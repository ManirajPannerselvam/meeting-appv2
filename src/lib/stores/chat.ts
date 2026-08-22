/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/stores/chat.ts
 * ============================================================
 */

import { writable, get, derived } from 'svelte/store';

import type {
	ChatMessage,
	ChatRoom,
	TypingIndicator,
	MessageStatus
} from '$lib/types/chat';

export interface ChatState {
	rooms: ChatRoom[];
	activeRoom: ChatRoom | null;
	messages: ChatMessage[];
	selectedMessage: ChatMessage | null;
	typingUsers: TypingIndicator[];
	loading: boolean;
	error: string | null;
	unreadCount: number;
}

const initialState: ChatState = {
	rooms: [],
	activeRoom: null,
	messages: [],
	selectedMessage: null,
	typingUsers: [],
	loading: false,
	error: null,
	unreadCount: 0
};

function createChatStore() {
	const { subscribe, set, update } = writable<ChatState>(initialState);

	const store = {
	subscribe,

		setState(state: ChatState): void {
			set(state);
	},

		getState(): ChatState {
			return get(chatStore);
		},

		reset(): void {
			set(initialState);
		},

		setError(error: string | null): void {
			update((state) => ({ ...state, error }));
	},

		setRooms(rooms: ChatRoom[]): void {
			update((state) => ({ ...state, rooms }));
	},

		setActiveRoom(room: ChatRoom | null): void {
			update((state) => ({
				...state,
				activeRoom: room,
				messages: [],
				typingUsers: []
			}));
	},

		setMessages(messages: ChatMessage[]): void {
			update((state) => ({ ...state, messages }));
		},

		clearMessages(): void {
			update((state) => ({ ...state, messages: [] }));
		},

		addMessage(message: ChatMessage): void {
			update((state) => {
				if (state.messages.some((m) => m.message_id === message.message_id)) {
					return state;
				}
				return {
					...state,
					messages: [...state.messages, message]
				};
			});
		},

		updateMessage(messageId: string, data: Partial<ChatMessage>): void {
			update((state) => ({
				...state,
				messages: state.messages.map((m) =>
					m.message_id === messageId ? { ...m, ...data } : m
				)
			}));
	},

		removeMessage(messageId: string): void {
			update((state) => ({
				...state,
				messages: state.messages.filter((m) => m.message_id !== messageId)
			}));
	},

		setSelectedMessage(message: ChatMessage | null): void {
			update((state) => ({ ...state, selectedMessage: message }));
		},

		clearSelectedMessage(): void {
			update((state) => ({ ...state, selectedMessage: null }));
	},

		setTypingUsers(users: TypingIndicator[]): void {
			update((state) => ({ ...state, typingUsers: users }));
		},

		setLoading(loading: boolean): void {
			update((state) => ({ ...state, loading }));
		},

		setUnreadCount(count: number): void {
			update((state) => ({ ...state, unreadCount: count }));
		},

		/**
		 * Mark all messages in a room as read
		 */
		markRoomAsRead(roomId: string): void {
			update((state) => ({
				...state,
				messages: state.messages.map((m) =>
					m.room_id === roomId && m.status !== 'read' // FIX: lowercase
						? { ...m, status: 'read' as MessageStatus, read_at: new Date().toISOString() } // also set read_at
						: m
				)
			}));
		}
	};

	return store;
}

export const chatStore = createChatStore();

export const roomCount = derived(chatStore, ($chat) => $chat.rooms.length);
export const messageCount = derived(chatStore, ($chat) => $chat.messages.length);
export const activeTypingUsers = derived(chatStore, ($chat) => $chat.typingUsers);
export const unreadMessages = derived(chatStore, ($chat) => $chat.unreadCount);