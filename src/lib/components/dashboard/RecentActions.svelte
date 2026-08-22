<script lang="ts">
	import { goto } from "$app/navigation";

	export interface ActionItem {
		id: number;
	meeting_title?: string;
		description: string;
	owner?: string;
		due_date?: string;
		status?: "Pending" | "Open" | "Completed" | "Overdue" | string;
	}

	export let actions: ActionItem[] = [];

	$: recent = [...actions]
	.sort((a, b) => Number(b.id) - Number(a.id))
	.slice(0, 10);

	function badgeClass(status: string = "") {
		const map: Record<string, string> = {
			"Completed": "green",
			"Open": "orange",
			"Pending": "blue",
			"Overdue": "red"
	};
		return map[status] || "gray";
	}

	function isOverdue(due_date?: string, status?: string): boolean {
		if (!due_date || status === "Completed") return false;
		try {
			return new Date(due_date) < new Date();
		} catch { return false; }
	}

	function openAction(id: number) {
		goto(`/meeting-action/${id}`);
	}

	function viewAll() {
		goto("/meeting-actions");
	}
</script>

<div class="card">
	<div class="header">
	<h2>✅ Meeting Action Follow-ups</h2>
	<button class="view-all" on:click={viewAll}>
			View All
	</button>
	</div>

	{#if recent.length === 0}
	<div class="empty">
			No Action Items
	</div>
	{:else}
	<div class="table-wrapper">
		<table>
			<thead>
					<tr>
					<th>ID</th>
					<th>Meeting</th>
					<th>Action</th>
					<th>Owner</th>
					<th>Due Date</th>
					<th>Status</th>
					<th>Action</th>
				</tr>
				</thead>
				<tbody>
					{#each recent as item (item.id)}
					<tr class:overdue-row={isOverdue(item.due_date, item.status)}>
							<td>#{item.id}</td>
							<td>{item.meeting_title || "-"}</td>
							<td>
								<strong>{item.description}</strong>
							</td>
							<td>👤 {item.owner || "-"}</td>
							<td class:overdue-text={isOverdue(item.due_date, item.status)}>
								📅 {item.due_date || "-"}
							</td>
							<td>
								<span class="badge {badgeClass(item.status)}">
									{item.status || 'Unknown'}
								</span>
							</td>
							<td>
								<button
									class="view"
									on:click={() => openAction(item.id)}
									aria-label="View action {item.id}"
								>
									👁
								</button>
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
	box-shadow: 0 6px 18px rgba(0, 0, 0,.08);
	margin-top: 20px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 18px;
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
	font-size: 14px;
	text-align: left;
	font-weight: 600;
	position: sticky;
	top: 0;
}

td {
	padding: 12px;
	border-bottom: 1px solid #e5e7eb;
	font-size: 14px;
}

tbody tr {
	transition:.2s;
}

tbody tr:hover {
	background: #eff6ff;
}

.overdue-row {
	background: #fef2f2;
}

.overdue-text {
	color: #dc2626;
	font-weight: 600;
}

.badge {
	padding: 5px 12px;
	border-radius: 20px;
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
	display: inline-block;
}

.green { background: #16a34a; color: white; }
.orange { background: #ea580c; color: white; }
.blue { background: #2563eb; color: white; }
.red { background: #dc2626; color: white; }
.gray { background: #64748b; color: white; }

.view {
	background: #2563eb;
	color: white;
	border: none;
	padding: 8px 12px;
	border-radius: 8px;
	cursor: pointer;
	transition:.2s;
}

.view:hover {
	background: #1d4ed8;
	transform: scale(1.05);
}

.view-all {
	background: #16a34a;
	color: white;
	border: none;
	padding: 10px 18px;
	border-radius: 8px;
	cursor: pointer;
	font-weight: 600;
	transition:.2s;
}

.view-all:hover {
	background: #15803d;
}

.empty {
	padding: 60px;
	text-align: center;
	color: #64748b;
	font-size: 16px;
	background: #f8fafc;
	border-radius: 12px;
}

@media(max-width: 768px) {
	table { font-size: 13px; }
	th, td { padding: 8px; }
	.view-all { padding: 8px 14px; font-size: 13px; }
}
</style>