<script lang="ts">
	import { goto } from "$app/navigation";

	export interface Meeting {
		id?: string;
		title?: string;
		status?: "Today" | "Upcoming" | "In Progress" | "Completed" | "Overdue" | string;
		priority?: "Critical" | "High" | "Medium" | "Low" | string;
	}

	export let meetings: Meeting[] = [];

	// FIX 1: Single pass reduce instead of 8 filters for performance
	$: stats = (() => {
		const s = {
			total: 0,
			today: 0,
			upcoming: 0,
			progress: 0,
			completed: 0,
			overdue: 0,
			critical: 0,
			high: 0
	};

		for (const m of meetings) {
			s.total++;
			if (m.status === "Today") s.today++;
			if (m.status === "Upcoming") s.upcoming++;
			if (m.status === "In Progress") s.progress++;
			if (m.status === "Completed") s.completed++;
			if (m.status === "Overdue") s.overdue++;
			if (m.priority === "Critical") s.critical++;
			if (m.priority === "High") s.high++;
		}
		return s;
	})();

	function open(filter: string) {
		goto(`/meeting-list?filter=${filter}`);
	}

	function handleKeydown(e: KeyboardEvent, filter: string) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			open(filter);
	}
	}
</script>

<div class="grid">
	<div class="card blue" role="button" tabindex="0" on:click={() => open("all")} on:keydown={(e) => handleKeydown(e, "all")}>
	<h2>{stats.total}</h2>
	<p>Total Meetings</p>
	</div>

	<div class="card green" role="button" tabindex="0" on:click={() => open("today")} on:keydown={(e) => handleKeydown(e, "today")}>
	<h2>{stats.today}</h2>
	<p>Today's Meetings</p>
	</div>

	<div class="card cyan" role="button" tabindex="0" on:click={() => open("upcoming")} on:keydown={(e) => handleKeydown(e, "upcoming")}>
		<h2>{stats.upcoming}</h2>
	<p>Upcoming</p>
	</div>

	<div class="card teal" role="button" tabindex="0" on:click={() => open("progress")} on:keydown={(e) => handleKeydown(e, "progress")}>
	<h2>{stats.progress}</h2>
	<p>In Progress</p>
	</div>

	<div class="card gray" role="button" tabindex="0" on:click={() => open("completed")} on:keydown={(e) => handleKeydown(e, "completed")}>
		<h2>{stats.completed}</h2>
		<p>Completed</p>
	</div>

	<div class="card red" role="button" tabindex="0" on:click={() => open("overdue")} on:keydown={(e) => handleKeydown(e, "overdue")}>
		<h2>{stats.overdue}</h2>
		<p>Overdue</p>
	</div>

	<div class="card danger" role="button" tabindex="0" on:click={() => open("critical")} on:keydown={(e) => handleKeydown(e, "critical")}>
	<h2>{stats.critical}</h2>
	<p>Critical Priority</p>
	</div>

	<div class="card orange" role="button" tabindex="0" on:click={() => open("high")} on:keydown={(e) => handleKeydown(e, "high")}>
	<h2>{stats.high}</h2>
		<p>High Priority</p>
	</div>
</div>

<style>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 20px;
	margin-top: 20px;
}

.card {
	padding: 22px;
	border-radius: 16px;
	color: white;
	cursor: pointer;
	transition: .25s;
	box-shadow: 0 6px 18px rgba(0, 0, 0, .08);
	outline: none;
}

.card:focus-visible {
	box-shadow: 0 0 0 3px rgba(59, 130, 246, .6);
}

.card:hover {
	transform: translateY(-5px);
	box-shadow: 0 12px 24px rgba(0, 0, 0, .18);
}

.card h2 {
	margin: 0;
	font-size: 34px;
	font-weight: bold;
}

.card p {
	margin-top: 12px;
	font-size: 15px;
}

.blue { background: #2563eb; }
.green { background: #16a34a; }
.cyan { background: #0891b2; }
.teal { background: #0f766e; }
.gray { background: #64748b; }
.red { background: #dc2626; }
.orange { background: #ea580c; }
.danger { background: #991b1b; }

@media(max-width: 768px) {
	.grid { grid-template-columns: 1fr; }
	.card { padding: 18px; }
	.card h2 { font-size: 28px; }
}
</style>