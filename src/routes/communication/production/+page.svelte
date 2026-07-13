<script lang="ts">
	interface ProductionData {
		customer: string;
		model: string;
		line: string;
		shift: string;

		uph: number;
		target: number;
		actual: number;

		yield: number;
		rr: number;
		fpy: number;

		downtime: number;

		status: string;

		engineer: string;
		supervisor: string;

		majorIssue: string;
		actionTaken: string;
		supportRequired: string;

		remarks: string;
	}

	let data: ProductionData = {
		customer: "",
		model: "",
		line: "",
		shift: "A",

		uph: 1200,
		target: 0,
		actual: 0,

		yield: 99,
		rr: 0,
		fpy: 99,

		downtime: 0,

		status: "Running",

		engineer: "",
		supervisor: "",

		majorIssue: "",
		actionTaken: "",
		supportRequired: "",

		remarks: ""
	};

	let currentTime = new Date().toLocaleString();

	let achievement = 0;

	$: achievement =
		data.target > 0
			? Number(((data.actual / data.target) * 100).toFixed(2))
			: 0;

	function saveProduction() {
		alert("Save function will be connected to SQLite in Part 3");
	}

	function postProduction() {
		alert("Post Update will be connected in Part 3");
	}
</script>

<svelte:head>
	<title>Production Update</title>
</svelte:head>

<div class="page">

	<div class="pageHeader">
		<div>
			<h1>📈 Production Update</h1>
			<p>Real-Time Production Communication</p>
		</div>
		<div class="dateCard">
			<div>Current Time</div>
			<strong>{currentTime}</strong>
		</div>
	</div>

	<div class="kpiGrid">
		<div class="kpi green">
			<span>🎯 Target</span>
			<h2>{data.target}</h2>
		</div>
		<div class="kpi blue">
			<span>✅ Actual</span>
			<h2>{data.actual}</h2>
		</div>
		<div class="kpi purple">
			<span>📊 Achievement</span>
			<h2>{achievement}%</h2>
		</div>
		<div class="kpi orange">
			<span>⚡ UPH</span>
			<h2>{data.uph}</h2>
		</div>
		<div class="kpi cyan">
			<span>🟢 Yield</span>
			<h2>{data.yield}%</h2>
		</div>
		<div class="kpi red">
			<span>🔴 RR</span>
			<h2>{data.rr}%</h2>
		</div>
		<div class="kpi yellow">
			<span>⏱ DT</span>
			<h2>{data.downtime} min</h2>
		</div>
		<div class="kpi gray">
			<span>Status</span>
			<h2>{data.status}</h2>
		</div>
	</div>

	<div class="card">
		<h2>Production Information</h2>
		<div class="grid">
			<div>
				<label>Customer</label>
				<select bind:value={data.customer}>
					<option value="">Select</option>
					<option>Samsung</option>
					<option>Apple</option>
					<option>Xiaomi</option>
					<option>Motorola</option>
					<option>Nothing</option>
				</select>
			</div>
			<div>
				<label>Model</label>
				<input bind:value={data.model} />
			</div>
			<div>
				<label>Line</label>
				<input bind:value={data.line} />
			</div>
			<div>
				<label>Shift</label>
				<select bind:value={data.shift}>
					<option>A</option>
					<option>B</option>
					<option>C</option>
				</select>
			</div>
			<div>
				<label>UPH</label>
				<input type="number" bind:value={data.uph} />
			</div>
			<div>
				<label>Target Qty</label>
				<input type="number" bind:value={data.target} />
			</div>
			<div>
				<label>Actual Qty</label>
				<input type="number" bind:value={data.actual} />
			</div>
			<div>
				<label>Supervisor</label>
				<input bind:value={data.supervisor} />
			</div>
			<div>
				<label>Engineer</label>
				<input bind:value={data.engineer} />
			</div>
		</div>
	</div>

	<!-- =========================================
	QUALITY & PERFORMANCE
	========================================= -->
	<div class="card">
		<h2>📊 Quality & Performance</h2>
		<div class="grid">
			<div>
				<label>Yield (%)</label>
				<input type="number" step="0.01" bind:value={data.yield} />
			</div>
			<div>
				<label>RR (%)</label>
				<input type="number" step="0.01" bind:value={data.rr} />
			</div>
			<div>
				<label>FPY (%)</label>
				<input type="number" step="0.01" bind:value={data.fpy} />
			</div>
			<div>
				<label>Downtime (Minutes)</label>
				<input type="number" bind:value={data.downtime} />
			</div>
			<div>
				<label>Current Status</label>
				<select bind:value={data.status}>
					<option>Running</option>
					<option>Monitoring</option>
					<option>Line Stop</option>
					<option>Engineering Support</option>
					<option>Maintenance</option>
					<option>Material Waiting</option>
					<option>Quality Hold</option>
				</select>
			</div>
		</div>
	</div>

	<!-- =========================================
	COMMUNICATION
	========================================= -->
	<div class="card">
		<h2>💬 Communication</h2>
		<div>
			<label>Major Issue</label>
			<textarea
				rows="3"
				bind:value={data.majorIssue}
				placeholder="Describe today's major production issue..."
			></textarea>
		</div>
		<br />
		<div>
			<label>Action Taken</label>
			<textarea
				rows="3"
				bind:value={data.actionTaken}
				placeholder="Temporary / Permanent Action..."
			></textarea>
		</div>
		<br />
		<div>
			<label>Support Required</label>
			<textarea
				rows="3"
				bind:value={data.supportRequired}
				placeholder="Engineering / Quality / Maintenance / Material..."
			></textarea>
		</div>
		<br />
		<div>
			<label>Remarks</label>
			<textarea
				rows="4"
				bind:value={data.remarks}
				placeholder="Additional communication..."
			></textarea>
		</div>
	</div>

	<!-- =========================================
	ACTION BUTTONS
	========================================= -->
	<div class="card">
		<h2>⚡ Actions</h2>
		<div class="buttonRow">
			<button class="save" on:click={saveProduction}>💾 Save Draft</button>
			<button class="post" on:click={postProduction}>📤 Post Update</button>
			<button
				class="clear"
				on:click={() => {
					data.majorIssue = "";
					data.actionTaken = "";
					data.supportRequired = "";
					data.remarks = "";
				}}
			>
				🗑 Clear
			</button>
		</div>
	</div>

	<!-- =========================================
	ATTACHMENTS
	========================================= -->
	<div class="card">
		<h2>📎 Attachments</h2>
		<div class="uploadBox">
			<div class="uploadIcon">📁</div>
			<h3>Drag & Drop Files Here</h3>
			<p>Support: JPG, PNG, PDF, Excel, Word</p>
			<input
				type="file"
				multiple
				accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.doc,.docx"
			/>
		</div>
	</div>

	<!-- =========================================
	ESCALATION
	========================================= -->
	<div class="card">
		<h2>🚨 Escalation</h2>
		<div class="grid">
			<div>
				<label>Priority</label>
				<select>
					<option>Low</option>
					<option>Medium</option>
					<option selected>High</option>
					<option>Critical</option>
				</select>
			</div>
			<div>
				<label>Support Department</label>
				<select>
					<option>Production</option>
					<option>Engineering</option>
					<option>Quality</option>
					<option>Maintenance</option>
					<option>Planning</option>
					<option>Material</option>
					<option>Management</option>
				</select>
			</div>
			<div>
				<label>Need Approval</label>
				<select>
					<option>No</option>
					<option>Supervisor</option>
					<option>Manager</option>
					<option>Director</option>
				</select>
			</div>
		</div>
	</div>

	<!-- =========================================
	LIVE KPI SUMMARY
	========================================= -->
	<div class="card">
		<h2>📊 Live Summary</h2>
		<table class="summary">
			<thead>
				<tr>
					<th>Item</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>Target</td>
					<td>{data.target}</td>
				</tr>
				<tr>
					<td>Actual</td>
					<td>{data.actual}</td>
				</tr>
				<tr>
					<td>Achievement</td>
					<td>{achievement}%</td>
				</tr>
				<tr>
					<td>Yield</td>
					<td>{data.yield}%</td>
				</tr>
				<tr>
					<td>RR</td>
					<td>{data.rr}%</td>
				</tr>
				<tr>
					<td>FPY</td>
					<td>{data.fpy}%</td>
				</tr>
				<tr>
					<td>Downtime</td>
					<td>{data.downtime} Min</td>
				</tr>
				<tr>
					<td>Status</td>
					<td>{data.status}</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>

