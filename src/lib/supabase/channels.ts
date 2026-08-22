/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/channels.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Centralized Realtime Channel Manager.
 *
 * DESCRIPTION
 *   - Create channels
 *   - Cache channels
 *   - Reuse channels
 *   - Remove channels
 *   - Remove all channels
 *
 * NOTE
 *   Every realtime feature should obtain channels
 *   from this manager instead of calling
 *   supabase.channel() directly.
 * ============================================================
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';

class ChannelManager {

	private channels = new Map<string, RealtimeChannel>();

	/**
	 * Get or create channel
	 */
	get(name: string): RealtimeChannel {

		const existing = this.channels.get(name);

		if (existing) {
			return existing;
		}

		const channel = supabase.channel(name);

		this.channels.set(name, channel);

		return channel;

	}

	/**
	 * Channel exists
	 */
	has(name: string): boolean {

		return this.channels.has(name);

	}

	/**
	 * Number of active channels
	 */
	count(): number {

		return this.channels.size;

	}

	/**
	 * Channel names
	 */
	names(): string[] {

		return [...this.channels.keys()];

	}

	/**
	 * Remove one channel
	 */
	async remove(name: string): Promise<void> {

		const channel = this.channels.get(name);

		if (!channel) return;

		await supabase.removeChannel(channel);

		this.channels.delete(name);

	}

	/**
	 * Remove all channels
	 */
	async removeAll(): Promise<void> {

		for (const channel of this.channels.values()) {

			await supabase.removeChannel(channel);

		}

		this.channels.clear();

	}

	/**
	 * Reconnect all channels
	 */
	async reconnect(): Promise<void> {

		const names = [...this.channels.keys()];

		await this.removeAll();

		for (const name of names) {

			this.get(name).subscribe();

		}

	}

}

export const channelManager = new ChannelManager();

export default channelManager;