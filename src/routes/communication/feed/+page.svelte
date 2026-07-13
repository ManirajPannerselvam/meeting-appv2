<script lang="ts">
	interface FeedItem {
		id: number;
		type: string;
		icon: string;
		color: string;
		title: string;
		user: string;
		time: string;
		status: string;
		line: string;
		model: string;
		message: string;
	}

	let filter = "All";

	let feed: FeedItem[] = [
		{
			id: 1,
			type: "Production",
			icon: "📈",
			color: "#16a34a",
			title: "Production Update",
			user: "Production Engineer",
			time: "08:10",
			status: "Running",
			line: "L03",
			model: "Samsung A56",
			message: "Target 9600 | Actual 9450 | Yield 99.12% | RR 0.42%"
		},
		{
			id: 2,
			type: "Engineering",
			icon: "🛠",
			color: "#2563eb",
			title: "Engineering Issue",
			user: "Engineering",
			time: "09:20",
			status: "Pending",
			line: "AOI-03",
			model: "",
			message: "Camera calibration under validation."
		},
		{
			id: 3,
			type: "Quality",
			icon: "🔍",
			color: "#dc2626",
			title: "Quality Alert",
			user: "Quality",
			time: "10:15",
			status: "Monitoring",
			line: "L03",
			model: "Samsung A56",
			message: "Scratch defect increased. Containment completed."
		},
		{
			id: 4,
			type: "Maintenance",
			icon: "⚙",
			color: "#ea580c",
			title: "Maintenance",
			user: "Maintenance",
			time: "11:00",
			status: "Completed",
			line: "Conveyor",
			model: "",
			message: "Conveyor belt replaced successfully."
		},
		{
			id: 5,
			type: "Shift",
			icon: "🔄",
			color: "#0891b2",
			title: "Shift Handover",
			user: "Shift Leader",
			time: "15:30",
			status: "Open",
			line: "L03",
			model: "Samsung A56",
			message: "Pending fixture validation and vendor support."
		}
	];

	$: filteredFeed =
		filter === "All"
			? feed
			: feed.filter((item) => item.type === filter);
</script>

<svelte:head>
	<title>Communication Feed</title>
</svelte:head>

<div class="page">

	<div class="header">
		<h1>💬 Factory Communication Feed</h1>

		<select bind:value={filter}>
			<option>All</option>
			<option>Production</option>
			<option>Engineering</option>
			<option>Quality</option>
			<option>Maintenance</option>
			<option>Shift</option>
		</select>
	</div>

	{#each filteredFeed as item}
		<div class="card">

			<div class="top">

				<div class="icon" style="background:{item.color}">
					{item.icon}
				</div>

				<div class="title">
					<h3>{item.title}</h3>
					<small>{item.user}</small>
				</div>

				<div class="time">
					{item.time}
				</div>

			</div>

			<div class="info">

				<div>
					<strong>Line</strong><br>
					{item.line}
				</div>

				<div>
					<strong>Model</strong><br>
					{item.model || "-"}
				</div>

				<div>
					<strong>Status</strong><br>
					{item.status}
				</div>

			</div>

			<div class="message">
				{item.message}
			</div>

			<div class="actions">
				<button>👁 View</button>
				<button>💬 Reply</button>
				<button>📎 Attach</button>
			</div>

		</div>
	{/each}

</div>

<style>
.page{
	padding:24px;
	background:#0f172a;
	min-height:100vh;
	color:white;
	font-family:Segoe UI;
}

.header{
	display:flex;
	justify-content:space-between;
	align-items:center;
	margin-bottom:20px;
}

select{
	padding:10px;
	border-radius:8px;
	border:none;
	background:#334155;
	color:white;
}

.card{
	background:#1e293b;
	border-radius:12px;
	padding:18px;
	margin-bottom:16px;
	border:1px solid #334155;
}

.top{
	display:flex;
	align-items:center;
	gap:16px;
}

.icon{
	width:55px;
	height:55px;
	border-radius:12px;
	display:flex;
	align-items:center;
	justify-content:center;
	font-size:28px;
}

.title{
	flex:1;
}

.time{
	font-weight:bold;
	color:#93c5fd;
}

.info{
	display:grid;
	grid-template-columns:repeat(3,1fr);
	gap:12px;
	margin-top:16px;
	margin-bottom:16px;
}

.message{
	background:#111827;
	padding:12px;
	border-radius:8px;
}

.actions{
	display:flex;
	gap:10px;
	margin-top:16px;
}

button{
	padding:10px 16px;
	border:none;
	border-radius:8px;
	background:#2563eb;
	color:white;
	cursor:pointer;
}
</style>