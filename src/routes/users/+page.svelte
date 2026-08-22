<script lang="ts">
	import { goto } from '$app/navigation';

	interface User {
		id: string;
		employeeId: string;
		name: string;
		email: string;
		department: string;
		role: string;
		shift: string;
		status: 'Active' | 'Inactive';
		lastLogin: string;
	}

	let search = '';
	let selectedDepartment = 'All';
	let selectedRole = 'All';
	let selectedStatus = 'All';

	const departments = [
		'All',
		'Production',
		'Quality',
		'Engineering',
		'Maintenance',
		'Planning',
		'Warehouse',
		'HR',
		'Admin'
	];

	const roles = [
		'All',
		'Admin',
		'Manager',
		'Supervisor',
		'Engineer',
		'Operator'
	];

	const statusOptions = [
		'All',
		'Active',
		'Inactive'
	];

	let users: User[] = [];

	$: filteredUsers = users.filter((user) => {

		const matchesSearch =
			user.name.toLowerCase().includes(search.toLowerCase()) ||
			user.employeeId.toLowerCase().includes(search.toLowerCase()) ||
			user.email.toLowerCase().includes(search.toLowerCase());

		const matchesDepartment =
			selectedDepartment === 'All' ||
			user.department === selectedDepartment;

		const matchesRole =
			selectedRole === 'All' ||
			user.role === selectedRole;

		const matchesStatus =
			selectedStatus === 'All' ||
			user.status === selectedStatus;

		return (
			matchesSearch &&
			matchesDepartment &&
			matchesRole &&
			matchesStatus
		);

	});

	$: totalUsers = users.length;
	$: activeUsers = users.filter(u => u.status === 'Active').length;
	$: inactiveUsers = users.filter(u => u.status === 'Inactive').length;
	$: departmentsCount = new Set(users.map(u => u.department)).size;
</script>

<svelte:head>
	<title>User Management</title>
</svelte:head>

<div class="page">

	<div class="toolbar">

		<div>
			<h1>User Management</h1>
			<p>Manage employees, departments and permissions.</p>
		</div>

		<div class="actions">
			<button on:click={() => goto('/users/create')}>
				➕ New User
			</button>

			<button on:click={() => goto('/users/import')}>
				📥 Import
			</button>

			<button>
				📤 Export
			</button>
		</div>

	</div>

	<div class="stats">

		<div class="card">
			<h2>{totalUsers}</h2>
			<p>Total Users</p>
		</div>

		<div class="card active">
			<h2>{activeUsers}</h2>
			<p>Active</p>
		</div>

		<div class="card inactive">
			<h2>{inactiveUsers}</h2>
			<p>Inactive</p>
		</div>

		<div class="card">
			<h2>{departmentsCount}</h2>
			<p>Departments</p>
		</div>

	</div>

	<div class="filters">

		<input
			type="search"
			placeholder="Search employee..."
			bind:value={search}
		/>

		<select bind:value={selectedDepartment}>
			{#each departments as department}
				<option value={department}>{department}</option>
			{/each}
		</select>

		<select bind:value={selectedRole}>
			{#each roles as role}
				<option value={role}>{role}</option>
			{/each}
		</select>

		<select bind:value={selectedStatus}>
			{#each statusOptions as status}
				<option value={status}>{status}</option>
			{/each}
		</select>

	</div>

	<table>

		<thead>

			<tr>
				<th>Employee ID</th>
				<th>Name</th>
				<th>Department</th>
				<th>Role</th>
				<th>Shift</th>
				<th>Status</th>
				<th>Last Login</th>
				<th>Actions</th>
			</tr>

		</thead>

		<tbody>

			{#if filteredUsers.length === 0}

				<tr>
					<td colspan="8">
						No users found.
					</td>
				</tr>

			{:else}

				{#each filteredUsers as user}

					<tr>

						<td>{user.employeeId}</td>

						<td>
							<div>
								<strong>{user.name}</strong>
								<div>{user.email}</div>
							</div>
						</td>

						<td>{user.department}</td>

						<td>{user.role}</td>

						<td>{user.shift}</td>

						<td>
							<span class={user.status.toLowerCase()}>
								{user.status}
							</span>
						</td>

						<td>{user.lastLogin}</td>

						<td>

							<button on:click={() => goto(`/users/${user.id}`)}>
								View
							</button>

						</td>

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

.toolbar{
	display:flex;
	justify-content:space-between;
	align-items:center;
	flex-wrap:wrap;
	gap:20px;
}

.actions{
	display:flex;
	gap:12px;
}

.stats{
	display:grid;
	grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
	gap:20px;
}

.card{
	background:white;
	padding:20px;
	border-radius:12px;
	box-shadow:0 2px 8px rgba(0,0,0,.08);
}

.filters{
	display:grid;
	grid-template-columns:2fr 1fr 1fr 1fr;
	gap:16px;
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

.active{
	color:#16a34a;
}

.inactive{
	color:#dc2626;
}

@media(max-width:900px){

.filters{
	grid-template-columns:1fr;
}

.toolbar{
	flex-direction:column;
	align-items:flex-start;
}

}

</style>