<script lang="ts">
	import { goto } from "$app/navigation";

	export interface ProductionRow {
		target?: number | string;
		actual?: number | string;
		good?: number | string;
		ng?: number | string;
		yield?: number | string;
		oee?: number | string;
		dt?: number | string;
	}

	let { production = [] }: { production: ProductionRow[] } = $props();

	let totalTarget = $derived(production.reduce((t, r) => t + Number(r.target || 0), 0));
	let totalActual = $derived(production.reduce((t, r) => t + Number(r.actual || 0), 0));
	let totalGood = $derived(production.reduce((t, r) => t + Number(r.good || 0), 0));
	let totalNG = $derived(production.reduce((t, r) => t + Number(r.ng || 0), 0));
	let avgYield = $derived(
		production.length
		? (production.reduce((t, r) => t + Number(r.yield || 0), 0) / production.length).toFixed(2)
		: "0.00"
	);
	let avgOEE = $derived(
		production.length
		? (production.reduce((t, r) => t + Number(r.oee || 0), 0) / production.length).toFixed(1)
		: "0.0"
	);
	let totalDowntime = $derived(production.reduce((t, r) => t + Number(r.dt || 0), 0));
	let achievement = $derived(totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(1) : "0.0");

	function fmt(n: number): string {
		return n.toLocaleString("en-IN");
	}

	function openProduction() {
		goto("/reports");
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			openProduction();
		}
	}
</script>

<div class="grid">
	<div class="card blue" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{fmt(totalTarget)}</h2>
		<p>Daily Target</p>
	</div>
	<div class="card green" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{fmt(totalActual)}</h2>
		<p>Actual Production</p>
	</div>
	<div class="card teal" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{achievement}%</h2>
		<p>Achievement</p>
	</div>
	<div class="card cyan" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{avgYield}%</h2>
		<p>Yield</p>
	</div>
	<div class="card orange" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{fmt(totalNG)}</h2>
		<p>NG Quantity</p>
	</div>
	<div class="card purple" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{avgOEE}%</h2>
		<p>Average OEE</p>
	</div>
	<div class="card dark" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{fmt(totalGood)}</h2>
		<p>Good Quantity</p>
	</div>
	<div class="card gray" role="button" tabindex="0" onclick={openProduction} onkeydown={handleKeydown}>
		<h2>{totalDowntime} min</h2>
		<p>Downtime</p>
	</div>
</div>

<style>
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-top: 20px; }
.card { padding: 22px; border-radius: 16px; color: white; cursor: pointer; transition: .25s; box-shadow: 0 6px 18px rgba(0, 0, 0, .08); outline: none; }
.card:focus-visible { box-shadow: 0 0 0 3px rgba(59, 130, 246, .6); }
.card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0, 0, 0, .18); }
.card h2 { margin: 0; font-size: 34px; font-weight: 700; }
.card p { margin-top: 10px; font-size: 15px; opacity: .95; }
.blue { background: #2563eb; } .green { background: #16a34a; } .teal { background: #0f766e; } .cyan { background: #0891b2; } .orange { background: #ea580c; } .purple { background: #9333ea; } .dark { background: #1e293b; } .gray { background: #64748b; }
@media(max-width: 768px) { .grid { grid-template-columns: 1fr; } .card { padding: 18px; } .card h2 { font-size: 28px; } }
</style>