<script lang="ts">
	import { goto } from "$app/navigation";

	export interface ActionItem {
		id?: string;
		title?: string;
		status?: "Pending" | "Open" | "Completed" | "Overdue" | "In Progress" | string;
		assignedTo?: string;
		dueDate?: string;
	}

	export let actions: ActionItem[] = [];

	// FIX 1: Single pass to avoid 5 filters
	$: stats = (() => {
		const s = { total: 0, pending: 0, open: 0, completed: 0, overdue: 0 };
		for (const a of actions) {
			s.total++;
			if (a.status === "Pending") s.pending++;
			if (a.status === "Open") s.open++;
			if (a.status === "Completed") s.completed++;
			if (a.status === "Overdue") s.overdue++;
	}
		return s;
	})();

	function openStatus(status: string) {
		goto(`/meeting-actions?status=${status}`);
	}

	function handleKeydown(e: KeyboardEvent, status: string) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openStatus(status);
	}
	}
</script>

<div class="action-grid">
	<div
		class="card total"
	role="button"
		tabindex="0"
		on:click={() => goto("/meeting-actions")}
		on:keydown={(e) => handleKeydown(e, "all")}
	>
	<h2>{stats.total}</h2>
		<p>Total Actions</p>
	</div>

	<div
		class="card blue"
	role="button"
		tabindex="0"
		on:click={() => openStatus("Pending")}
		on:keydown={(e) => handleKeydown(e, "Pending")}
	>
	<h2>{stats.pending}</h2>
	<p>Pending</p>
	</div>

	<div
		class="card orange"
	role="button"
		tabindex="0"
		on:click={() => openStatus("Open")}
		on:keydown={(e) => handleKeydown(e, "Open")}
	>
	<h2>{stats.open}</h2>
	<p>Open</p>
	</div>

	<div
		class="card green"
	role="button"
		tabindex="0"
		on:click={() => openStatus("Completed")}
		on:keydown={(e) => handleKeydown(e, "Completed")}
	>
	<h2>{stats.completed}</h2>
	<p>Completed</p>
	</div>

	<div
		class="card red"
		role="button"
		tabindex="0"
		on:click={() => openStatus("Overdue")}
		on:keydown={(e) => handleKeydown(e, "Overdue")}
	>
	<h2>{stats.overdue}</h2>
	<p>Overdue</p>
	</div>
</div>

<style>
.action-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 20px;
	margin-top: 20px;
}

.card {
	padding: 22px;
	border-radius: 16px;
	cursor: pointer;
	color: white;
	transition: .25s;
	box-shadow: 0 6px 20px rgba(0, 0, 0, .08);
	outline: none;
}

.card:focus-visible {
	box-shadow: 0 0 0 3px rgba(59, 130, 246, .6);
}

.card:hover {
	transform: translateY(-5px);
	box-shadow: 0 14px 28px rgba(0, 0, 0, .18);
}

.card h2 {
	margin: 0;
	font-size: 34px;
	font-weight: 700;
}

.card p {
	margin-top: 10px;
	font-size: 15px;
	opacity: .95;
}

.total { background: #0f172a; }
.blue { background: #2563eb; }
.orange { background: #ea580c; }
.green { background: #16a34a; }
.red { background: #dc2626; }

@media(max-width: 768px) {
	.action-grid { grid-template-columns: 1fr; }
	.card h2 { font-size: 28px; }
}
</style>