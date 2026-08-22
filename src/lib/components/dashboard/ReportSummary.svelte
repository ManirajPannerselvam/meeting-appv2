<script lang="ts">
	import { goto } from "$app/navigation";

	export interface ProductionReport {
		target?: number | string;
	actual?: number | string;
		ng?: number | string;
		yield?: number | string;
		oee?: number | string;
	}

	export let reports: ProductionReport[] = [];

	// FIX 1: Single pass reduce
	$: stats = (() => {
		let totalTarget = 0;
		let totalActual = 0;
		let totalNG = 0;
		let yieldSum = 0;
		let oeeSum = 0;

		for (const r of reports) {
			totalTarget += Number(r.target || 0);
			totalActual += Number(r.actual || 0);
			totalNG += Number(r.ng || 0);
			yieldSum += Number(r.yield || 0);
			oeeSum += Number(r.oee || 0);
	}

		const len = reports.length;
		return {
			count: len,
			totalTarget,
			totalActual,
			totalNG,
			avgYield: len ? (yieldSum / len).toFixed(2) : "0.00",
			avgOEE: len ? (oeeSum / len).toFixed(1) : "0.0"
		};
	})();

	// FIX 2: Indian number format
	function fmt(n: number): string {
		return n.toLocaleString("en-IN");
	}

	function openReports() {
		goto("/production-report");
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openReports();
	}
	}
</script>

<div class="report-grid">
	<div
		class="card blue"
	role="button"
		tabindex="0"
		on:click={openReports}
		on:keydown={handleKeydown}
	>
	<h2>{stats.count}</h2>
	<p>Production Reports</p>
	</div>

	<div
		class="card green"
	role="button"
		tabindex="0"
		on:click={openReports}
		on:keydown={handleKeydown}
	>
	<h2>{fmt(stats.totalTarget)}</h2>
	<p>Total Target</p>
	</div>

	<div
		class="card teal"
		role="button"
		tabindex="0"
		on:click={openReports}
		on:keydown={handleKeydown}
	>
	<h2>{fmt(stats.totalActual)}</h2>
	<p>Total Actual</p>
	</div>

	<div
		class="card orange"
	role="button"
		tabindex="0"
		on:click={openReports}
		on:keydown={handleKeydown}
	>
	<h2>{stats.avgYield}%</h2>
	<p>Average Yield</p>
	</div>

	<div
		class="card red"
		role="button"
		tabindex="0"
		on:click={openReports}
		on:keydown={handleKeydown}
	>
	<h2>{fmt(stats.totalNG)}</h2>
	<p>NG Quantity</p>
	</div>

	<div
		class="card purple"
	role="button"
		tabindex="0"
		on:click={openReports}
		on:keydown={handleKeydown}
	>
	<h2>{stats.avgOEE}%</h2>
	<p>Average OEE</p>
	</div>
</div>

<style>
.report-grid {
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
	margin-top: 12px;
	font-size: 15px;
	opacity: .95;
}

.blue { background: #2563eb; }
.green { background: #16a34a; }
.teal { background: #0f766e; }
.orange { background: #ea580c; }
.red { background: #dc2626; }
.purple { background: #7c3aed; }

@media(max-width: 768px) {
	.report-grid { grid-template-columns: 1fr; }
	.card h2 { font-size: 28px; }
}
</style>