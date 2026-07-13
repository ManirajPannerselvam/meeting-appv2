<script lang="ts">

	let formulaName = "";
	let expression = "";

	const samples = [
		{
			name: "Yield %",
			exp: "(PassQty / TotalQty) * 100"
		},
		{
			name: "RR %",
			exp: "(RejectQty / TotalQty) * 100"
		},
		{
			name: "Achievement %",
			exp: "(Actual / Target) * 100"
		},
		{
			name: "FPY %",
			exp: "(FirstPass / Input) * 100"
		},
		{
			name: "OEE %",
			exp: "Availability * Performance * Quality"
		},
		{
			name: "Downtime %",
			exp: "(Downtime / ShiftTime) * 100"
		}
	];

	function useSample(sample: any) {
		formulaName = sample.name;
		expression = sample.exp;
	}

	function saveFormula() {
		alert("Formula saved (SQLite integration in next step)");
	}
</script>

<div class="panel">

	<h2>🧮 Formula Builder</h2>

	<p>Create reusable calculations for EMS templates.</p>

	<input
		placeholder="Formula Name"
		bind:value={formulaName}
	/>

	<textarea
		rows="4"
		bind:value={expression}
		placeholder="Example: (Actual / Target) * 100"
	></textarea>

	<button class="save" on:click={saveFormula}>
		💾 Save Formula
	</button>

	<h3>Common EMS Formulas</h3>

	<div class="grid">

		{#each samples as sample}

			<div class="card">

				<h4>{sample.name}</h4>

				<code>{sample.exp}</code>

				<button on:click={() => useSample(sample)}>
					Use Formula
				</button>

			</div>

		{/each}

	</div>

</div>

<style>

.panel{
	margin-top:25px;
	background:white;
	padding:25px;
	border-radius:18px;
	box-shadow:0 5px 18px rgba(0,0,0,.08);
}

input,
textarea{
	width:100%;
	padding:12px;
	margin-top:12px;
	margin-bottom:12px;
	border-radius:10px;
	border:1px solid #d6dbe5;
	font-size:14px;
}

.save{
	background:#16a34a;
	color:white;
	border:none;
	padding:12px;
	border-radius:10px;
	cursor:pointer;
	width:100%;
	font-weight:bold;
	margin-bottom:20px;
}

.grid{
	display:grid;
	grid-template-columns:repeat(auto-fill,minmax(250px,1fr));
	gap:15px;
}

.card{
	border:1px solid #e5e7eb;
	padding:15px;
	border-radius:12px;
	background:#f8fafc;
}

.card code{
	display:block;
	background:#eef2ff;
	padding:8px;
	margin:10px 0;
	border-radius:8px;
	font-size:13px;
}

.card button{
	background:#2563eb;
	color:white;
	border:none;
	padding:8px 14px;
	border-radius:8px;
	cursor:pointer;
}

</style>