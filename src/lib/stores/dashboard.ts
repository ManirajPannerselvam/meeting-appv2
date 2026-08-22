import { writable } from "svelte/store";
import { browser } from "$app/environment";

import {
	getMeetings,
	getProductionReport,
	getActions,
	getAnalytics
} from "$lib/services/database";

export interface DashboardState {
	meetings: any[];
	production: any[];
	actions: any[];
	analytics: {
		totalMeetings: number;
		totalContacts: number;
		totalGroups: number;
		totalMessages: number;
	};
	loading: boolean;
	error: string | null;
	lastRefresh: Date | null;
}

const initialState: DashboardState = {
	meetings: [],
	production: [],
	actions: [],
	analytics: {
		totalMeetings: 0,
		totalContacts: 0,
		totalGroups: 0,
		totalMessages: 0
	},
	loading: true,
	error: null,
	lastRefresh: null
};

function createDashboardStore() {
	const { subscribe, set, update } =
		writable<DashboardState>(initialState);

	return {
		subscribe,
		set,
		update,

		setLoading: (loading: boolean) =>
			update((d) => ({
				...d,
				loading
			})),

		setError: (error: string | null) =>
			update((d) => ({
				...d,
				error,
				loading: false
			})),

		setReports: (production: any[]) =>
			update((d) => ({
				...d,
				production
			})),

		reset: () => set(initialState)
	};
}

export const dashboard = createDashboardStore();

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export async function loadDashboard() {
	dashboard.setLoading(true);

	try {
		const [
			meetingsResult,
			productionResult,
			actionsResult,
			analyticsResult
		] = await Promise.all([
			getMeetings(),
			getProductionReport(),
			getActions(),
			getAnalytics()
		]);

		const meetings = [...(meetingsResult ?? [])];
		const production = [...(productionResult ?? [])];
		const actions = [...(actionsResult ?? [])];

		// =====================================================
		// SORT MEETINGS
		// =====================================================

		meetings.sort((a: any, b: any) => {
			const da = new Date(
				`${a.date || a.meeting_date || ""} ${
					a.start_time || "00:00"
				}`
			).getTime();

			const db = new Date(
				`${b.date || b.meeting_date || ""} ${
					b.start_time || "00:00"
				}`
			).getTime();

			return db - da;
		});

		// =====================================================
		// SORT PRODUCTION RECORDS
		// =====================================================
		//
		// Current reporting source:
		//
		// public.records
		//
		// records.id is BIGINT and records.ts is the
		// report timestamp.
		//
		// Prefer ts because it represents report time.
		// Fall back to id for older/incomplete records.
		//

		production.sort((a: any, b: any) => {
			const timeA = a.ts
				? new Date(a.ts).getTime()
				: 0;

			const timeB = b.ts
				? new Date(b.ts).getTime()
				: 0;

			if (timeB !== timeA) {
				return timeB - timeA;
			}

			return Number(b.id ?? 0) - Number(a.id ?? 0);
		});

		// =====================================================
		// SORT ACTIONS
		// =====================================================

		actions.sort((a: any, b: any) => {
			return Number(b.id ?? 0) - Number(a.id ?? 0);
		});

		// =====================================================
		// UPDATE STORE
		// =====================================================

		dashboard.set({
			meetings,
			production,
			actions,
			analytics: analyticsResult ?? initialState.analytics,
			loading: false,
			error: null,
			lastRefresh: new Date()
		});

		console.log("[Dashboard] Loaded:", {
			meetings: meetings.length,
			actions: actions.length,
			production: production.length
		});
	} catch (err) {
		console.error("[Dashboard] Load Error:", err);

		dashboard.setError(
			err instanceof Error
				? err.message
				: "Failed to load dashboard data"
		);
	}
}

// =====================================================
// AUTO REFRESH
// =====================================================

export function startDashboardRefresh() {
	loadDashboard();

	if (refreshTimer) {
		clearInterval(refreshTimer);
	}

	refreshTimer = setInterval(() => {
		loadDashboard();
	}, 60000);

	if (browser) {
		const reload = () => {
			loadDashboard();
		};

		window.addEventListener(
			"meetings:updated",
			reload
		);

		window.addEventListener(
			"actions:updated",
			reload
		);

		window.addEventListener(
			"production:updated",
			reload
		);

		return () => {
			if (refreshTimer) {
				clearInterval(refreshTimer);
				refreshTimer = null;
			}

			window.removeEventListener(
				"meetings:updated",
				reload
			);

			window.removeEventListener(
				"actions:updated",
				reload
			);

			window.removeEventListener(
				"production:updated",
				reload
			);
		};
	}

	return () => {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
		}
	};
}