<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { getProductionReport } from "$lib/services/database";

	type ProductionRecord = {
		id: number;
		reference_template_id: string;
		t_code: string;
		ts: string;
		shift: string | null;
		station: string | null;
		user_name: string | null;
		data: Record<string, any>;
		created_at: string;
	};

	type StationSummary = {
		input: number;
		output: number;
		difference: number;
		yield: number;
		count: number;
	};

	type TemplateSummary = {
		code: string;
		count: number;
	};

	let reports: ProductionRecord[] = [];

	let loading = true;
	let error = "";

	let selectedShift = "All";
	let selectedTemplate = "All";
	let selectedStation = "All";

	// =====================================================
	// LOAD
	// =====================================================

	async function load() {
		loading = true;
		error = "";

		try {
			const data = await getProductionReport();

			reports = Array.isArray(data)
				? (data as ProductionRecord[])
				: [];
		} catch (err) {
			console.error("[Report Summary] Load failed:", err);

			error =
				err instanceof Error
					? err.message
					: "Failed to load production reports";

			reports = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();

		const timer = setInterval(load, 60000);

		return () => clearInterval(timer);
	});

	// =====================================================
	// JSONB VALUE HELPERS
	// =====================================================

	function inputValue(row: ProductionRecord): number {
		return Number(
			row.data?.input01 ??
				row.data?.input ??
				row.data?.i ??
				0
		);
	}

	function outputValue(row: ProductionRecord): number {
		return Number(
			row.data?.output01 ??
				row.data?.output ??
				row.data?.o ??
				0
		);
	}

	function yieldValue(row: ProductionRecord): number {
		const input = inputValue(row);
		const output = outputValue(row);

		if (input <= 0) {
			return 0;
		}

		return (output / input) * 100;
	}

	function stationValue(row: ProductionRecord): string {
		return row.station || "Unknown";
	}

	function shiftValue(row: ProductionRecord): string {
		return row.shift || row.data?.shift || "Unknown";
	}

	function templateValue(row: ProductionRecord): string {
		return row.t_code || "Unknown";
	}

	// =====================================================
	// FILTER OPTIONS
	// =====================================================

	$: shifts = [
		"All",
		...Array.from(
			new Set(
				reports.map((row) => shiftValue(row))
			)
		).sort()
	];

	$: templates = [
		"All",
		...Array.from(
			new Set(
				reports.map((row) => templateValue(row))
			)
		).sort()
	];

	$: stations = [
		"All",
		...Array.from(
			new Set(
				reports.map((row) => stationValue(row))
			)
		).sort()
	];

	// =====================================================
	// FILTERED REPORTS
	// =====================================================

	$: filteredReports = reports.filter((row) => {
		const shiftOk =
			selectedShift === "All" ||
			shiftValue(row) === selectedShift;

		const templateOk =
			selectedTemplate === "All" ||
			templateValue(row) === selectedTemplate;

		const stationOk =
			selectedStation === "All" ||
			stationValue(row) === selectedStation;

		return shiftOk && templateOk && stationOk;
	});

	// =====================================================
	// EXECUTIVE TOTALS
	// =====================================================

	$: totalInput = filteredReports.reduce(
		(total, row) => total + inputValue(row),
		0
	);

	$: totalOutput = filteredReports.reduce(
		(total, row) => total + outputValue(row),
		0
	);

	$: totalDifference = Math.max(
		0,
		totalInput - totalOutput
	);

	$: avgYield =
		totalInput > 0
			? ((totalOutput / totalInput) * 100).toFixed(2)
			: "0.00";

	$: totalRecords = filteredReports.length;

	$: totalStations = new Set(
		filteredReports.map((row) => stationValue(row))
	).size;

	$: totalTemplates = new Set(
		filteredReports.map((row) => templateValue(row))
	).size;

	// =====================================================
	// STATION SUMMARY
	// =====================================================

	$: byStation = (() => {
		const result: Record<string, StationSummary> = {};

		for (const row of filteredReports) {
			const station = stationValue(row);

			if (!result[station]) {
				result[station] = {
					input: 0,
					output: 0,
					difference: 0,
					yield: 0,
					count: 0
				};
			}

			const input = inputValue(row);
			const output = outputValue(row);

			result[station].input += input;
			result[station].output += output;
			result[station].difference += Math.max(
				0,
				input - output
			);
			result[station].yield += yieldValue(row);
			result[station].count += 1;
		}

		return result;
	})();

	$: stationEntries = Object.entries(byStation).sort(
		([, a], [, b]) => b.output - a.output
	);

	function stationYield(data: StationSummary): number {
		if (data.input <= 0) {
			return 0;
		}

		return (data.output / data.input) * 100;
	}

	// =====================================================
	// TEMPLATE SUMMARY
	// =====================================================

	$: byTemplate = (() => {
		const result: Record<string, TemplateSummary> = {};

		for (const row of filteredReports) {
			const code = templateValue(row);

			if (!result[code]) {
				result[code] = {
					code,
					count: 0
				};
			}

			result[code].count += 1;
		}

		return Object.values(result).sort(
			(a, b) => b.count - a.count
		);
	})();

	// =====================================================
	// LAST REPORT
	// =====================================================

	$: latestReport =
		filteredReports.length > 0
			? [...filteredReports].sort(
					(a, b) =>
						new Date(b.ts).getTime() -
						new Date(a.ts).getTime()
				)[0]
			: null;

	function formatDate(value: string | null | undefined) {
		if (!value) {
			return "-";
		}

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return "-";
		}

		return date.toLocaleString();
	}

	// =====================================================
	// FILTER RESET
	// =====================================================

	function resetFilters() {
		selectedShift = "All";
		selectedTemplate = "All";
		selectedStation = "All";
	}

	// =====================================================
	// VIEW STATION
	// =====================================================

	function viewStation(station: string) {
		goto(
			`/production-report?station=${encodeURIComponent(
				station
			)}`
		);
	}
