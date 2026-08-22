/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/presence.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   User Presence Manager
 *
 * DESCRIPTION
 *   Handles:
 *     - Online users
 *     - Offline users
 *     - Last Seen
 *     - Join
 *     - Leave
 *     - Heartbeat
 *
 * NOTE
 *   Uses Supabase Realtime Presence.
 * ============================================================
 */

import { supabase } from './client';

export interface PresenceUser {
	userId: string;
	name?: string;
	lastSeen: string;
	online: boolean;
}

class PresenceService {

	private channel = supabase.channel('online-users');

	/**
	 * Connect Presence
	 */
	async connect(user: PresenceUser) {

		this.channel
			.on('presence', { event: 'sync' }, () => {})
			.on('presence', { event: 'join' }, () => {})
			.on('presence', { event: 'leave' }, () => {});

		await this.channel.subscribe(async (status) => {

			if (status !== 'SUBSCRIBED') return;

			await this.channel.track({
				userId: user.userId,
				name: user.name,
				lastSeen: new Date().toISOString(),
				online: true
			});

		});

	}

	/**
	 * Update heartbeat
	 */
	async heartbeat() {

		await this.channel.track({
			lastSeen: new Date().toISOString(),
			online: true
		});

	}

	/**
	 * Disconnect
	 */
	async disconnect() {

		try {

			await this.channel.untrack();

		} finally {

			await supabase.removeChannel(this.channel);

		}

	}

	/**
	 * Current online users
	 */
	getOnlineUsers() {

		return this.channel.presenceState<PresenceUser>();

	}

}

export const presenceService = new PresenceService();

export default presenceService;