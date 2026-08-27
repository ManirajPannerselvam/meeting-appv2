<script lang="ts">
	import { onMount } from "svelte";
	import { getProductionReport } from "$lib/services/database";

	type ProductionData = Record<string, any>;

	type ProductionRecord = {
		id: number;
		reference_template_id: string;
		t_code: string;
		ts: string;
		shift: string | null;
		station: string | null;
		user_name: string | null;
		data: ProductionData;
		created_at: string;
	};

	type ProductionViewRow = ProductionRecord & {
		stationText: string;
		shiftText: string;
		templateText: string;
		userText: string;
		remarkText: string;
		input: number;
		output: number;
		yield: number;
		good: number;
		ng: number;
		difference: number;
		dateText: string;
		timestamp: number;
		searchText: string;
	};

	let reports: ProductionRecord[] = $state([]);
	let search = $state("");
	let stationFilter = $state("All");
	let shiftFilter = $state("All");
	let loading = $state(true);
	let error = $state("");
	let currentPage = $state(1);
	const pageSize = 15;
	const refreshInterval = 60000;

	async function load() {
		if (loading && reports.length > 0) return;
		loading = true;
		error = "";
		try {
			const data = await getProductionReport();
			const nextReports = Array.isArray(data)? (data as ProductionRecord[]) : [];
			reports = [...nextReports].sort((a, b) => {
				const dateA = new Date(a.ts || a.created_at).getTime();
				const dateB = new Date(b.ts || b.created_at).getTime();
				return (Number.isFinite(dateB)? dateB:0) - (Number.isFinite(dateA)? dateA:0);
			});
			currentPage = 1;
		} catch (err) {
			console.error("[Production Report] Load failed:", err);
			error = err instanceof Error? err.message : "Failed to load production reports";
			reports = [];
			currentPage = 1;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void load();
		const timer = setInterval(() => void load(), refreshInterval);
		return () => clearInterval(timer);
	});

	function numericValue(value: unknown): number {
		const n = Number(value);
		return Number.isFinite(n)? n : 0;
	}
	function textValue(value: unknown): string {
		if (typeof value === "string") return value.trim();
		if (value == null) return "";
		return String(value).trim();
	}

	// ITEM 7 FIX - Robust input/output mapping for ANY template
	function getDataField(row: ProductionRecord, keys: string[]): number {
		if(!row.data) return 0;
		for(const k of keys){
			if(row.data[k]!= null && row.data[k]!== "") return numericValue(row.data[k]);
			// case insensitive check
			const found = Object.keys(row.data).find(dk=> dk.toLowerCase() === k.toLowerCase());
			if(found && row.data[found]!=null) return numericValue(row.data[found]);
		}
		// fallback: first numeric field that looks like input/output
		return 0;
	}

	function stationValue(row: ProductionRecord): string { return textValue(row.station) || "Unknown"; }
	function shiftValue(row: ProductionRecord): string { return textValue(row.shift) || "Unknown"; }
	function templateValue(row: ProductionRecord): string { return textValue(row.t_code); }
	function userValue(row: ProductionRecord): string { return textValue(row.user_name); }
	function inputValue(row: ProductionRecord): number {
		return getDataField(row, ['input01','input','total_input','i','in_qty','input_qty','qty_input']);
	}
	function outputValue(row: ProductionRecord): number {
		return getDataField(row, ['output01','output','total_output','o','out_qty','output_qty','qty_output','good01','good']);
	}
	function yieldValue(input: number, output: number): number {
		if (input <= 0) return 0;
		return (output / input) * 100;
	}
	function remarkValue(row: ProductionRecord): string {
		return textValue(row.data?.remark01?? row.data?.remark?? row.data?.r?? "");
	}
	function goodValue(row: ProductionRecord): number { return getDataField(row, ['good01','good','good_qty']); }
	function ngValue(row: ProductionRecord): number { return getDataField(row, ['ng01','ng','ng_qty','reject']); }
	function dateSource(row: ProductionRecord): string { return textValue(row.ts) || textValue(row.created_at); }
	function timestampValue(row: ProductionRecord): number {
		const ts = new Date(dateSource(row)).getTime();
		return Number.isFinite(ts)? ts : 0;
	}
	function formattedDate(row: ProductionRecord): string {
		const source = dateSource(row);
		if (!source) return "-";
		const date = new Date(source);
		if (Number.isNaN(date.getTime())) return source;
		return date.toLocaleString();
	}
	function formatNumber(value: number): string { return value.toLocaleString(undefined, { maximumFractionDigits: 2 }); }
	function formatPercentage(value: number): string { return `${value.toFixed(2)}%`; }

	let viewRows: ProductionViewRow[] = $derived(reports.map<ProductionViewRow>((row) => {
		const stationText = stationValue(row);
		const shiftText = shiftValue(row);
		const templateText = templateValue(row);
		const userText = userValue(row);
		const remarkText = remarkValue(row);
		const input = inputValue(row);
		const output = outputValue(row);
		const good = goodValue(row);
		const ng = ngValue(row);
		const yieldPercentage = yieldValue(input, output);
		const difference = Math.max(0, input - output);
		const dateText = formattedDate(row);
		const timestamp = timestampValue(row);
		return {
			...row, stationText, shiftText, templateText, userText, remarkText,
			input, output, yield: yieldPercentage, good, ng, difference, dateText, timestamp,
			searchText: [templateText, stationText, shiftText, userText, remarkText].filter(Boolean).join(" ").toLowerCase()
		};
	}));

	let stations = $derived(["All",...Array.from(new Set(viewRows.map((row) => row.stationText))).sort((a, b) => a.localeCompare(b))]);
	let shifts = $derived(["All",...Array.from(new Set(viewRows.map((row) => row.shiftText))).sort((a, b) => a.localeCompare(b))]);
	let searchText = $derived(search.trim().toLowerCase());
	let filtered = $derived(viewRows.filter((row) => {
		const matchesSearch =!searchText || row.searchText.includes(searchText);
		const matchesStation = stationFilter === "All" || row.stationText === stationFilter;
		const matchesShift = shiftFilter === "All" || row.shiftText === shiftFilter;
		return matchesSearch && matchesStation && matchesShift;
	}));
	let totalInput = $derived(filtered.reduce((total, row) => total + row.input, 0));
	let totalOutput = $derived(filtered.reduce((total, row) => total + row.output, 0));
	let totalDifference = $derived(filtered.reduce((total, row) => total + row.difference, 0));
	let averageYield = $derived(totalInput > 0? (totalOutput / totalInput) * 100 : 0);
	let totalGood = $derived(filtered.reduce((total, row) => total + row.good, 0));
	let totalNG = $derived(filtered.reduce((total, row) => total + row.ng, 0));
	let templateCount = $derived(new Set(filtered.map((row) => row.templateText).filter(Boolean)).size);
	let stationCount = $derived(new Set(filtered.map((row) => row.stationText)).size);
	let totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	let paged = $derived(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));
	let startRecord = $derived(filtered.length === 0? 0 : (currentPage - 1) * pageSize + 1);
	let endRecord = $derived(Math.min(currentPage * pageSize, filtered.length));

	$effect(()=>{ if (currentPage > totalPages) currentPage = totalPages; });

	function reset() { search = ""; stationFilter = "All"; shiftFilter = "All"; currentPage = 1; }
	function previousPage() { if (currentPage > 1) currentPage -= 1; }
	function nextPage() { if (currentPage < totalPages) currentPage += 1; }
	function goToPage(page: number) { if (page >= 1 && page <= totalPages) currentPage = page; }
	function pageNumbers(): number[] {
		const pages: number[] = [];
		const start = Math.max(1, currentPage - 2);
		const end = Math.min(totalPages, currentPage + 2);
		for (let p = start; p <= end; p++) pages.push(p);
		return pages;
	}
