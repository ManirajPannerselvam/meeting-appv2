<script lang="ts">
	import { page } from '$app/state';

	const userId = page.params.id;

	type Activity = {
		id: number;
		date: string;
		module: string;
		action: string;
		description: string;
		status: string;
	};

	let search = "";
	let moduleFilter = "All";

	const modules = [
		"All",
		"Authentication",
		"Meetings",
		"Reports",
		"Chat",
		"Dashboard",
		"Users",
		"Settings"
	];

	let activities: Activity[] = [
		{
			id: 1,
			date: "2026-08-05 09:15",
			module: "Authentication",
			action: "Login",
			description: "Logged into EMS",
			status: "Success"
		},
		{
			id: 2,
			date: "2026-08-05 09:45",
			module: "Meetings",
			action: "Created",
			description: "Created Daily Production Meeting",
			status: "Completed"
		},
		{
			id: 3,
			date: "2026-08-05 10:10",
			module: "Reports",
			action: "Generated",
			description: "Generated Production Report",
			status: "Completed"
		},
		{
			id: 4,
			date: "2026-08-05 11:30",
			module: "Chat",
			action: "Message",
			description: "Sent message to Production Team",
			status: "Completed"
		}
	];

	$: filtered = activities.filter(a => {

		const searchMatch =
			a.description.toLowerCase().includes(search.toLowerCase()) ||
			a.action.toLowerCase().includes(search.toLowerCase());

		const moduleMatch =
			moduleFilter === "All" ||
			a.module === moduleFilter;

		return searchMatch && moduleMatch;

	});
</script>

<svelte:head>
	<title>User Activity</title>
</svelte:head>

<div class="page">

	<div class="header">

		<div>
			<h1>User Activity</h1>
			<p>Complete audit trail for this employee.</p>
		</div>

		<button>
			Export Activity
		</button>

	</div>

	<div class="filters">

		<input
			type="search"
			placeholder="Search activity..."
			bind:value={search}
		/>

		<select bind:value={moduleFilter}>

			{#each modules as module}

				<option>{module}</option>

			{/each}

		</select>

	</div>

	<table>

		<thead>

			<tr>

				<th>Date</th>
				<th>Module</th>
				<th>Action</th>
				<th>Description</th>
				<th>Status</th>

			</tr>

		</thead>

		<tbody>

			{#if filtered.length === 0}

				<tr>
					<td colspan="5">
						No activity found.
					</td>
				</tr>

			{:else}

				{#each filtered as activity}

					<tr>

						<td>{activity.date}</td>

						<td>{activity.module}</td>

						<td>{activity.action}</td>

						<td>{activity.description}</td>

						<td>{activity.status}</td>

					</tr>

				{/each}

			{/if}

		</tbody>

	</table>

</div>

<style>

.page{
	display:flex;
	flex-direction:column;
	gap:24px;
}

.header{
	display:flex;
	justify-content:space-between;
	align-items:center;
}

.filters{
	display:grid;
	grid-template-columns:2fr 1fr;
	gap:16px;
}

input,
select{
	padding:10px;
	border:1px solid #ddd;
	border-radius:8px;
}

table{
	width:100%;
	border-collapse:collapse;
	background:white;
}

th,
td{
	padding:14px;
	border-bottom:1px solid #eee;
	text-align:left;
}

button{
	padding:10px 18px;
	background:#2563eb;
	color:white;
	border:none;
	border-radius:8px;
	cursor:pointer;
}

@media(max-width:768px){

.filters{
	grid-template-columns:1fr;
}

.header{
	flex-direction:column;
	align-items:flex-start;
	gap:12px;
}

}

</style>