import {
	supabaseChat,
	supabaseTemplates
} from "$lib/supabase/client";

const supabase = supabaseChat;

const GUEST_USER_ID = "guest-user-001";

// =====================================================
// TYPES
// =====================================================

export interface ProductionRecord {
	id: number;
	reference_template_id: string;
	t_code: string;
	ts: string;
	shift: string | null;
	station: string | null;
	user_name: string | null;
	data: Record<string, any>;
	created_at: string;
}

// =====================================================
// AUTH
// =====================================================

function getCurrentUserId(): string {
	return GUEST_USER_ID;
}

// =====================================================
// HELPER
// =====================================================

function notifyUpdate(
	event: string = "meetings:updated"
): void {
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent(event)
		);
	}
}

// =====================================================
// MEETINGS
// =====================================================

export async function getMeetings() {
	const { data, error, status } = await supabase
		.from("meetings")
		.select("*")
		.order("meeting_date", {
			ascending: false
		})
		.order("start_time", {
			ascending: false
		});

	console.log("Meetings status:", status);

	if (error) {
		console.error(
			"[Meetings] Load failed:",
			error
		);

		throw new Error(error.message);
	}

	return data ?? [];
}

export async function getMeeting(
	id: number
) {
	const { data, error } = await supabase
		.from("meetings")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		console.error(
			"[Meeting] Load failed:",
			error
		);

		return null;
	}

	return data;
}

export async function addMeeting(
	data: any
) {
	const now = new Date();

	const meetingDateTime = new Date(
		`${data.meeting_date}T${
			data.start_time || "00:00"
		}`
	);

	let status = "scheduled";

	if (
		meetingDateTime.toDateString() ===
		now.toDateString()
	) {
		status = "today";
	} else if (meetingDateTime < now) {
		status = "completed";
	}

	const payload = {
		title: data.title,
		type: data.type,
		department: data.department,
		priority: data.priority,
		meeting_date: data.meeting_date,
		start_time: data.start_time,
		end_time: data.end_time,
		location: data.location,
		organizer: data.organizer,

		participants: Array.isArray(
			data.participants
		)
			? data.participants
			: [],

		agenda: data.agenda,
		meeting_objective:
			data.meeting_objective,

		reference_no:
			data.reference_no,

		meeting_mode:
			data.meeting_mode,

		meeting_link:
			data.meeting_link,

		reminder_minutes:
			data.reminder_minutes ?? 15,

		attachment:
			data.attachment ?? "",

		status,

		created_by:
			getCurrentUserId()
	};

	const { error } = await supabase
		.from("meetings")
		.insert([payload]);

	if (error) {
		console.error(
			"[Meeting] Add failed:",
			error
		);

		throw error;
	}

	notifyUpdate(
		"meetings:updated"
	);

	return true;
}

export async function updateMeeting(
	id: number,
	data: any
) {
	const { error } = await supabase
		.from("meetings")
		.update(data)
		.eq("id", id);

	if (error) {
		console.error(
			"[Meeting] Update failed:",
			error
		);

		throw error;
	}

	notifyUpdate(
		"meetings:updated"
	);

	return true;
}

export async function deleteMeeting(
	id: number
) {
	const { error } = await supabase
		.from("meetings")
		.delete()
		.eq("id", id);

	if (error) {
		console.error(
			"[Meeting] Delete failed:",
			error
		);

		throw error;
	}

	notifyUpdate(
		"meetings:updated"
	);

	return true;
}

// =====================================================
// SIM INVENTORY
// =====================================================

export async function getSIMs() {
	const response = await fetch(
		"/api/sims"
	);

	if (!response.ok) {
		throw new Error(
			"Failed to load SIMs"
		);
	}

	return await response.json();
}

export async function saveSIM(
	sim: any
) {
	const response = await fetch(
		"/api/sims",
		{
			method: "POST",
			headers: {
				"Content-Type":
					"application/json"
			},
			body: JSON.stringify(sim)
		}
	);

	if (!response.ok) {
		throw new Error(
			"Failed to save SIM"
		);
	}

	return await response.json();
}

// =====================================================
// ANALYTICS
// =====================================================

export async function getAnalytics() {
	const [
		meetings,
		rooms,
		messages,
		reports
	] = await Promise.all([
		supabase
			.from("meetings")
			.select("*", {
				count: "exact",
				head: true
			}),

		supabase
			.from("chat_rooms")
			.select("*", {
				count: "exact",
				head: true
			}),

		supabase
			.from("chat_messages")
			.select("*", {
				count: "exact",
				head: true
			}),

		getProductionReportCount()
	]);

	if (meetings.error) {
		console.error(
			"[Analytics] Meetings:",
			meetings.error
		);
	}

	if (rooms.error) {
		console.error(
			"[Analytics] Chat rooms:",
			rooms.error
		);
	}

	if (messages.error) {
		console.error(
			"[Analytics] Chat messages:",
			messages.error
		);
	}

	return {
		totalMeetings:
			meetings.count ?? 0,

		totalContacts:
			reports,

		totalGroups:
			rooms.count ?? 0,

		totalMessages:
			messages.count ?? 0
	};
}

// =====================================================
// ACTIONS
// =====================================================

export async function getActions() {
	const { data, error } =
		await supabase
			.from("meeting_actions")
			.select("*");

	if (error) {
		console.error(
			"[Actions] Failed to load:",
			error
		);

		return [];
	}

	return data ?? [];
}

