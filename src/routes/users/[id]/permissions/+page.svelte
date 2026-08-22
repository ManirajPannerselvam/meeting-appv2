<script lang="ts">
	import { page } from '$app/state';

	const userId = page.params.id;

	interface Permission {
		module: string;
		view: boolean;
		create: boolean;
		edit: boolean;
		delete: boolean;
		export: boolean;
	}

	let role = "Engineer";

	const roles = [
		"Admin",
		"Manager",
		"Supervisor",
		"Engineer",
		"Operator",
		"Viewer"
	];

	let permissions: Permission[] = [
		{
			module: "Dashboard",
			view: true,
			create: false,
			edit: false,
			delete: false,
			export: false
		},
		{
			module: "Reports",
			view: true,
			create: true,
			edit: true,
			delete: false,
			export: true
		},
		{
			module: "Meetings",
			view: true,
			create: true,
			edit: true,
			delete: false,
			export: true
		},
		{
			module: "Chat",
			view: true,
			create: true,
			edit: true,
			delete: false,
			export: false
		},
		{
			module: "Users",
			view: false,
			create: false,
			edit: false,
			delete: false,
			export: false
		},
		{
			module: "Settings",
			view: false,
			create: false,
			edit: false,
			delete: false,
			export: false
		},
		{
			module: "Admin",
			view: false,
			create: false,
			edit: false,
			delete: false,
			export: false
		}
	];

	function savePermissions() {
		// TODO
		// userService.savePermissions(userId, role, permissions);

		alert("Permissions updated successfully.");
	}
</script>

<svelte:head>
	<title>User Permissions</title>
</svelte:head>

<div class="page">

	<div class="header">

		<div>
			<h1>Permissions</h1>
			<p>Configure access rights for this user.</p>
		</div>

		<button class="save" on:click={savePermissions}>
			Save Changes
		</button>

	</div>

	<div class="role">

		<label>User Role</label>

		<select bind:value={role}>
			{#each roles as item}
				<option>{item}</option>
			{/each}
		</select>

	</div>

	<table>

		<thead>

			<tr>
				<th>Module</th>
				<th>View</th>
				<th>Create</th>
				<th>Edit</th>
				<th>Delete</th>
				<th>Export</th>
			</tr>

		</thead>

		<tbody>

			{#each permissions as permission}

				<tr>

					<td>{permission.module}</td>

					<td><input type="checkbox" bind:checked={permission.view} /></td>

					<td><input type="checkbox" bind:checked={permission.create} /></td>

					<td><input type="checkbox" bind:checked={permission.edit} /></td>

					<td><input type="checkbox" bind:checked={permission.delete} /></td>

					<td><input type="checkbox" bind:checked={permission.export} /></td>

				</tr>

			{/each}

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

.role{
	display:flex;
	flex-direction:column;
	gap:8px;
	max-width:300px;
}

select{
	padding:10px;
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
	text-align:center;
}

th:first-child,
td:first-child{
	text-align:left;
}

.save{
	background:#2563eb;
	color:white;
	padding:12px 20px;
	border:none;
	border-radius:8px;
	cursor:pointer;
}

</style>