<script lang="ts">
	export interface DowntimeRecord {
		machine?: string;
		reason?: string;
		duration_min?: number | string;
		start_time?: string;
	}

	export let downtime: DowntimeRecord[] = [];

	// FIX 1: Single pass for all 3 stats
	$: stats = (() => {
		let totalMinutes = 0;
		const machines = new Set<string>();
		let highest: DowntimeRecord | null = null;

		for (const r of downtime) {
			const duration = Number(r.duration_min || 0);
			totalMinutes += duration;
			
			if (r.machine) machines.add(r.machine);
			
			if (!highest || duration > Number(highest.duration_min || 0)) {
				highest = r;
			}
	}

		return {
			totalMinutes,
			totalMachines: machines.size,
			highest
		};
	})();

	function fmt(n: number): string {
		return n.toLocaleString("en-IN");
	}
</script>

<div class="summary-card">
	<h3>🏭 Machine Downtime</h3>

	<div class="grid">
	<div class="box">
			<label>Total Minutes</label>
			<h2>{fmt(stats.totalMinutes)}</h2>
	</div>

		<div class="box">
			<label>Machines Affected</label>
			<h2>{stats.totalMachines}</h2>
	</div>

	<div class="box">
			<label>Highest Downtime</label>
			{#if stats.highest}
				<h2>{stats.highest.machine || 'Unknown'}</h2>
				<small>{fmt(Number(stats.highest.duration_min || 0))} min</small>
			{:else}
				<h2>-</h2>
				<small>No data</small>
			{/if}
	</div>
	</div>
</div>

<style>
.summary-card {
	background: white;
	padding: 22px;
	border-radius: 16px;
	box-shadow: 0 6px 18px rgba(0, 0, 0, .08);
}

h3 {
	margin: 0 0 12px 0;
	font-size: 18px;
	color: #1e293b;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	gap: 15px;
	margin-top: 15px;
}

.box {
	background: #f8fafc;
	padding: 18px;
	border-radius: 12px;
	text-align: center;
	transition: .2s;
}

.box:hover {
	background: #f1f5f9;
	transform: translateY(-2px);
}

.box label {
	display: block;
	color: #64748b;
	font-size: 13px;
	font-weight: 500;
	margin-bottom: 8px;
	text-transform: uppercase;
	letter-spacing: .5px;
}

.box h2 {
	margin: 0;
	font-size: 28px;
	font-weight: 700;
	color: #0f172a;
}

.box small {
	display: block;
	margin-top: 4px;
	font-size: 13px;
	color: #64748b;
}
</style>