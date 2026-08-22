/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/syncStatus.ts
 * ============================================================
 * PURPOSE
 *   Reactive synchronization status store.
 *
 * DESCRIPTION
 *   Provides application-wide synchronization state.
 *
 * DOES NOT
 *   ✗ Synchronize data
 *   ✗ Access IndexedDB
 *   ✗ Access Supabase
 *
 * RESPONSIBILITIES
 *   ✓ Track synchronization state
 *   ✓ Track pending/failed items
 *   ✓ Track synchronization progress
 *   ✓ Track last successful synchronization time
 * ============================================================
 */

import { writable, derived } from "svelte/store";

/* ============================================================
 * TYPES
 * ============================================================ */

export interface SyncStatus {
	isSyncing: boolean;
	lastSync: Date | null;
	pendingItems: number;
	failedItems: number;
	progress: number;
	message: string;
}

/* ============================================================
 * INITIAL STATE
 * ============================================================ */

const initialSyncStatus: SyncStatus = {
	isSyncing: false,
	lastSync: null,
	pendingItems: 0,
	failedItems: 0,
	progress: 0,
	message: "Idle"
};

/* ============================================================
 * MAIN STORE
 * ============================================================ */

export const syncStatus =
	writable<SyncStatus>({
		...initialSyncStatus
	});

/* ============================================================
 * DERIVED STORES
 * ============================================================ */

export const isSyncing =
	derived(
		syncStatus,
		($status) =>
			$status.isSyncing
	);

export const pendingItems =
	derived(
		syncStatus,
		($status) =>
			$status.pendingItems
	);

export const failedItems =
	derived(
		syncStatus,
		($status) =>
			$status.failedItems
	);

export const syncProgress =
	derived(
		syncStatus,
		($status) =>
			$status.progress
	);

export const lastSync =
	derived(
		syncStatus,
		($status) =>
			$status.lastSync
	);

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Keep progress within the valid 0-100 range.
 */
function normalizeProgress(
	progress: number
): number {
	if (!Number.isFinite(progress)) {
		return 0;
	}

	return Math.min(
		100,
		Math.max(0, progress)
	);
}

/**
 * Keep counters at zero or above.
 */
function normalizeCount(
	count: number
): number {
	if (!Number.isFinite(count)) {
		return 0;
	}

	return Math.max(
		0,
		Math.floor(count)
	);
}

/* ============================================================
 * START SYNCHRONIZATION
 * ============================================================ */

export function startSync(): void {
	syncStatus.update(
		(status) => ({
			...status,

			isSyncing: true,

			progress: 0,

			message:
				"Synchronizing..."
		})
	);
}

/* ============================================================
 * UPDATE PROGRESS
 * ============================================================ */

export function updateProgress(
	progress: number,
	message?: string
): void {
	syncStatus.update(
		(status) => ({
			...status,

			progress:
				normalizeProgress(
					progress
				),

			message:
				message ??
				status.message
		})
	);
}

/* ============================================================
 * UPDATE PENDING ITEMS
 * ============================================================ */

export function setPendingItems(
	count: number
): void {
	syncStatus.update(
		(status) => ({
			...status,

			pendingItems:
				normalizeCount(count)
		})
	);
}

/* ============================================================
 * UPDATE FAILED ITEMS
 * ============================================================ */

export function setFailedItems(
	count: number
): void {
	syncStatus.update(
		(status) => ({
			...status,

			failedItems:
				normalizeCount(count)
		})
	);
}

/* ============================================================
 * FINISH SYNCHRONIZATION
 * ============================================================ */

export function finishSync(
	message = "Synchronization Complete"
): void {
	syncStatus.update(
		(status) => ({
			...status,

			isSyncing: false,

			progress: 100,

			lastSync: new Date(),

			message
		})
	);
}

/* ============================================================
 * SYNCHRONIZATION FAILED
 * ============================================================ */

export function syncFailed(
	message = "Synchronization Failed"
): void {
	syncStatus.update(
		(status) => ({
			...status,

			isSyncing: false,

			message
		})
	);
}

/* ============================================================
 * RESET STATUS
 * ============================================================ */

export function resetSyncStatus(): void {
	syncStatus.set({
		...initialSyncStatus
	});
}