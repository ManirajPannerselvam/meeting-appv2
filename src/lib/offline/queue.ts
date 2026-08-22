/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/queue.ts
 * ============================================================
 * PURPOSE
 *   Offline Queue Manager
 *
 * DESCRIPTION
 *   Generic queue manager for:
 *     • Reports
 *     • Chat
 *     • Future modules
 *
 * NOTE
 *   No Supabase logic.
 *   No synchronization logic.
 * ============================================================
 */

import {
	put,
	getAll,
	remove,
	clear,
	count,
	exists,
	type StoreName
} from "./indexeddb";

export interface OfflineQueueItem<T = unknown> {
	id: string;
	type: string;
	action: "INSERT" | "UPDATE" | "DELETE";
	payload: T;
	createdAt: string;
	retryCount: number;
	lastError?: string;
}

const MAX_RETRY_COUNT = 5; // Part 5

/**
 * Add item to queue - Part 1
 */
export async function enqueue<T>(
	store: StoreName,
	item: OfflineQueueItem<T>
): Promise<void> {
	if (await exists(store, item.id)) {
		await remove(store, item.id);
	}

	item.retryCount ??= 0;
	item.createdAt ??= new Date().toISOString();

	await put(store, item);
}

/**
 * Get pending queue - Part 2
 */
export async function getQueue<T>(
	store: StoreName
): Promise<OfflineQueueItem<T>[]> {
	const queue = await getAll<OfflineQueueItem<T>>(store);

	return queue.sort(
		(a, b) =>
			new Date(a.createdAt).getTime() -
			new Date(b.createdAt).getTime()
	);
}

/**
 * Get oldest queue item - Part 3
 */
export async function peek<T>(
	store: StoreName
): Promise<OfflineQueueItem<T> | null> {
	const queue = await getQueue<T>(store);
	return queue.at(0) ?? null;
}

/**
 * Remove processed item
 */
export async function dequeue(
	store: StoreName,
	id: string
): Promise<void> {
	await remove(store, id);
}

/**
 * Increase retry count - Part 4
 */
export async function incrementRetry<T>(
	store: StoreName,
	item: OfflineQueueItem<T>,
	error?: string
): Promise<void> {
	const updated: OfflineQueueItem<T> = {
		...item,
		retryCount: item.retryCount + 1,
		lastError: error
	};

	await put(store, updated);
}

/**
 * Retry limit reached - Part 5
 */
export function retryLimitReached(
	item: OfflineQueueItem
): boolean {
	return item.retryCount >= MAX_RETRY_COUNT;
}

/**
 * Failed queue items - Part 6
 */
export async function getFailedQueue<T>(
	store: StoreName
): Promise<OfflineQueueItem<T>[]> {
	const queue = await getQueue<T>(store);
	return queue.filter(retryLimitReached);
}

/**
 * Remove all failed items - Part 7
 */
export async function removeFailedQueue(
	store: StoreName
): Promise<void> {
	const failed = await getFailedQueue(store);
	for (const item of failed) {
		await dequeue(store, item.id);
	}
}

/**
 * Queue size
 */
export async function queueSize(
	store: StoreName
): Promise<number> {
	return count(store);
}

/**
 * Pending items available
 */
export async function hasPendingItems(
	store: StoreName
): Promise<boolean> {
	return (await queueSize(store)) > 0;
}

/**
 * Clear queue
 */
export async function clearQueue(
	store: StoreName
): Promise<void> {
	await clear(store);
}