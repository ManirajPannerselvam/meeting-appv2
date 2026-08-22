/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/realtime.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Centralized Supabase Realtime manager.
 *
 * DESCRIPTION
 *   Handles:
 *     - Chat messages
 *     - Daily reports
 *     - User presence
 *     - Typing indicators
 *     - Automatic reconnect
 *
 * NOTE
 *   All realtime subscriptions should be created here.
 *   Components must never subscribe directly.
 * ============================================================
 */

import { supabase } from './client';

import { chatStore } from '$lib/stores/chat';
import { reportsStore } from '$lib/stores/reports';

import type {
	ChatMessage
} from '$lib/types/chat';

import type {
	DailyReportRecord
} from '$lib/types/database';

class RealtimeService {

	private channels = new Map<string, ReturnType<typeof supabase.channel>>();

	/**
	 * Subscribe to room messages
	 */
	subscribeChat(roomId: string) {

		const key = `chat:${roomId}`;

		if (this.channels.has(key)) {
			return;
		}

		const channel = supabase
			.channel(key)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'chat_messages',
					filter: `room_id=eq.${roomId}`
				},
				(payload) => {

					if (payload.eventType === 'INSERT') {

						chatStore.addMessage(
							payload.new as ChatMessage
						);

					}

				}
			)
			.subscribe();

		this.channels.set(key, channel);

	}

	/**
	 * Subscribe reports
	 */
	subscribeReports() {

		const key = 'reports';

		if (this.channels.has(key)) {
			return;
		}

		const channel = supabase
			.channel(key)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'daily_reports'
				},
				() => {

					// Reload reports
					// reportService.loadReports()

				}
			)
			.subscribe();

		this.channels.set(key, channel);

	}

	/**
	 * User Presence
	 */
	subscribePresence(roomId: string) {

		const key = `presence:${roomId}`;

		if (this.channels.has(key)) {
			return;
		}

		const channel = supabase
			.channel(key)
			.on(
				'presence',
				{
					event: 'sync'
				},
				() => {

					// Future implementation

				}
			)
			.subscribe();

		this.channels.set(key, channel);

	}

	/**
	 * Typing indicator
	 */
	subscribeTyping(roomId: string) {

		const key = `typing:${roomId}`;

		if (this.channels.has(key)) {
			return;
		}

		const channel = supabase
			.channel(key)
			.on(
				'broadcast',
				{
					event: 'typing'
				},
				() => {

					// Future implementation

				}
			)
			.subscribe();

		this.channels.set(key, channel);

	}

	/**
	 * Broadcast typing
	 */
	async sendTyping(
		roomId: string,
		userId: string,
		isTyping: boolean
	) {

		const key = `typing:${roomId}`;

		const channel = this.channels.get(key);

		if (!channel) return;

		await channel.send({

			type: 'broadcast',

			event: 'typing',

			payload: {

				userId,

				isTyping

			}

		});

	}

	/**
	 * Unsubscribe one channel
	 */
	async unsubscribe(key: string) {

		const channel = this.channels.get(key);

		if (!channel) return;

		await supabase.removeChannel(channel);

		this.channels.delete(key);

	}

	/**
	 * Remove all subscriptions
	 */
	async unsubscribeAll() {

		for (const [, channel] of this.channels) {

			await supabase.removeChannel(channel);

		}

		this.channels.clear();

	}
}

export const realtimeService = new RealtimeService();

export default realtimeService;