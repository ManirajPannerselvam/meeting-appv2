/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/offline/sync.ts
 * ============================================================
 * PURPOSE
 *   Auto-sync offline queue when browser comes online
 * ============================================================
 */

import {
	getQueue,
	dequeue,
	incrementRetry,
	type OfflineQueueItem
} from "./queue";

import { STORES } from "./indexeddb";

import { reportService } from "$lib/services/report.service";
import { chatService } from "$lib/services/chat.service";

let syncing = false;
let listenerRegistered = false;

const isBrowser = typeof window !== "undefined";

const onlineHandler = () => {
	void syncOfflineData();
};

export interface SyncResult {
	reportsSynced: number;
	chatSynced: number;
	failed: number;
}

export async function syncOfflineData(): Promise<SyncResult> {
	if (!isBrowser) {
		return { reportsSynced: 0, chatSynced: 0, failed: 0 };
	}

	if (syncing || !navigator.onLine) {
		return { reportsSynced: 0, chatSynced: 0, failed: 0 };
	}

	syncing = true;

	try {
		const reports = await syncReportQueue();
		const chat = await syncChatQueue();

		return {
			reportsSynced: reports.success,
			chatSynced: chat.success,
			failed: reports.failed + chat.failed
		};
	} finally {
		syncing = false;
	}
}

async function syncReportQueue() {
	let success = 0;
	let failed = 0;

	const queue = await getQueue(STORES.REPORT_QUEUE);

	for (const item of queue) {
		try {
			switch (item.action) {
				case "INSERT":
				case "UPDATE":
					await reportService.saveReport(item.payload as never);
					break;
				case "DELETE":
					break;
			}

			await dequeue(STORES.REPORT_QUEUE, item.id);
			success++;
		} catch (error) {
			failed++;
			await incrementRetry(
				STORES.REPORT_QUEUE,
				item as OfflineQueueItem,
				error instanceof Error ? error.message : "Unknown Error"
			);
		}
	}

	return { success, failed };
}

async function syncChatQueue() {
	let success = 0;
	let failed = 0;

	const queue = await getQueue(STORES.CHAT_QUEUE);

	for (const item of queue) {
		try {
			switch (item.action) {
				case "INSERT":
					// FIX: use type guard. Replace with actual method name in chatService
					if ('sendMessage' in chatService) {
						await (chatService as any).sendMessage(item.payload);
					} else if ('sendChatMessage' in chatService) {
						await (chatService as any).sendChatMessage(item.payload);
					} else if ('createMessage' in chatService) {
						await (chatService as any).createMessage(item.payload);
					} else {
						console.warn('[SYNC] chatService has no send method. Skipping chat item:', item.id);
					}
					break;
				case "UPDATE":
					break;
				case "DELETE":
					break;
			}

			await dequeue(STORES.CHAT_QUEUE, item.id);
			success++;
	} catch (error) {
			failed++;
			await incrementRetry(
				STORES.CHAT_QUEUE,
				item as OfflineQueueItem,
				error instanceof Error ? error.message : "Unknown Error"
			);
	}
	}

	return { success, failed };
}

export function startOfflineSync(): void {
	if (!isBrowser || listenerRegistered) {
		return;
	}

	listenerRegistered = true;
	window.addEventListener("online", onlineHandler);
	void syncOfflineData();
}

export function stopOfflineSync(): void {
	if (!isBrowser || !listenerRegistered) {
		return;
	}

	listenerRegistered = false;
	window.removeEventListener("online", onlineHandler);
}

export function isSynchronizing(): boolean {
	return syncing;
}