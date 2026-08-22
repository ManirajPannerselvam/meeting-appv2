<script lang="ts">
	import { goto } from "$app/navigation";

	export interface AISummaryData {
	loading?: boolean;
	production?: {
			achievement?: number;
			yield?: number;
			oee?: number;
	};
	actions?: {
			pending?: number;
			overdue?: number;
	};
		meetings?: {
			today?: number;
		};
	issues?: string[];
		recommendations?: string[];
	}

	export let summary: AISummaryData = {};

	function color(v: number = 0): string {
		if (v >= 99) return "good";
		if (v >= 95) return "warn";
		return "bad";
	}

	function n(v: number | undefined, d: number = 1): string {
		return Number(v || 0).toFixed(d);
	}

	function goReport() {
		goto("/ai-summary");
	}
</script>

<div class="card">
	<div class="header">
	<div>
			<h2>🤖 AI Executive Summary</h2>
			<small>Last 7 Days Analysis</small>
	</div>
	<button class="view" on:click={goReport}>
			Open Report →
		</button>
	</div>

	{#if summary.loading}
	<div class="loading">
			<div class="spinner"></div>
			Analysing database...
	</div>
	{:else}
	<div class="grid">
	<div class="kpi">
				<label>Production Achievement</label>
				<h1 class={color(summary.production?.achievement)}>
					{n(summary.production?.achievement, 1)}%
				</h1>
			</div>

			<div class="kpi">
				<label>Average Yield</label>
				<h1 class={color(summary.production?.yield)}>
					{n(summary.production?.yield, 2)}%
				</h1>
			</div>

			<div class="kpi">
				<label>Average OEE</label>
				<h1 class={color(summary.production?.oee)}>
					{n(summary.production?.oee, 1)}%
				</h1>
			</div>

			<div class="kpi">
				<label>Pending Actions</label>
				<h1>{summary.actions?.pending ?? 0}</h1>
			</div>

			<div class="kpi">
				<label>Overdue</label>
				<h1 class="bad">{summary.actions?.overdue ?? 0}</h1>
			</div>

			<div class="kpi">
				<label>Today's Meetings</label>
				<h1>{summary.meetings?.today ?? 0}</h1>
			</div>
	</div>

		<hr>

	<h3>⚠ Major Issues</h3>
	<ul>
			{#if !summary.issues || summary.issues.length === 0}
				<li class="ok">✅ No major issues detected.</li>
			{:else}
				{#each summary.issues as issue}
					<li>{issue}</li>
				{/each}
			{/if}
		</ul>

		<h3>💡 Recommendations</h3>
	<ul>
			{#if !summary.recommendations || summary.recommendations.length === 0}
				<li class="ok">Keep up the good work!</li>
			{:else}
				{#each summary.recommendations as rec}
					<li>{rec}</li>
				{/each}
			{/if}
	</ul>
	{/if}
</div>

<style>
.card {
	background: white;
	padding: 24px;
	border-radius: 18px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, .08);
	margin-top: 25px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.header h2 { margin: 0; font-size: 18px; color: #1e293b; }
.header small { color: #64748b; }

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 18px;
}

.kpi {
	background: #f8fafc;
	padding: 18px;
	border-radius: 12px;
	text-align: center;
	transition: .2s;
}

.kpi:hover {
	background: #f1f5f9;
	transform: translateY(-2px);
}

.kpi label {
	display: block;
	font-size: 13px;
	color: #64748b;
	margin-bottom: 8px;
	font-weight: 500;
}

.kpi h1 {
	margin: 0;
	font-size: 30px;
	font-weight: 700;
	color: #1e293b;
}

.good { color: #16a34a; }
.warn { color: #ca8a04; }
.bad { color: #dc2626; }

hr {
	border: none;
	border-top: 1px solid #e2e8f0;
	margin: 20px 0;
}

h3 {
	margin: 16px 0 8px;
	font-size: 16px;
	color: #1e293b;
}

ul {
	margin: 10px 0 0;
	padding-left: 18px;
}

li {
	margin: 6px 0;
	color: #334155;
}

li.ok {
	color: #16a34a;
	list-style: none;
	margin-left: -18px;
}

.loading {
	padding: 60px;
	text-align: center;
	color: #64748b;
	font-size: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	align-items: center;
}

.spinner {
	width: 32px;
	height: 32px;
	border: 3px solid #e2e8f0;
	border-top: 3px solid #2563eb;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.view {
	background: #2563eb;
	color: white;
	border: none;
	padding: 10px 18px;
	border-radius: 8px;
	cursor: pointer;
	font-weight: 600;
	transition: .2s;
}

.view:hover { background: #1d4ed8; }

@media(max-width: 768px) {
	.header { flex-direction: column; align-items: flex-start; gap: 12px; }
	.grid { grid-template-columns: repeat(2, 1fr); }
}
</style>