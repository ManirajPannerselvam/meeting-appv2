import { supabase } from "$lib/supabase/client";
import { reportsStore } from "$lib/stores/reports";
import type { RealtimeChannel } from "@supabase/supabase-js";

let channel: RealtimeChannel | null = null;

export function startReportRealtime() {
	if (channel) return;

	channel = supabase
	.channel("reports-changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "daily_reports" },
			(payload) => {
				const { eventType, new: newRecord, old: oldRecord } = payload;

				if (eventType === "INSERT") {
					reportsStore.addReport(newRecord as any);
				}
				if (eventType === "UPDATE") {
					reportsStore.updateReport(newRecord as any);
				}
				if (eventType === "DELETE") {
					reportsStore.removeReport(
						oldRecord.report_date,
						oldRecord.shift,
						oldRecord.template_id,
						oldRecord.user_id
					);
				}
			}
	)
		.subscribe();
}

export function stopReportRealtime() {
	if (channel) {
		supabase.removeChannel(channel);
		channel = null;
	}
}