</script>

<svelte:head>
	<title>Production Summary</title>
	<meta
		name="description"
		content="Executive production summary based on operational records."
	/>
</svelte:head>

<div class="page">

	<!-- =====================================================
	     HEADER
	     ===================================================== -->

	<div class="header">

		<div>
			<div class="eyebrow">
				Temple Operations
			</div>

			<h1>
				📊 Executive Production Summary
			</h1>

			<p>
				Production performance based on
				actual operational records.
			</p>
		</div>

		<button
			class="refresh"
			on:click={load}
			disabled={loading}
		>
			{loading ? "Loading..." : "↻ Refresh"}
		</button>

	</div>

	<!-- =====================================================
	     ERROR
	     ===================================================== -->

	{#if error}
		<div class="error">

			<div>
				<strong>
					Unable to load production data.
				</strong>

				<span>{error}</span>
			</div>

			<button on:click={load}>
				Try Again
			</button>

		</div>
	{/if}

	<!-- =====================================================
	     FILTERS
	     ===================================================== -->

	<div class="filters">

		<div class="filter-group">

			<label for="shift">
				Shift
			</label>

			<select
				id="shift"
				bind:value={selectedShift}
			>
				{#each shifts as shift}
					<option value={shift}>
						{shift}
					</option>
				{/each}
			</select>

		</div>

		<div class="filter-group">

			<label for="template">
				Template
			</label>

			<select
				id="template"
				bind:value={selectedTemplate}
			>
				{#each templates as template}
					<option value={template}>
						{template}
					</option>
				{/each}
			</select>

		</div>

		<div class="filter-group">

			<label for="station">
				Station
			</label>

			<select
				id="station"
				bind:value={selectedStation}
			>
				{#each stations as station}
					<option value={station}>
						{station}
					</option>
				{/each}
			</select>

		</div>

		<button
			class="reset"
			on:click={resetFilters}
		>
			Reset
		</button>

	</div>

	<!-- =====================================================
	     KPI CARDS
	     ===================================================== -->

	<div class="cards">

		<div class="card blue">
			<span>Total Records</span>

			<h2>
				{totalRecords.toLocaleString()}
			</h2>

			<p>
				Production submissions
			</p>
		</div>

		<div class="card green">
			<span>Total Input</span>

			<h2>
				{totalInput.toLocaleString()}
			</h2>

			<p>
				Reported production input
			</p>
		</div>

		<div class="card teal">
			<span>Total Output</span>

			<h2>
				{totalOutput.toLocaleString()}
			</h2>

			<p>
				Reported production output
			</p>
		</div>

		<div class="card cyan">
			<span>Yield</span>

			<h2>
				{avgYield}%
			</h2>

			<p>
				Output / Input
			</p>
		</div>

		<div class="card purple">
			<span>Stations</span>

			<h2>
				{totalStations.toLocaleString()}
			</h2>

			<p>
				Stations reporting
			</p>
		</div>

		<div class="card red">
			<span>Input − Output</span>

			<h2>
				{totalDifference.toLocaleString()}
			</h2>

			<p>
				Reported difference
			</p>
		</div>

	</div>

	<!-- =====================================================
	     SYSTEM STATUS
	     ===================================================== -->

	<div class="architecture">

		<div class="status-main">
			<span class="status-dot"></span>

			<strong>
				Live production data
			</strong>

			<span>
				records → JSONB
			</span>
		</div>

		<div>
			<strong>
				{totalTemplates}
			</strong>

			<span>
				templates
			</span>
		</div>

		<div>
			<strong>
				{totalStations}
			</strong>

			<span>
				stations
			</span>
		</div>

		{#if latestReport}
			<div class="latest">
				<strong>
					Last report
				</strong>

				<span>
					{formatDate(latestReport.ts)}
				</span>
			</div>
		{/if}

	</div>

	<!-- =====================================================
	     STATION PERFORMANCE
	     ===================================================== -->

	<div class="table-card">

		<div class="table-header">

			<div>
				<h2>
					Station Performance
				</h2>

				<span>
					Aggregated from actual production
					records
				</span>
			</div>

			<div class="record-count">
				{filteredReports.length.toLocaleString()}
				records
			</div>

		</div>

		{#if loading}

			<div class="loading">

				<div class="spinner"></div>

				<span>
					Loading production summary...
				</span>

			</div>

		{:else if stationEntries.length === 0}

			<div class="empty">

				<div class="empty-icon">
					📊
				</div>

				<strong>
					No production records
				</strong>

				<span>
					Production data will appear here
					after a report is submitted.
				</span>

			</div>

		{:else}

			<div class="table-wrapper">

				<table>

					<thead>
						<tr>
							<th>Station</th>
							<th>Records</th>
							<th>Input</th>
							<th>Output</th>
							<th>Difference</th>
							<th>Yield</th>
							<th></th>
						</tr>
					</thead>

					<tbody>

						{#each stationEntries as [station, data]}

							<tr>

								<td>
									<strong>
										{station}
									</strong>
								</td>

								<td>
									{data.count.toLocaleString()}
								</td>

								<td class="number">
									{data.input.toLocaleString()}
								</td>

								<td class="number">
									{data.output.toLocaleString()}
								</td>

								<td class="number">
									{data.difference.toLocaleString()}
								</td>

								<td>

									<span
										class="yield"
										class:good={
											stationYield(data) >= 99
										}
										class:warn={
											stationYield(data) < 99
										}
									>
										{stationYield(data).toFixed(2)}%
									</span>

								</td>

								<td>

									<button
										class="view"
										on:click={() =>
											viewStation(station)
										}
									>
										View
									</button>

								</td>

							</tr>

						{/each}

					</tbody>

				</table>

			</div>

		{/if}

	</div>

	<!-- =====================================================
	     TEMPLATE USAGE
	     ===================================================== -->

	<div class="template-card">

		<div class="table-header">

			<div>
				<h2>
					Template Usage
				</h2>

				<span>
					Reporting activity by template code
				</span>
			</div>

		</div>

		{#if byTemplate.length === 0}

			<div class="empty small">
				No template activity.
			</div>

		{:else}

			<div class="template-list">

				{#each byTemplate as template}

					<div class="template-row">

						<div>
							<strong>
								{template.code}
							</strong>

							<span>
								Operational template
							</span>
						</div>

						<strong>
							{template.count.toLocaleString()}
						</strong>

					</div>

				{/each}

			</div>

		{/if}

	</div>

</div>

<style>
	:global(body) {
		margin: 0;
		background: #f8fafc;
		color: #0f172a;
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			"Segoe UI",
			sans-serif;
	}

	.page {
		width: 100%;
		max-width: 1600px;
		margin: 0 auto;
		padding: 28px;
		box-sizing: border-box;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: 20px;
	}

	.eyebrow {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
		margin-bottom: 6px;
	}

	h1 {
		margin: 0;
		font-size: clamp(24px, 3vw, 34px);
	}

	.header p {
		margin: 8px 0 0;
		color: #64748b;
	}

	button,
	select {
		font: inherit;
	}

	.refresh,
	.view,
	.reset,
	.error button {
		border: 0;
		border-radius: 9px;
		padding: 10px 15px;
		font-weight: 600;
		cursor: pointer;
	}

	.refresh,
	.view {
		background: #2563eb;
		color: white;
	}

	.reset {
		background: #e2e8f0;
		color: #334155;
		align-self: end;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.refresh:hover:not(:disabled),
	.view:hover,
	.reset:hover {
		transform: translateY(-1px);
	}

	.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		flex-wrap: wrap;
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
		padding: 14px 16px;
		border-radius: 12px;
		margin-bottom: 20px;
	}

	.error div {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.error button {
		background: #dc2626;
		color: white;
	}

	/* =====================================================
	   FILTERS
	   ===================================================== */

	.filters {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		flex-wrap: wrap;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 15px;
		margin-bottom: 18px;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 160px;
	}

	.filter-group label {
		font-size: 12px;
		font-weight: 700;
		color: #475569;
	}

	.filter-group select {
		height: 40px;
		padding: 0 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
		color: #0f172a;
		min-width: 150px;
	}

	/* =====================================================
	   KPI CARDS
	   ===================================================== */

	.cards {
		display: grid;
		grid-template-columns:
			repeat(auto-fit, minmax(200px, 1fr));
		gap: 14px;
		margin: 20px 0;
	}

	.card {
		padding: 20px;
		border-radius: 15px;
		color: white;
		box-shadow:
			0 5px 16px rgba(15, 23, 42, 0.08);
	}

	.card span {
		display: block;
		font-size: 13px;
		font-weight: 600;
		opacity: 0.9;
	}

	.card h2 {
		margin: 8px 0;
		font-size: 30px;
		font-variant-numeric: tabular-nums;
	}

	.card p {
		margin: 0;
		font-size: 12px;
		opacity: 0.85;
	}

	.blue {
		background: #2563eb;
	}

	.green {
		background: #16a34a;
	}

	.teal {
		background: #0f766e;
	}

	.cyan {
		background: #0891b2;
	}

	.purple {
		background: #9333ea;
	}

	.red {
		background: #dc2626;
	}

	/* =====================================================
	   ARCHITECTURE STATUS
	   ===================================================== */

	.architecture {
		display: flex;
		align-items: center;
		gap: 24px;
		flex-wrap: wrap;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 15px 18px;
		margin-bottom: 20px;
		color: #64748b;
	}

	.architecture > div {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.architecture strong {
		color: #334155;
	}

	.status-main {
		margin-right: auto;
	}

	.status-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #22c55e;
		display: inline-block;
		box-shadow: 0 0 0 3px #dcfce7;
	}

	.latest {
		flex-direction: column;
		align-items: flex-start !important;
		gap: 2px !important;
	}

	.latest span {
		font-size: 12px;
	}

	/* =====================================================
	   TABLE
	   ===================================================== */

	.table-card,
	.template-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		overflow: hidden;
		box-shadow:
			0 4px 15px rgba(15, 23, 42, 0.05);
		margin-bottom: 20px;
	}

	.table-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 18px 20px;
		border-bottom: 1px solid #e2e8f0;
	}

	.table-header h2 {
		margin: 0 0 4px;
		font-size: 18px;
	}

	.table-header span {
		color: #64748b;
		font-size: 13px;
	}

	.record-count {
		font-size: 12px;
		font-weight: 700;
		color: #475569;
		background: #f1f5f9;
		padding: 7px 10px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.table-wrapper {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	table {
		width: 100%;
		min-width: 800px;
		border-collapse: collapse;
	}

	th {
		background: #1e293b;
		color: white;
		text-align: left;
		padding: 13px 14px;
		font-size: 12px;
		white-space: nowrap;
	}

	td {
		padding: 13px 14px;
		border-bottom: 1px solid #eef2f7;
		font-size: 13px;
		white-space: nowrap;
	}

	tbody tr:hover {
		background: #f8fafc;
	}

	.number {
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.yield {
		font-weight: 700;
	}

	.good {
		color: #16a34a;
	}

	.warn {
		color: #dc2626;
	}

	/* =====================================================
	   TEMPLATE USAGE
	   ===================================================== */

	.template-list {
		display: grid;
		grid-template-columns:
			repeat(auto-fit, minmax(220px, 1fr));
		gap: 1px;
		background: #e2e8f0;
	}

	.template-row {
		background: white;
		padding: 16px 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
	}

	.template-row div {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.template-row span {
		font-size: 12px;
		color: #64748b;
	}

	.template-row > strong {
		font-variant-numeric: tabular-nums;
		color: #2563eb;
	}

	/* =====================================================
	   LOADING / EMPTY
	   ===================================================== */

	.loading {
		min-height: 280px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 12px;
		color: #64748b;
	}

	.spinner {
		width: 28px;
		height: 28px;
		border: 3px solid #e2e8f0;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty {
		min-height: 280px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 8px;
		color: #64748b;
		text-align: center;
		padding: 30px;
	}

	.empty.small {
		min-height: 120px;
	}

	.empty strong {
		color: #334155;
	}

	.empty-icon {
		font-size: 34px;
	}

	/* =====================================================
	   MOBILE
	   ===================================================== */

	@media (max-width: 700px) {
		.page {
			padding: 16px;
		}

		.header {
			flex-direction: column;
		}

		.refresh {
			width: 100%;
		}

		.filters {
			display: grid;
			grid-template-columns: 1fr 1fr;
		}

		.filter-group {
			min-width: 0;
		}

		.filter-group select {
			width: 100%;
			min-width: 0;
			box-sizing: border-box;
		}

		.reset {
			width: 100%;
		}

		.cards {
			grid-template-columns: repeat(2, 1fr);
		}

		.card {
			padding: 15px;
		}

		.card h2 {
			font-size: 24px;
		}

		.architecture {
			align-items: flex-start;
			flex-direction: column;
			gap: 12px;
		}

		.status-main {
			margin-right: 0;
		}

		.table-header {
			align-items: flex-start;
			flex-direction: column;
		}

		.record-count {
			align-self: flex-start;
		}
	}

	@media (max-width: 430px) {
		.filters {
			grid-template-columns: 1fr;
		}

		.cards {
			grid-template-columns: 1fr;
		}
	}
</style>