</script>

<svelte:head>
	<title>Production Report</title>
	<meta name="description" content="Production records, input, output and yield reporting." />
</svelte:head>

<div class="page">
	<div class="header">
		<div>
			<div class="eyebrow">Temple Operations</div>
			<h1>🏭 Production Report</h1>
			<p>Production records, output, yield and operational performance.</p>
		</div>
		<button type="button" class="refresh" onclick={() => void load()} disabled={loading}>{loading? "Loading..." : "↻ Refresh"}</button>
	</div>

	<div class="toolbar">
		<div class="search-box">
			<span class="search-icon">🔎</span>
			<input bind:value={search} placeholder="Search station, template, shift, user..." aria-label="Search production records" />
		</div>
		<select bind:value={stationFilter} aria-label="Filter by station">
			{#each stations as station}<option value={station}>Station: {station}</option>{/each}
		</select>
		<select bind:value={shiftFilter} aria-label="Filter by shift">
			{#each shifts as shift}<option value={shift}>Shift: {shift}</option>{/each}
		</select>
		<button type="button" class="reset" onclick={reset}>Reset</button>
	</div>

	{#if error}
		<div class="error" role="alert">
			<div class="error-content"><strong>Unable to load production data.</strong><span>{error}</span></div>
			<button type="button" onclick={() => void load()} disabled={loading}>Try Again</button>
		</div>
	{/if}

	<div class="summary">
		<div class="summary-card"><span class="summary-label">Total Records</span><strong>{filtered.length.toLocaleString()}</strong><small>Filtered submissions</small></div>
		<div class="summary-card"><span class="summary-label">Total Input</span><strong>{formatNumber(totalInput)}</strong><small>Reported input</small></div>
		<div class="summary-card"><span class="summary-label">Total Output</span><strong>{formatNumber(totalOutput)}</strong><small>Reported output</small></div>
		<div class="summary-card"><span class="summary-label">Input − Output</span><strong>{formatNumber(totalDifference)}</strong><small>Reported difference</small></div>
		<div class="summary-card"><span class="summary-label">Yield</span><strong class:good-value={averageYield >= 99} class:warn-value={averageYield < 99}>{formatPercentage(averageYield)}</strong><small>Output / Input</small></div>
		<div class="summary-card"><span class="summary-label">NG Quantity</span><strong>{formatNumber(totalNG)}</strong><small>JSONB field when available</small></div>
	</div>

	<div class="secondary-summary">
		<div class="secondary-card"><span>Good Quantity</span><strong>{formatNumber(totalGood)}</strong></div>
		<div class="secondary-card"><span>Templates</span><strong>{templateCount.toLocaleString()}</strong></div>
		<div class="secondary-card"><span>Stations</span><strong>{stationCount.toLocaleString()}</strong></div>
		<div class="secondary-card"><span>Showing</span><strong>{filtered.length.toLocaleString()}</strong></div>
	</div>

	<div class="database-status">
		<div class="status-left"><span class="status-dot" class:offline-dot={!!error}></span><strong>Production records</strong><span class="database-name">public.records</span>{#if error}<span class="status-error">Unavailable</span>{:else}<span class="status-ok">Loaded</span>{/if}</div>
		<div class="status-right"><span>Auto refresh:</span><strong>60s</strong><span>Total:</span><strong>{reports.length.toLocaleString()}</strong></div>
	</div>

	<div class="table-card">
		<div class="table-header">
			<div><h2>Production Records</h2><span>{#if filtered.length > 0}Showing {startRecord.toLocaleString()} – {endRecord.toLocaleString()} of {filtered.length.toLocaleString()}{:else}No matching records{/if}</span></div>
			<div class="record-count">{reports.length.toLocaleString()} total</div>
		</div>

		{#if loading}
			<div class="loading" aria-live="polite"><div class="spinner"></div><span>Loading production records...</span></div>
		{:else}
			<div class="table-wrapper">
				<table>
					<thead><tr><th>Date</th><th>Template</th><th>Shift</th><th>Station</th><th>User</th><th class="number-header">Input</th><th class="number-header">Output</th><th>Yield</th><th>Remark</th></tr></thead>
					<tbody>
						{#if paged.length === 0}
							<tr><td colspan="9" class="empty"><div class="empty-content"><div class="empty-icon">📊</div><strong>No production records</strong><span>{reports.length === 0? "No records are currently available." : "Try changing your search or filters."}</span>{#if search || stationFilter!== "All" || shiftFilter!== "All"}<button type="button" class="empty-reset" onclick={reset}>Clear Filters</button>{/if}</div></td></tr>
						{:else}
							{#each paged as row (row.id)}
								<tr>
									<td><div class="date">{row.dateText}</div></td>
									<td><span class="template-code">{row.templateText || "-"}</span></td>
									<td><span class="shift">{row.shiftText || "-"}</span></td>
									<td><strong>{row.stationText || "-"}</strong></td>
									<td>{row.userText || "-"}</td>
									<td class="number">{formatNumber(row.input)}</td>
									<td class="number">{formatNumber(row.output)}</td>
									<td><span class="yield" class:good={row.yield >= 99} class:warn={row.yield < 99}>{formatPercentage(row.yield)}</span></td>
									<td class="remark">{row.remarkText || "-"}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#if !loading && filtered.length > 0}
		<div class="pagination">
			<button type="button" disabled={currentPage === 1} onclick={previousPage}>← Previous</button>
			<div class="page-numbers" aria-label="Pagination">
				{#each pageNumbers() as page}<button type="button" class:active-page={page === currentPage} aria-current={page === currentPage? "page" : undefined} onclick={() => goToPage(page)}>{page}</button>{/each}
			</div>
			<div class="page-info"><strong>{currentPage}</strong><span>of</span><strong>{totalPages}</strong></div>
			<button type="button" disabled={currentPage === totalPages} onclick={nextPage}>Next →</button>
		</div>
	{/if}
</div>

<style>
	:global(body) { margin: 0; background: #f8fafc; color: #0f172a; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
	.page { width: 100%; max-width: 1600px; margin: 0 auto; padding: 28px; box-sizing: border-box; }
	.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
	.eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
	h1 { margin: 0; font-size: clamp(24px, 3vw, 34px); line-height: 1.15; }
	.header p { margin: 8px 0 0; color: #64748b; }
	button, input, select { font: inherit; }
	.refresh,.reset,.pagination > button,.error button,.empty-reset { border: 0; border-radius: 10px; padding: 10px 16px; font-weight: 600; cursor: pointer; transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease; }
	.refresh { background: #2563eb; color: white; }.reset { background: #e2e8f0; color: #334155; }
	.refresh:hover:not(:disabled),.reset:hover,.pagination > button:hover:not(:disabled),.error button:hover:not(:disabled),.empty-reset:hover { transform: translateY(-1px); }
	button:disabled { cursor: not-allowed; opacity: 0.5; }
	.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
	.search-box { display: flex; align-items: center; gap: 8px; flex: 1 1 320px; min-width: 240px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; }
	.search-box:focus-within { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
	.search-box input { width: 100%; border: 0; outline: 0; padding: 12px 0; background: transparent; font-size: 14px; }
	.toolbar select { border: 1px solid #e2e8f0; background: white; border-radius: 10px; padding: 11px 12px; color: #334155; font-size: 14px; cursor: pointer; }
	.error { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
	.error-content { display: flex; flex-direction: column; gap: 3px; }
	.error button { margin-left: auto; background: #dc2626; color: white; }
	.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 14px; }
	.summary-card { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04); }
	.summary-label { display: block; color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
	.summary-card strong { display: block; font-size: 25px; line-height: 1.2; }
	.summary-card small { display: block; margin-top: 7px; color: #94a3b8; font-size: 11px; }
	.good-value,.good { color: #16a34a; }.warn-value,.warn { color: #dc2626; }
	.secondary-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
	.secondary-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 15px; color: #64748b; font-size: 13px; }
	.secondary-card strong { color: #0f172a; font-size: 16px; }
	.database-status { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 13px 16px; margin-bottom: 20px; color: #64748b; font-size: 13px; }
	.status-left,.status-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.status-left strong,.status-right strong { color: #334155; }
	.database-name { color: #94a3b8; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
	.status-dot { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 4px #dcfce7; }
	.status-dot.offline-dot { background: #dc2626; box-shadow: 0 0 0 4px #fee2e2; }
	.status-ok { color: #16a34a; font-weight: 600; }.status-error { color: #dc2626; font-weight: 600; }
	.table-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 3px 12px rgba(15, 23, 42, 0.05); }
	.table-header { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 18px 20px; border-bottom: 1px solid #e2e8f0; }
	.table-header h2 { margin: 0 0 4px; font-size: 18px; }.table-header span { color: #64748b; font-size: 13px; }
	.record-count { color: #64748b; font-size: 13px; font-weight: 600; white-space: nowrap; }
	.table-wrapper { width: 100%; overflow-x: auto; }
	table { width: 100%; min-width: 1050px; border-collapse: collapse; }
	th { background: #1e293b; color: white; text-align: left; padding: 13px 14px; font-size: 12px; font-weight: 700; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
	.number-header { text-align: right; }
	td { padding: 13px 14px; border-bottom: 1px solid #eef2f7; font-size: 13px; }
	tbody tr:hover { background: #f8fafc; }
	.date { white-space: nowrap; color: #475569; }
	.template-code { display: inline-flex; padding: 5px 8px; border-radius: 7px; background: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 12px; }
	.shift { display: inline-flex; min-width: 28px; justify-content: center; padding: 5px 7px; border-radius: 7px; background: #f1f5f9; color: #334155; font-weight: 700; }
	.number { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
	.yield { font-weight: 700; white-space: nowrap; }
	.remark { max-width: 280px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.empty { height: 280px; text-align: center; }
	.empty-content { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: #64748b; }
	.empty strong { color: #334155; font-size: 15px; }.empty-icon { font-size: 32px; margin-bottom: 4px; }
	.empty-reset { margin-top: 8px; background: #e2e8f0; color: #334155; }
	.loading { min-height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #64748b; }
	.spinner { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	.pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding-bottom: 10px; }
	.pagination > button { background: #2563eb; color: white; }
	.page-numbers { display: flex; align-items: center; gap: 5px; }
	.page-numbers button { min-width: 36px; height: 36px; padding: 0 8px; border: 1px solid #e2e8f0; border-radius: 9px; background: white; color: #334155; font-weight: 600; cursor: pointer; }
	.page-numbers button.active-page { border-color: #2563eb; background: #2563eb; color: white; }
	.page-info { display: flex; align-items: center; gap: 6px; padding: 0 8px; color: #64748b; white-space: nowrap; }
	.page-info strong { color: #0f172a; }
	@media (max-width: 700px) {.page { padding: 16px; }.header { flex-direction: column; }.refresh { width: 100%; }.summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }.secondary-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>