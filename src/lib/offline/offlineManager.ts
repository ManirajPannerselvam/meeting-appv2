
/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/offlineManager.ts
 * ============================================================
 * PURPOSE
 *   Central Offline Manager
 *
 * DESCRIPTION
 *   Coordinates all offline modules.
 *
 * RESPONSIBILITIES
 *   ✓ Initialize IndexedDB
 *   ✓ Start background sync
 *   ✓ Start network monitoring / offline synchronization
 *   ✓ Force synchronization
 *   ✓ Shutdown offline services
 *
 * DOES NOT
 *   ✗ Contain business logic
 *   ✗ Access Supabase directly
 * ============================================================
 */

import { browser } from "$app/environment";

import { initializeOffline } from "./indexeddb";

import {
	startBackgroundSync,
	stopBackgroundSync
} from "./background";

import {
	startOfflineSync,
	stopOfflineSync,
	syncOfflineData
} from "./sync";

import {
	resetSyncStatus
} from "./syncStatus";

/* ============================================================
 * STATE
 * ============================================================ */

let initialized = false;

/* ============================================================
 * INITIALIZE
 * ============================================================ */

/**
 * Initialize Offline Module.
 *
 * Initialization is performed only once.
 *
 * The initialized flag is set only after all required
 * offline services have started successfully.
 */
export async function initializeOfflineManager(): Promise<void> {
	/*
	 * Offline services depend on browser APIs such as
	 * IndexedDB, navigator.onLine and window events.
	 *
	 * Never initialize them during SSR.
	 */
	if (!browser) {
		return;
	}

	if (initialized) {
		return;
	}

	try {
		/* --------------------------------------------------------
		 * Initialize IndexedDB
		 * -------------------------------------------------------- */

		await initializeOffline();

		/* --------------------------------------------------------
		 * Start network/offline synchronization
		 * -------------------------------------------------------- */

		startOfflineSync();

		/* --------------------------------------------------------
		 * Start background synchronization
		 * -------------------------------------------------------- */

		startBackgroundSync();

		/* --------------------------------------------------------
		 * Mark manager as initialized
		 * -------------------------------------------------------- */

		initialized = true;

		console.info(
			"[Offline] Manager Initialized"
		);
	} catch (error: unknown) {
		/*
		 * Initialization failed.
		 *
		 * Attempt to clean up anything that may have started
		 * before the failure occurred.
		 */

		try {
			stopOfflineSync();
		} catch (cleanupError) {
			console.error(
				"[Offline] Failed to stop offline sync after initialization error:",
				cleanupError
			);
		}

		try {
			stopBackgroundSync();
		} catch (cleanupError) {
			console.error(
				"[Offline] Failed to stop background sync after initialization error:",
				cleanupError
			);
		}

		initialized = false;

		console.error(
			"[Offline] Manager initialization failed:",
			error
		);

		throw error;
	}
}

/* ============================================================
 * SHUTDOWN
 * ============================================================ */

/**
 * Shutdown Offline Module.
 *
 * Stops every offline subsystem started by this manager.
 */
export function shutdownOfflineManager(): void {
	if (!initialized) {
		return;
	}

	try {
		/* --------------------------------------------------------
		 * Stop offline synchronization
		 * -------------------------------------------------------- */

		stopOfflineSync();

		/* --------------------------------------------------------
		 * Stop background synchronization
		 * -------------------------------------------------------- */

		stopBackgroundSync();

		/* --------------------------------------------------------
		 * Reset synchronization state
		 * -------------------------------------------------------- */

		resetSyncStatus();

		console.info(
			"[Offline] Manager Stopped"
		);
	} catch (error: unknown) {
		console.error(
			"[Offline] Manager shutdown failed:",
			error
		);

		throw error;
	} finally {
		/*
		 * Always reset the manager state, even if shutdown
		 * cleanup throws an exception.
		 */

		initialized = false;
	}
}

/* ============================================================
 * FORCE SYNC
 * ============================================================ */

/**
 * Force Synchronization.
 *
 * The manager must be initialized before synchronization
 * can be requested.
 */
export async function forceSync(): Promise<void> {
	if (!browser) {
		throw new Error(
			"Offline synchronization is only available in the browser."
		);
	}

	if (!initialized) {
		throw new Error(
			"Offline Manager is not initialized."
		);
	}

	await syncOfflineData();
}

/* ============================================================
 * STATUS
 * ============================================================ */

/**
 * Return whether the Offline Manager is initialized.
 */
export function isOfflineInitialized(): boolean {
	return initialized;
}
