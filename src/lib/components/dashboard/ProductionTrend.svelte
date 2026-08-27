<script lang="ts">
	export interface ProductionRow {
		date: string;
		target?: number | string;
		actual?: number | string;
		good?: number | string;
		ng?: number | string;
		yield?: number | string;
		oee?: number | string;
	}

	let { production = [] }: { production: ProductionRow[] } = $props();

	function parseDate(d: string): number {
		return new Date(d).getTime();
	}

	let last7 = $derived(
		[...production]
			.sort((a, b) => parseDate(a.date) - parseDate(b.date))
			.slice(-7)
	);

	let stats = $derived((() => {
		let totalTarget = 0, totalActual = 0, totalGood = 0, totalNG = 0;
		let yieldSum = 0, oeeSum = 0;
		let maxValue = 1;

		for (const r of last7) {
			const t = Number(r.target || 0);
			const a = Number(r.actual || 0);
			totalTarget += t;
			totalActual += a;
			totalGood += Number(r.good || 0);
			totalNG += Number(r.ng || 0);
			yieldSum += Number(r.yield || 0);
			oeeSum += Number(r.oee || 0);
			maxValue = Math.max(maxValue, t, a);
		}
		const len = last7.length;
		return {
			totalTarget, totalActual, totalGood, totalNG, maxValue,
			avgYield: len ? (yieldSum / len).toFixed(2) : "0.00",
			avgOEE: len ? (oeeSum / len).toFixed(1) : "0.0"
		};
	})());

	function percent(value: number): number {
		return (value / stats.maxValue) * 100;
	}
	function fmt(n: number): string {
		return n.toLocaleString("en-IN");
	}
	function fmtDate(d: string): string {
		try {
			return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
		} catch { return d; }
	}
</script>

<div class="card">
	<div class="header">
		<h2>📈 Production Trend (Last 7 Days)</h2>
		<div class="legend">
			<span><i class="target"></i> Target</span>
			<span><i class="actual"></i> Actual</span>
		</div>
	</div>

	{#if last7.length === 0}
		<div class="empty">No production data available.</div>
	{:else}
		<div class="chart">
			{#each last7 as row}
				<div class="column">
					<div class="bars">
						<div class="target" style="height:{percent(Number(row.target || 0))}%" title="Target: {fmt(Number(row.target || 0))}"></div>
						<div class="actual" style="height:{percent(Number(row.actual || 0))}%" title="Actual: {fmt(Number(row.actual || 0))}"></div>
					</div>
					<small>{fmtDate(row.date)}</small>
				</div>
			{/each}
		</div>
	{/if}

	<div class="summary">
		<div><label>Total Target</label><strong>{fmt(stats.totalTarget)}</strong></div>
		<div><label>Total Actual</label><strong>{fmt(stats.totalActual)}</strong></div>
		<div><label>Good Qty</label><strong>{fmt(stats.totalGood)}</strong></div>
		<div><label>NG Qty</label><strong>{fmt(stats.totalNG)}</strong></div>
		<div><label>Avg Yield</label><strong>{stats.avgYield}%</strong></div>
		<div><label>Avg OEE</label><strong>{stats.avgOEE}%</strong></div>
	</div>
</div>

<style>
.card { background: white; padding: 22px; border-radius: 16px; box-shadow: 0 6px 18px rgba(0, 0, 0, .08); margin-top: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
h2 { margin: 0; font-size: 18px; color: #1e293b; }
.legend { display: flex; gap: 16px; font-size: 13px; color: #64748b; }
.legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: middle; }
.legend .target { background: #94a3b8; } .legend .actual { background: #2563eb; }
.chart { display: flex; align-items: flex-end; justify-content: space-between; height: 260px; gap: 18px; }
.column { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bars { display: flex; align-items: flex-end; gap: 6px; height: 220px; width: 100%; justify-content: center; }
.target, .actual { width: 18px; border-radius: 6px 6px 0 0; transition: height .3s ease; }
.target { background: #94a3b8; } .actual { background: #2563eb; }
.column small { margin-top: 8px; font-size: 12px; color: #64748b; }
.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 18px; margin-top: 25px; }
.summary div { background: #f8fafc; padding: 15px; border-radius: 12px; text-align: center; transition: .2s; }
.summary div:hover { background: #f1f5f9; transform: translateY(-2px); }
.summary label { display: block; color: #64748b; font-size: 13px; margin-bottom: 8px; font-weight: 500; }
.summary strong { font-size: 22px; color: #1e293b; }
.empty { padding: 60px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 12px; }
@media(max-width: 768px) { .chart { overflow-x: auto; justify-content: flex-start; padding-bottom: 10px; } .column { min-width: 70px; } .summary { grid-template-columns: repeat(2, 1fr); } }
</style>