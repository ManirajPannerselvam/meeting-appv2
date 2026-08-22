<script lang="ts">
	import { goto } from "$app/navigation";

	export interface Meeting {
		id: number;
		title: string;
	meeting_date?: string;
		start_time?: string;
		end_time?: string;
		location?: string;
		organizer?: string;
		status?: string;
	priority?: string;
		type?: string;
	}

	export let meetings: Meeting[] = [];

	function parseDate(m: Meeting): number {
		try {
			if (!m.meeting_date) return 0;
			return new Date(`${m.meeting_date}T${m.start_time || "00:00:00"}`).getTime();
		} catch {
			return 0;
	}
	}

	$: recent = [...meetings]
		.sort((a, b) => parseDate(b) - parseDate(a))
	.slice(0, 10);

	function openMeeting(id: number) {
		goto(`/meeting/${id}`);
	}

	function handleRowKeydown(e: KeyboardEvent, id: number) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openMeeting(id);
	}
	}

	function badge(status: string = "") {
		const map: Record<string, string> = {
			"Today": "today",
			"Upcoming": "upcoming",
			"Completed": "completed",
			"In Progress": "progress",
			"Overdue": "overdue"
	};
		return map[status] || "default";
	}

	function priorityClass(priority: string = "") {
		const map: Record<string, string> = {
			"Critical": "critical",
			"High": "high",
			"Medium": "medium"
	};
		return map[priority] || "low";
	}
</script>

<div class="card">
	<div class="header">
	<h2>📅 Recent Meetings</h2>
		<button class="view-all" on:click={() => goto("/meeting-list")}>
			View All
	</button>
	</div>

	{#if recent.length === 0}
	<div class="empty">
			No meetings available
	</div>
	{:else}
	<div class="table-wrapper">
			<table>
			<thead>
					<tr>
					<th>ID</th>
					<th>Meeting</th>
					<th>Date</th>
					<th>Time</th>
					<th>Location</th>
					<th>Organizer</th>
					<th>Status</th>
					<th>Priority</th>
					</tr>
				</thead>
				<tbody>
					{#each recent as meeting (meeting.id)}
					<tr 
							role="button" 
							tabindex="0"
							on:click={() => openMeeting(meeting.id)}
							on:keydown={(e) => handleRowKeydown(e, meeting.id)}
						>
							<td>#{meeting.id}</td>
							<td>
								<strong>{meeting.title || 'Untitled'}</strong>
								{#if meeting.type}
									<div class="small">{meeting.type}</div>
								{/if}
							</td>
							<td>{meeting.meeting_date || '-'}</td>
							<td>
								{meeting.start_time || '-'} - {meeting.end_time || '-'}
							</td>
							<td>📍 {meeting.location || "-"}</td>
							<td>👤 {meeting.organizer || "-"}</td>
							<td>
								<span class="badge {badge(meeting.status)}">
									{meeting.status || 'Unknown'}
								</span>
							</td>
							<td>
								<span class="badge {priorityClass(meeting.priority)}">
									{meeting.priority || "Low"}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
	</div>
	{/if}
</div>

<style>
.card {
	background: white;
	padding: 22px;
	border-radius: 16px;
	box-shadow: 0 6px 18px rgba(0, 0, 0, .08);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

h2 { margin: 0; font-size: 18px; color: #1e293b; }

.table-wrapper { overflow: auto; }

table {
	width: 100%;
	border-collapse: collapse;
	min-width: 800px;
}

th {
	background: #1e293b;
	color: white;
	padding: 12px;
	text-align: left;
	font-weight: 600;
	font-size: 13px;
	position: sticky;
	top: 0;
}

td {
	padding: 12px;
	border-bottom: 1px solid #e5e7eb;
	font-size: 14px;
}

tbody tr {
	cursor: pointer;
	transition: .2s;
	outline: none;
}

tbody tr:hover, tbody tr:focus-visible {
	background: #eff6ff;
}

.small {
	font-size: 12px;
	color: #64748b;
	margin-top: 4px;
}

.badge {
	padding: 5px 12px;
	border-radius: 20px;
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
	display: inline-block;
}

.today { background: #16a34a; color: white; }
.upcoming { background: #2563eb; color: white; }
.progress { background: #0891b2; color: white; }
.completed { background: #64748b; color: white; }
.overdue { background: #dc2626; color: white; }
.default { background: #cbd5e1; color: #1e293b; }

.critical { background: #dc2626; color: white; }
.high { background: #ea580c; color: white; }
.medium { background: #ca8a04; color: white; }
.low { background: #16a34a; color: white; }

.view-all {
	background: #2563eb;
	color: white;
	border: none;
	padding: 10px 18px;
	border-radius: 8px;
	cursor: pointer;
	font-weight: 600;
	transition: .2s;
}

.view-all:hover { background: #1d4ed8; }

.empty {
	text-align: center;
	padding: 50px;
	color: #64748b;
	background: #f8fafc;
	border-radius: 12px;
}

@media(max-width: 768px) {
	table { font-size: 13px; }
	th, td { padding: 8px; }
	.view-all { padding: 8px 14px; font-size: 13px; }
}
</style>