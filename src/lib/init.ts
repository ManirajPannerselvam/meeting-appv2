/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/init.ts
 * ============================================================
 * FIXED: No more VITE_SUPABASE_URL check - uses CHAT + TEMPLATES
 * ============================================================
 */

import { authService } from "./services/auth.service";
import { startOfflineSync } from "./offline/sync";
import { initializeDatabase } from "./offline/indexeddb";

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initializeApplication(): Promise<void> {
	if (initialized) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		try {
			console.info("[Init] Starting Temple Operations Reporting System...");

			// ✅ FIXED: Check YOUR actual env names
			const chatUrl = import.meta.env.PUBLIC_SUPABASE_CHAT_URL || import.meta.env.VITE_SUPABASE_CHAT_URL;
			const chatKey = import.meta.env.PUBLIC_SUPABASE_CHAT_ANON_KEY || import.meta.env.VITE_SUPABASE_CHAT_ANON_KEY;

			if (!chatUrl ||!chatKey) {
				console.warn("[Init] Supabase CHAT env missing, running in offline mode");
				// Don't throw - just continue offline
			}

			console.info("[Init] Initializing IndexedDB...");
			await initializeDatabase();
			console.info("[Init] IndexedDB OK");

			console.info("[Init] Restoring Auth Session...");
			try {
				if (chatUrl && chatKey) {
					await authService.restoreSession();
					console.info("[Init] Auth restored");
				}
			} catch (authError) {
				console.warn("[Init] Auth restore failed (offline or no session), continuing...", authError);
			}

			console.info("[Init] Starting Offline Sync...");
			try {
				await startOfflineSync();
				console.info("[Init] Offline Sync started");
			} catch (syncError) {
				console.warn("[Init] Offline Sync failed, continuing...", syncError);
			}

			initialized = true;
			console.info("Temple Operations Reporting System initialized.");

		} catch (error) {
			initialized = false;
			initPromise = null;
			console.error("Application initialization failed:", error);
			throw error;
		}
	})();

	return initPromise;
}

export function isAppInitialized(): boolean {
	return initialized;
}