<style>
	.page {
		background: #0f172a;
		min-height: 100vh;
		padding: 25px;
		color: white;
		font-family: Segoe UI;
	}

	.pageHeader {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 25px;
	}

	.pageHeader p {
		color: #94a3b8;
	}

	.dateCard {
		background: #1e293b;
		padding: 18px;
		border-radius: 12px;
	}

	.kpiGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 18px;
		margin-bottom: 25px;
	}

	.kpi {
		padding: 20px;
		border-radius: 12px;
	}

	.kpi span {
		font-size: 13px;
		color: #e5e7eb;
	}

	.kpi h2 {
		margin-top: 12px;
		font-size: 30px;
	}

	.green { background: #15803d; }
	.blue { background: #2563eb; }
	.purple { background: #7c3aed; }
	.orange { background: #ea580c; }
	.red { background: #dc2626; }
	.yellow { background: #ca8a04; }
	.cyan { background: #0891b2; }
	.gray { background: #374151; }

	.card {
		background: #1e293b;
		padding: 25px;
		border-radius: 15px;
		margin-bottom: 20px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 18px;
		margin-top: 20px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: bold;
		color: #cbd5e1;
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 12px;
		border-radius: 8px;
		border: none;
		background: #334155;
		color: white;
		font-size: 15px;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: 2px solid #3b82f6;
	}

	.buttonRow {
		display: flex;
		gap: 15px;
		flex-wrap: wrap;
		margin-top: 20px;
	}

	.buttonRow button {
		flex: 1;
		min-width: 180px;
		padding: 14px;
		border: none;
		border-radius: 10px;
		color: white;
		cursor: pointer;
		font-size: 16px;
		font-weight: bold;
	}

	.save { background: #2563eb; }
	.post { background: #16a34a; }
	.clear { background: #dc2626; }

	.save:hover { background: #1d4ed8; }
	.post:hover { background: #15803d; }
	.clear:hover { background: #b91c1c; }

	.uploadBox {
		border: 2px dashed #475569;
		border-radius: 12px;
		padding: 40px;
		text-align: center;
		background: #334155;
	}

	.uploadIcon {
		font-size: 48px;
		margin-bottom: 10px;
	}

	.summary {
		width: 100%;
		border-collapse: collapse;
		margin-top: 15px;
	}

	.summary th {
		background: #334155;
		padding: 12px;
		text-align: left;
		font-weight: 600;
	}

	.summary td {
		padding: 12px;
		border-bottom: 1px solid #334155;
	}

	.summary tr:hover {
		background: #334155;
	}
</style>