/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/background.ts
 * ============================================================
 * PURPOSE
 *   Background synchronization scheduler.
 *
 * DESCRIPTION
 *   - Starts automatic synchronization.
 *   - Periodically checks pending offline data.
 *   - Triggers sync when online.
 *
 * DOES NOT
 *   ✗ Access IndexedDB directly
 *   ✗ Access Supabase directly
 * ============================================================
 */

import { syncOfflineData } from "./sync";
import { isOnline } from "./network";

import { get } from "svelte/store";

const DEFAULT_INTERVAL = 60_000; // 1 minute

let timer: ReturnType<typeof setInterval> | null = null;

let running = false;

/**
 * Execute one sync cycle
 */
async function runSync(): Promise<void> {

	if (!get(isOnline)) {
		return;
	}

	try {

		await syncOfflineData();

	}
	catch (error) {

		console.error(
			"[Offline Sync]",
			error
		);

	}

}

/**
 * Start background sync
 */
export function startBackgroundSync(
	interval = DEFAULT_INTERVAL
): void {

	if (running) {
		return;
	}

	running = true;

	void runSync();

	timer = setInterval(() => {

		void runSync();

	}, interval);

}

/**
 * Stop background sync
 */
export function stopBackgroundSync(): void {

	if (timer) {

		clearInterval(timer);

		timer = null;

	}

	running = false;

}

/**
 * Restart background sync
 */
export function restartBackgroundSync(
	interval = DEFAULT_INTERVAL
): void {

	stopBackgroundSync();

	startBackgroundSync(interval);

}

/**
 * Check status
 */
export function isBackgroundSyncRunning(): boolean {

	return running;

}