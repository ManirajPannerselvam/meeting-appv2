/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/dashboard.service.ts
 * ============================================================
 */

import { dashboard } from "$lib/stores/dashboard";
import { reportService } from "./report.service";

class DashboardService {
	/**
	 * Load dashboard data
	 */
	async loadDashboard(): Promise<void> {
		dashboard.setLoading(true);
		dashboard.setError(null);

		try {
			const reports = await reportService.loadReports();

			// TODO
			// const meetings = await meetingService.loadMeetings();
			// const actions = await actionService.loadActions();

			dashboard.setReports(reports);
		} catch (error) {
			console.error("Dashboard load failed:", error);

			dashboard.setError(
				error instanceof Error
					? error.message
					: "Failed to load dashboard"
			);
		} finally {
			dashboard.setLoading(false);
		}
	}

	/**
	 * Auto refresh every minute
	 */
	startDashboardRefresh(): () => void {
		void this.loadDashboard();

		const timer = window.setInterval(() => {
			void this.loadDashboard();
		}, 60000);

		return () => {
			clearInterval(timer);
		};
	}
}

export const dashboardService = new DashboardService();

export default dashboardService;