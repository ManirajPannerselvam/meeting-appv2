/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/report.service.ts
 * ============================================================
 * PURPOSE
 *   Report CRUD service with Supabase + Store sync
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { reportsStore } from "$lib/stores/reports";

import type {
	DailyReportRecord,
	UUID,
	ISODate,
	Shift
} from "$lib/types/database";

class ReportService {

	private updateReportsStore(
		reports: DailyReportRecord[]
	): void {
		reportsStore.setReports(reports);
	}

	// Part 1: Common error handler
	private handleError(
		error: unknown,
		message = "Report service error"
	): never {
		console.error(message, error);
		reportsStore.setError(message);
		throw error instanceof Error
			? error
			: new Error(String(error));
	}

	// Part 2: Updated
	async loadReports(): Promise<DailyReportRecord[]> {
		reportsStore.setLoading(true);
		try {
			const { data, error } = await supabase
				.from("daily_reports")
				.select("*")
				.order("report_date", { ascending: false });

			if (error) throw error;

			const reports = (data ?? []) as DailyReportRecord[];
			this.updateReportsStore(reports);
			return reports;
		}
		catch (error) {
			this.handleError(error, "Failed to load reports");
		}
		finally {
			reportsStore.setLoading(false);
	}
	}

	// Part 3: Updated
	async loadReportsByDate(
		reportDate: ISODate
	): Promise<DailyReportRecord[]> {
		try {
			const { data, error } = await supabase
				.from("daily_reports")
				.select("*")
				.eq("report_date", reportDate)
				.order("shift");

			if (error) throw error;

			return (data ?? []) as DailyReportRecord[];
		}
		catch (error) {
			this.handleError(error, "Failed to load reports by date");
		}
	}

	// Part 4: Updated
	async loadReportsByUser(
		userId: UUID
	): Promise<DailyReportRecord[]> {
		try {
			const { data, error } = await supabase
				.from("daily_reports")
				.select("*")
				.eq("user_id", userId)
				.order("report_date", { ascending: false });

			if (error) throw error;

			return (data ?? []) as DailyReportRecord[];
		}
		catch (error) {
			this.handleError(error, "Failed to load user reports");
		}
	}

	async getReport(
		reportDate: ISODate,
		shift: Shift,
		templateId: UUID,
		userId: UUID
	): Promise<DailyReportRecord | null> {
		try {
			const { data, error } = await supabase
				.from("daily_reports")
				.select("*")
				.eq("report_date", reportDate)
				.eq("shift", shift)
				.eq("template_id", templateId)
				.eq("user_id", userId)
				.maybeSingle();

			if (error) throw error;

			return data as DailyReportRecord | null;
	}
		catch (error) {
			this.handleError(error, "Failed to get report");
	}
	}

	// Part 5: Improved
	async saveReport(
		report: DailyReportRecord
	): Promise<DailyReportRecord[]> {
		try {
			const { error } = await supabase
				.from("daily_reports")
				.upsert(report, {
					onConflict: "report_date,shift,template_id,user_id"
				});

			if (error) throw error;

			return await this.loadReports();
	}
		catch (error) {
			this.handleError(error, "Failed to save report");
		}
	}

	// Part 6: Improved
	async deleteReport(
		reportDate: ISODate,
	shift: Shift,
		templateId: UUID,
		userId: UUID
	): Promise<DailyReportRecord[]> {
		try {
			const { error } = await supabase
				.from("daily_reports")
				.delete()
				.eq("report_date", reportDate)
				.eq("shift", shift)
				.eq("template_id", templateId)
				.eq("user_id", userId);

			if (error) throw error;

			return await this.loadReports();
	}
		catch (error) {
			this.handleError(error, "Failed to delete report");
		}
	}

	// Part 7: Improved
	async refresh(): Promise<void> {
		try {
			await this.loadReports();
	}
		catch (error) {
			this.handleError(error, "Failed to refresh reports");
		}
	}
}

export const reportService = new ReportService();

// Keep default for backward compat with sync.ts
export default reportService;