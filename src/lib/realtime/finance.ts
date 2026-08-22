/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/realtime/finance.ts
 * ============================================================
 * PURPOSE
 *   Finance realtime synchronization.
 *
 * DESCRIPTION
 *   Synchronizes finance transactions with Supabase Realtime.
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";

import { financeStore } from "$lib/stores/finance";

import type {
	FinanceTransaction
} from "$lib/types/database";

let channel:
	ReturnType<typeof supabase.channel> | null = null;

/**
 * Start finance realtime
 */
export function startFinanceRealtime(): void {

	if (channel) {
		return;
	}

	channel = supabase

		.channel("finance_transactions_realtime")

		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "finance_transactions"
			},
			(payload) => {

				financeStore.addTransaction(
					payload.new as FinanceTransaction
				);

				financeStore.recalculateSummary();

			}
		)

		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "finance_transactions"
			},
			(payload) => {

				financeStore.updateTransaction(
					payload.new as FinanceTransaction
				);

				financeStore.recalculateSummary();

			}
		)

		.on(
			"postgres_changes",
			{
				event: "DELETE",
				schema: "public",
				table: "finance_transactions"
			},
			(payload) => {

				const transaction =
					payload.old as FinanceTransaction;

				financeStore.removeTransaction(
					transaction.transaction_id
				);

				financeStore.recalculateSummary();

			}
		)

		.subscribe();

}

/**
 * Stop finance realtime
 */
export function stopFinanceRealtime(): void {

	if (!channel) {
		return;
	}

	supabase.removeChannel(channel);

	channel = null;

}