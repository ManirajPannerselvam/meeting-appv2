/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/init.ts
 * ============================================================
 * PURPOSE
 *   App bootstrap: DB, Auth, Offline
 * ============================================================
 */

import { authService } from "./services/auth.service";
import { startOfflineSync } from "./offline/sync";
import { initializeDatabase } from "./offline/indexeddb";

let initialized = false;

export async function initializeApplication(): Promise<void> {
	if (initialized) return;

	initialized = true;

	try {
		// 1. IndexedDB
		await initializeDatabase();

		// 2. Restore authentication from Supabase session
		await authService.restoreSession();

		// 3. Start offline sync listener
		startOfflineSync();

		console.info("Temple Operations Reporting System initialized.");
	} catch (error) {
		console.error("Application initialization failed:", error);
	}
}