// =====================================================
// PRODUCTION REPORT
// =====================================================
//
// CANONICAL SOURCE:
//
//     Template / Reporting DB
//     public.records
//
// IMPORTANT:
//
// `records` is NOT in the Operations / Chat DB.
//
// Therefore all `records` queries MUST use:
//
//     supabaseTemplates
//
// We intentionally DO NOT query:
//
//     public.daily_reports
//     public.template_reports
//
// =====================================================

export async function getProductionReport(): Promise<
	ProductionRecord[]
> {
	try {
		const { data, error } =
			await supabaseTemplates
				.from("records")
				.select(`
					id,
					reference_template_id,
					t_code,
					ts,
					shift,
					station,
					user_name,
					data,
					created_at
				`)
				.order("ts", {
					ascending: false
				});

		if (error) {
			console.error(
				"[Production Report] Failed to load records:",
				error
			);

			return [];
		}

		return Array.isArray(data)
			? (data as ProductionRecord[])
			: [];
	} catch (error) {
		console.error(
			"[Production Report] Unexpected error:",
			error
		);

		return [];
	}
}

// =====================================================
// PRODUCTION REPORT BY STATION
// =====================================================

export async function getProductionReportByStation(
	station: string
): Promise<ProductionRecord[]> {
	try {
		const { data, error } =
			await supabaseTemplates
				.from("records")
				.select(`
					id,
					reference_template_id,
					t_code,
					ts,
					shift,
					station,
					user_name,
					data,
					created_at
				`)
				.eq("station", station)
				.order("ts", {
					ascending: false
				});

		if (error) {
			console.error(
				"[Production Report] Station query failed:",
				error
			);

			return [];
		}

		return Array.isArray(data)
			? (data as ProductionRecord[])
			: [];
	} catch (error) {
		console.error(
			"[Production Report] Station query error:",
			error
		);

		return [];
	}
}

// =====================================================
// PRODUCTION REPORT BY ID
// =====================================================

export async function getProductionReportById(
	id: number
): Promise<ProductionRecord | null> {
	try {
		const { data, error } =
			await supabaseTemplates
				.from("records")
				.select(`
					id,
					reference_template_id,
					t_code,
					ts,
					shift,
					station,
					user_name,
					data,
					created_at
				`)
				.eq("id", id)
				.single();

		if (error) {
			console.error(
				"[Production Report] Record load failed:",
				error
			);

			return null;
		}

		return data as ProductionRecord;
	} catch (error) {
		console.error(
			"[Production Report] Record load error:",
			error
		);

		return null;
	}
}

// =====================================================
// PRODUCTION REPORT COUNT
// =====================================================

export async function getProductionReportCount(): Promise<number> {
	try {
		const { count, error } =
			await supabaseTemplates
				.from("records")
				.select("*", {
					count: "exact",
					head: true
				});

		if (error) {
			console.error(
				"[Analytics] Production report count failed:",
				error
			);

			return 0;
		}

		return count ?? 0;
	} catch (error) {
		console.error(
			"[Analytics] Production report count failed:",
			error
		);

		return 0;
	}
}

// =====================================================
// MACHINE DOWNTIME
// =====================================================

export async function getMachineDowntime() {
	const { data, error } =
		await supabase
			.from("machine_downtime")
			.select("*")
			.order("report_date", {
				ascending: false
			})
			.order("created_at", {
				ascending: false
			});

	if (error) {
		console.error(
			"[Machine Downtime] Load failed:",
			error
		);

		return [];
	}

	return data ?? [];
}

export async function getMachineDowntimeById(
	id: number
) {
	const { data, error } =
		await supabase
			.from("machine_downtime")
			.select("*")
			.eq("id", id)
			.single();

	if (error) {
		console.error(
			"[Machine Downtime] Load failed:",
			error
		);

		return null;
	}

	return data;
}

export async function addMachineDowntime(
	item: any
) {
	const { error } =
		await supabase
			.from("machine_downtime")
			.insert([item]);

	if (error) {
		console.error(
			"[Machine Downtime] Add failed:",
			error
		);

		throw error;
	}

	notifyUpdate(
		"downtime:updated"
	);

	return true;
}

export async function updateMachineDowntime(
	id: number,
	item: any
) {
	const { error } =
		await supabase
			.from("machine_downtime")
			.update(item)
			.eq("id", id);

	if (error) {
		console.error(
			"[Machine Downtime] Update failed:",
			error
		);

		throw error;
	}

	notifyUpdate(
		"downtime:updated"
	);

	return true;
}

export async function deleteMachineDowntime(
	id: number
) {
	const { error } =
		await supabase
			.from("machine_downtime")
			.delete()
			.eq("id", id);

	if (error) {
		console.error(
			"[Machine Downtime] Delete failed:",
			error
		);

		throw error;
	}

	notifyUpdate(
		"downtime:updated"
	);

	return true;
}

export async function getTodayDowntime() {
	const today = new Date()
		.toISOString()
		.split("T")[0];

	const { data, error } =
		await supabase
			.from("machine_downtime")
			.select("*")
			.eq("report_date", today);

	if (error) {
		console.error(
			"[Machine Downtime] Today query failed:",
			error
		);

		return [];
	}

	return data ?? [];
}

// =====================================================
// DASHBOARD REFRESH
// =====================================================

export async function refreshDashboardData() {
	return Promise.all([
		getMeetings(),
		getActions(),
		getProductionReport(),
		getAnalytics()
	]);
}