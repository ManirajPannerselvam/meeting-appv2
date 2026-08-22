/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/base.service.ts
 * ============================================================
 * PURPOSE
 *   Base service for all modules.
 *
 * DESCRIPTION
 *   Provides:
 *     ✓ Online/Offline detection
 *     ✓ Queue integration
 *     ✓ Common CRUD helpers
 *
 * Every service should extend this class.
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { enqueue } from "$lib/offline/queue";
import { STORES } from "$lib/offline/indexeddb";

/* ============================================================
 * TYPES
 * ============================================================ */

export type QueueAction =
	| "INSERT"
	| "UPDATE"
	| "DELETE";

export interface QueueRecord<TPayload> {
	id: string;
	type: string;
	action: QueueAction;
	payload: TPayload;
	createdAt: string;
	retryCount: number;
}

/* ============================================================
 * BASE SERVICE
 * ============================================================ */

export abstract class BaseService<T extends Record<string, any>> {
	constructor(
		protected table: string,
		protected queueStore: typeof STORES[keyof typeof STORES]
	) {}

	/* ==========================================================
	 * ONLINE / OFFLINE
	 * ========================================================== */

	protected isOnline(): boolean {
		if (typeof navigator === "undefined") {
			return true;
		}
		return navigator.onLine;
	}

	/* ==========================================================
	 * QUEUE OPERATION
	 * ========================================================== */

	protected async queueOperation<TPayload>(
		action: QueueAction,
		id: string,
		payload: TPayload
	): Promise<void> {
		await enqueue(this.queueStore, {
			id,
			type: this.table,
			action,
			payload,
			createdAt: new Date().toISOString(),
			retryCount: 0
	});
	}

	/* ==========================================================
	 * ONLINE INSERT
	 * ========================================================== */

	protected async insertOnline(
		payload: T
	): Promise<void> {
		const { error } = await supabase
			.from(this.table)
			.insert(payload as any); // CAST: base class can't know exact table type

		if (error) {
			throw error;
	}
	}

	/* ==========================================================
	 * ONLINE UPDATE
	 * ========================================================== */

	protected async updateOnline(
		id: string,
		payload: Partial<T>
	): Promise<void> {
		const { error } = await supabase
			.from(this.table)
			.update(payload as any) // CAST: base class can't know exact table type
			.eq("id", id);

		if (error) {
			throw error;
		}
	}

	/* ==========================================================
	 * ONLINE DELETE
	 * ========================================================== */

	protected async deleteOnline(
		id: string
	): Promise<void> {
		const { error } = await supabase
			.from(this.table)
			.delete()
			.eq("id", id);

		if (error) {
			throw error;
	}
	}

	/* ==========================================================
	 * SAVE
	 * ========================================================== */

	async save(
		record: T & { id: string }
	): Promise<void> {
		if (this.isOnline()) {
			await this.insertOnline(record);
			return;
		}

		await this.queueOperation(
			"INSERT",
			record.id,
			record
		);
	}

	/* ==========================================================
	 * UPDATE
	 * ========================================================== */

	async update(
		id: string,
		record: Partial<T>
	): Promise<void> {
		if (this.isOnline()) {
			await this.updateOnline(id, record);
			return;
		}

		await this.queueOperation(
			"UPDATE",
			id,
			record
		);
	}

	/* ==========================================================
	 * DELETE
	 * ========================================================== */

	async delete(
		id: string
	): Promise<void> {
		if (this.isOnline()) {
			await this.deleteOnline(id);
			return;
		}

		await this.queueOperation(
			"DELETE",
			id,
			{} as T
		);
	}
}