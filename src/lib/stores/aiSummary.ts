import { writable } from "svelte/store";
import { generateAISummary } from "$lib/services/aiSummary";

export type AISummaryState = {
	loading: boolean;
	production: {
		target: number;
		actual: number;
	good: number;
		ng: number;
		achievement: number;
		yield: number;
		oee: number;
	};
	meetings: {
		today: number;
		upcoming: number;
		completed: number;
	};
	actions: {
		pending: number;
		overdue: number;
		completed: number;
	};
	issues: string[];
	recommendations: string[];
};

const initialState: AISummaryState = {
	loading: true,
	production: { target: 0, actual: 0, good: 0, ng: 0, achievement: 0, yield: 0, oee: 0 },
	meetings: { today: 0, upcoming: 0, completed: 0 },
	actions: { pending: 0, overdue: 0, completed: 0 },
	issues: [],
	recommendations: []
};

export const aiSummary = writable<AISummaryState>(initialState);

export async function refreshAISummary() {
	aiSummary.update(v => ({ ...v, loading: true }));

	try {
		console.log("================================");
		console.log("Refreshing AI Summary...");
		console.log("================================");

		const result = await generateAISummary();

		console.log("AI Summary Result:");
		console.log(result);

		// 1. FIX: Don't spread blindly. Merge to guarantee shape
	aiSummary.set({
			loading: false,
			production: result.production ?? initialState.production,
			meetings: result.meetings ?? initialState.meetings,
			actions: result.actions ?? initialState.actions,
			issues: result.issues ?? initialState.issues,
			recommendations: result.recommendations ?? initialState.recommendations
		});

	} catch (err) {
		console.error("================================");
		console.error("AI Summary ERROR");
		console.error(err);
		console.error("================================");

		aiSummary.update(v => ({ ...v, loading: false }));
	}
}

export function startAISummaryRefresh() {
	refreshAISummary();
	const timer = setInterval(() => {
		refreshAISummary();
	}, 60000);
	return () => clearInterval(timer);
}