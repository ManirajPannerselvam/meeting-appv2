/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/stores/reports.ts
 * ============================================================
 */

import { writable, get, derived } from 'svelte/store';

import type {
	DailyReportRecord,
	TemplateRecord
} from '$lib/types/database';

import type {
	ReportFilter
} from '$lib/types/report';

export interface ReportsState {
	templates: TemplateRecord[];
	reports: DailyReportRecord[];
	currentReport: DailyReportRecord | null;
	selectedReport: DailyReportRecord | null;
	filter: ReportFilter;
	loading: boolean;
	error: string | null;
}

const initialState: ReportsState = {
	templates: [],
	reports: [],
	currentReport: null,
	selectedReport: null,
	filter: {},
	loading: false,
	error: null
};

function createReportsStore() {
	const { subscribe, set, update } = writable<ReportsState>(initialState);

	const store = {
		subscribe,
		setState(state: ReportsState): void { set(state) },
		getState(): ReportsState {
			let current!: ReportsState;
			const unsubscribe = subscribe((value) => { current = value; });
			unsubscribe();
			return current;
		},
		reset(): void { set(initialState) },
		setError(error: string | null): void { update((state) => ({ ...state, error })) },
		setTemplates(templates: TemplateRecord[]): void { update((state) => ({ ...state, templates })) },
		setReports(reports: DailyReportRecord[]): void { update((state) => ({ ...state, reports })) },
		clearReports(): void { update((state) => ({ ...state, reports: [] })) },
		addReport(report: DailyReportRecord): void { update((state) => ({ ...state, reports: [report, ...state.reports] })) },
		updateReport(report: DailyReportRecord): void {
			update((state) => ({
				...state,
				reports: state.reports.map((item) =>
					item.report_date === report.report_date &&
					item.shift === report.shift &&
					item.template_id === report.template_id &&
					item.user_id === report.user_id ? report : item
				)
			}));
		},
		removeReport(reportDate: string, shift: string, templateId: string, userId: string): void {
			update((state) => ({
				...state,
				reports: state.reports.filter(
					(item) => !(item.report_date === reportDate && item.shift === shift && item.template_id === templateId && item.user_id === userId)
				)
			}));
		},
		setSelectedReport(report: DailyReportRecord | null): void { update((state) => ({ ...state, selectedReport: report })) },
		clearSelectedReport(): void { update((state) => ({ ...state, selectedReport: null })) },
		setCurrentReport(report: DailyReportRecord | null): void { update((state) => ({ ...state, currentReport: report })) },
		clearCurrentReport(): void { update((state) => ({ ...state, currentReport: null })) },
		setFilter(filter: ReportFilter): void { update((state) => ({ ...state, filter })) },
		setLoading(loading: boolean): void { update((state) => ({ ...state, loading })) }
	};

	return store;
}

export const reportsStore = createReportsStore();

/**
 * Filtered reports based on filter state
 * FIX: Use snake_case to match DB + ReportFilter type
 */
export const filteredReports = derived(
	reportsStore,
	($reports) => {
		return $reports.reports.filter((report) => {
			if ($reports.filter.report_date && report.report_date !== $reports.filter.report_date) {
				return false;
			}
			if ($reports.filter.shift && report.shift !== $reports.filter.shift) {
				return false;
			}
			if ($reports.filter.template_id && report.template_id !== $reports.filter.template_id) {
				return false;
			}
			if ($reports.filter.user_id && report.user_id !== $reports.filter.user_id) {
				return false;
			}
			return true;
	});
	}
);

/**
 * Report count
 */
export const reportCount = derived(reportsStore, ($reports) => $reports.reports.length);

/**
 * Template count
 */
export const templateCount = derived(reportsStore, ($reports) => $reports.templates.length);