/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/realtime/reports.ts
 * ============================================================
 * PURPOSE
 *   Daily Report realtime synchronization.
 *
 * DESCRIPTION
 *   Keeps reportsStore synchronized with Supabase Realtime.
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";

import { reportsStore } from "$lib/stores/reports";

import type {
	DailyReportRecord
} from "$lib/types/database";

let channel:
	ReturnType<typeof supabase.channel> | null = null;

/**
 * Start realtime listener
 */
export function startReportRealtime(): void {

	if (channel) {
		return;
	}

	channel = supabase

		.channel("daily_reports_realtime")

		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "daily_reports"
			},
			(payload) => {

				reportsStore.addReport(
					payload.new as DailyReportRecord
				);

			}
		)

		.on(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: "daily_reports"
			},
			(payload) => {

				reportsStore.updateReport(
					payload.new as DailyReportRecord
				);

			}
		)

		.on(
			"postgres_changes",
			{
				event: "DELETE",
				schema: "public",
				table: "daily_reports"
			},
			(payload) => {

				const report =
					payload.old as DailyReportRecord;

				reportsStore.removeReport(
					report.report_date,
					report.shift,
					report.template_id,
					report.user_id
				);

			}
		)

		.subscribe();

}

/**
 * Stop realtime listener
 */
export function stopReportRealtime(): void {

	if (!channel) {
		return;
	}

	supabase.removeChannel(channel);

	channel = null;

}