<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";

	const id = page.params.id;

	let loading = true;

	type Version = {
		id: number;
		version: number;
		status: string;
		created_by: string;
		created_at: string;
		change_log: string;
		current: boolean;
	};

	let versions: Version[] = [];

	onMount(async () => {

		// TODO:
		// versions =
		// await templateService.getVersions(id);

		versions = [

			{
				id: 1,
				version: 4,
				status: "Published",
				created_by: "Admin",
				created_at: "2026-08-05 09:10",
				change_log: "Added AI Summary section",
				current: true
			},

			{
				id: 2,
				version: 3,
				status: "Published",
				created_by: "Manager",
				created_at: "2026-08-01 15:20",
				change_log: "Added NG Quantity field",
				current: false
			},

			{
				id: 3,
				version: 2,
				status: "Archived",
				created_by: "Engineer",
				created_at: "2026-07-20 11:30",
				change_log: "Updated Production Layout",
				current: false
			},

			{
				id: 4,
				version: 1,
				status: "Archived",
				created_by: "Admin",
				created_at: "2026-07-10 09:00",
				change_log: "Initial Template",
				current: false
			}

		];

		loading = false;

	});

	function rollback(version: number) {

		if(confirm(`Rollback to Version ${version}?`)){

			alert(`Rollback to Version ${version}`);

			// TODO:
			// templateService.rollback()

		}

	}

	function compare(version: number){

		alert(`Compare Version ${version}`);

	}

	function download(version: number){

		alert(`Download Version ${version}`);

	}

</script>

<svelte:head>

	<title>Template Versions</title>

</svelte:head>

{#if loading}

<div class="loading">

Loading Versions...

</div>

{:else}

<div class="page">

	<div class="header">

		<div>

			<h1>Template Version History</h1>

			<p>

				View previous versions and rollback when required.

			</p>

		</div>

		<button
			on:click={() => goto(`/templates/${id}`)}
		>
			← Back
		</button>

	</div>

	<div class="timeline">

		{#each versions as item}

		<div class="card">

			<div class="left">

				<div class="version">

					V{item.version}

				</div>

				<div>

					<h3>

						Version {item.version}

						{#if item.current}

						<span class="current">

							Current

						</span>

						{/if}

					</h3>

					<p>

						{item.change_log}

					</p>

					<small>

						{item.created_by}

						•

						{item.created_at}

					</small>

				</div>

			</div>

			<div class="right">

				<div class="status">

					{item.status}

				</div>

				<div class="actions">

					<button
						class="blue"
						on:click={() => compare(item.version)}
					>
						Compare
					</button>

					<button
						class="green"
						on:click={() => download(item.version)}
					>
						Download
					</button>

					{#if !item.current}

					<button
						class="orange"
						on:click={() => rollback(item.version)}
					>
						Rollback
					</button>

					{/if}

				</div>

			</div>

		</div>

		{/each}

	</div>

</div>

{/if}

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
	flex-wrap:wrap;
}

.timeline{
	display:flex;
	flex-direction:column;
	gap:18px;
}

.card{
	display:flex;
	justify-content:space-between;
	align-items:center;
	background:white;
	padding:22px;
	border-radius:12px;
	box-shadow:0 2px 10px rgba(0,0,0,.08);
}

.left{
	display:flex;
	gap:20px;
	align-items:flex-start;
}

.version{
	width:70px;
	height:70px;
	border-radius:50%;
	background:#2563eb;
	color:white;
	display:flex;
	align-items:center;
	justify-content:center;
	font-size:20px;
	font-weight:bold;
}

.current{
	background:#16a34a;
	color:white;
	padding:2px 8px;
	border-radius:20px;
	font-size:12px;
	margin-left:10px;
}

.status{
	font-weight:bold;
	margin-bottom:12px;
	text-align:right;
}

.actions{
	display:flex;
	gap:8px;
	flex-wrap:wrap;
	justify-content:flex-end;
}

button{
	border:none;
	padding:10px 16px;
	border-radius:8px;
	color:white;
	cursor:pointer;
}

.blue{
	background:#2563eb;
}

.green{
	background:#16a34a;
}

.orange{
	background:#ea580c;
}

.loading{
	padding:80px;
	text-align:center;
	font-size:20px;
}

@media(max-width:900px){

.card{
	flex-direction:column;
	align-items:flex-start;
	gap:20px;
}

.right{
	width:100%;
}

.actions{
	justify-content:flex-start;
}

}

</style>