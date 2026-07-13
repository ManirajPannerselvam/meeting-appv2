<script lang="ts">
	const templates = [
		{
			icon: "📈",
			title: "Production Update",
			description: "Update production target, actual, yield, RR and downtime.",
			color: "#16a34a",
			route: "/communication/production"
		},
		{
			icon: "🛠",
			title: "Engineering Issue",
			description: "Machine issue, breakdown, root cause and action.",
			color: "#2563eb",
			route: "/communication/engineering"
		},
		{
			icon: "🔍",
			title: "Quality Alert",
			description: "Defect, RR, NG Qty and containment action.",
			color: "#dc2626",
			route: "/communication/quality"
		},
		{
			icon: "⚙",
			title: "Maintenance Request",
			description: "Machine repair, spare replacement and PM support.",
			color: "#ea580c",
			route: "/communication/maintenance"
		},
		{
			icon: "📦",
			title: "Material Shortage",
			description: "Material shortage and supplier ETA.",
			color: "#9333ea",
			route: "/communication/material"
		},
		{
			icon: "🔄",
			title: "Shift Handover",
			description: "Transfer pending issues to the next shift.",
			color: "#0891b2",
			route: "/communication/handover"
		},
		{
			icon: "📊",
			title: "Daily KPI Report",
			description: "Daily production KPI summary.",
			color: "#0f766e",
			route: "/communication/kpi"
		},
		{
			icon: "🚨",
			title: "Escalation Report",
			description: "Escalate critical production issues.",
			color: "#b91c1c",
			route: "/communication/escalation"
		}
	];
</script>

<h1>EMS Communication Center</h1>

<div class="grid">
	{#each templates as item}
		<div class="card">
			<div class="icon" style="background:{item.color}">
				{item.icon}
			</div>

			<h2>{item.title}</h2>

			<p>{item.description}</p>

			<button>
				Open
			</button>
		</div>
	{/each}
</div>

<style>
	h1{
		color:white;
		margin-bottom:25px;
	}

	.grid{
		display:grid;
		grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
		gap:20px;
	}

	.card{
		background:#1f2937;
		border-radius:15px;
		padding:20px;
		color:white;
		border:1px solid #374151;
		transition:.25s;
	}

	.card:hover{
		transform:translateY(-5px);
		border-color:#3b82f6;
		box-shadow:0 10px 25px rgba(0,0,0,.3);
	}

	.icon{
		width:65px;
		height:65px;
		border-radius:15px;
		display:flex;
		align-items:center;
		justify-content:center;
		font-size:30px;
		margin-bottom:15px;
	}

	button{
		margin-top:20px;
		width:100%;
		padding:12px;
		background:#2563eb;
		border:none;
		color:white;
		font-size:15px;
		border-radius:8px;
		cursor:pointer;
	}
</style>