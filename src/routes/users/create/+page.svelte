<script lang="ts">
	import { goto } from '$app/navigation';

	let employeeId = '';
	let firstName = '';
	let lastName = '';
	let email = '';
	let mobile = '';

	let department = '';
	let designation = '';
	let role = '';
	let shift = '';
	let manager = '';

	let username = '';
	let password = '';
	let confirmPassword = '';

	let status = 'Active';
	let profilePhoto: File | null = null;

	const departments = [
		'Production',
		'Quality',
		'Engineering',
		'Maintenance',
		'Warehouse',
		'Planning',
		'HR',
		'Finance',
		'Admin'
	];

	const roles = [
		'Admin',
		'Manager',
		'Supervisor',
		'Engineer',
		'Operator'
	];

	const shifts = [
		'General',
		'Shift A',
		'Shift B',
		'Shift C'
	];

	function saveUser() {

		// TODO
		// userService.createUser()

		alert('User created successfully.');

		goto('/users');

	}
</script>

<svelte:head>
	<title>Create User</title>
</svelte:head>

<div class="page">

	<h1>Create Employee</h1>

	<div class="grid">

		<section class="card">

			<h2>Employee Information</h2>

			<input placeholder="Employee ID" bind:value={employeeId} />
			<input placeholder="First Name" bind:value={firstName} />
			<input placeholder="Last Name" bind:value={lastName} />
			<input placeholder="Email" bind:value={email} />
			<input placeholder="Mobile" bind:value={mobile} />

		</section>

		<section class="card">

			<h2>Organization</h2>

			<select bind:value={department}>
				<option value="">Department</option>
				{#each departments as item}
					<option>{item}</option>
				{/each}
			</select>

			<input
				placeholder="Designation"
				bind:value={designation}
			/>

			<select bind:value={role}>
				<option value="">Role</option>
				{#each roles as item}
					<option>{item}</option>
				{/each}
			</select>

			<select bind:value={shift}>
				<option value="">Shift</option>
				{#each shifts as item}
					<option>{item}</option>
				{/each}
			</select>

			<input
				placeholder="Reporting Manager"
				bind:value={manager}
			/>

		</section>

		<section class="card">

			<h2>Account</h2>

			<input
				placeholder="Username"
				bind:value={username}
			/>

			<input
				type="password"
				placeholder="Password"
				bind:value={password}
			/>

			<input
				type="password"
				placeholder="Confirm Password"
				bind:value={confirmPassword}
			/>

			<select bind:value={status}>
				<option>Active</option>
				<option>Inactive</option>
			</select>

		</section>

		<section class="card">

			<h2>Profile</h2>

			<input
				type="file"
				on:change={(e) =>
					profilePhoto =
						(e.currentTarget as HTMLInputElement).files?.[0] ??
						null}
			/>

		</section>

	</div>

	<div class="actions">

		<button
			class="primary"
			on:click={saveUser}
		>
			Create User
		</button>

		<button
			on:click={() => goto('/users')}
		>
			Cancel
		</button>

	</div>

</div>

<style>
.page{
	display:flex;
	flex-direction:column;
	gap:24px;
}

.grid{
	display:grid;
	grid-template-columns:repeat(auto-fit,minmax(350px,1fr));
	gap:20px;
}

.card{
	background:white;
	padding:20px;
	border-radius:12px;
	display:flex;
	flex-direction:column;
	gap:12px;
}

input,
select{
	padding:12px;
	border:1px solid #ddd;
	border-radius:8px;
}

.actions{
	display:flex;
	gap:12px;
}

.primary{
	background:#2563eb;
	color:white;
}
</style>