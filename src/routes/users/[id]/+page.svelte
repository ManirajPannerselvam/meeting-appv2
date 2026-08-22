<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	const userId = page.params.id;

	// TODO:
	// Load from userStore
	// userService.getUser(userId)

	const user = {
		id: userId,
		employeeId: 'EMP001',
		name: 'John Doe',
		email: 'john@example.com',
		mobile: '+91 9876543210',
		department: 'Production',
		designation: 'Production Engineer',
		role: 'Engineer',
		shift: 'Shift A',
		manager: 'Production Manager',
		status: 'Active',
		lastLogin: '2026-08-05 09:30'
	};

	const stats = {
		meetings: 28,
		actions: 52,
		completed: 47,
		pending: 5
	};
</script>

<svelte:head>
	<title>{user.name} - User Management</title>
</svelte:head>

<div class="page">
	<!-- ============================================================
	     HEADER
	     ============================================================ -->

	<div class="header">
		<div class="heading">
			<h1>{user.name}</h1>
			<p>{user.employeeId}</p>
		</div>

		<div class="actions">
			<button
				type="button"
				on:click={() => goto(`/users/${user.id}/edit`)}
			>
				✏️ Edit
			</button>

			<button
				type="button"
				on:click={() => goto(`/users/${user.id}/permissions`)}
			>
				🔐 Permissions
			</button>

			<button
				type="button"
				on:click={() => goto(`/users/${user.id}/activity`)}
			>
				📋 Activity
			</button>
		</div>
	</div>

	<!-- ============================================================
	     STATISTICS
	     ============================================================ -->

	<div class="stats">
		<div class="card">
			<span class="card-icon">📅</span>
			<div>
				<h2>{stats.meetings}</h2>
				<p>Meetings</p>
			</div>
		</div>

		<div class="card">
			<span class="card-icon">📋</span>
			<div>
				<h2>{stats.actions}</h2>
				<p>Actions</p>
			</div>
		</div>

		<div class="card success">
			<span class="card-icon">✅</span>
			<div>
				<h2>{stats.completed}</h2>
				<p>Completed</p>
			</div>
		</div>

		<div class="card warning">
			<span class="card-icon">⏳</span>
			<div>
				<h2>{stats.pending}</h2>
				<p>Pending</p>
			</div>
		</div>
	</div>

	<!-- ============================================================
	     INFORMATION GRID
	     ============================================================ -->

	<div class="grid">
		<!-- Employee Information -->
		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Employee Information</h2>
					<p>Basic employee details</p>
				</div>
			</div>

			<div class="table-wrapper">
				<table>
					<tbody>
						<tr>
							<td>Employee ID</td>
							<td>{user.employeeId}</td>
						</tr>

						<tr>
							<td>Name</td>
							<td>{user.name}</td>
						</tr>

						<tr>
							<td>Email</td>
							<td>{user.email}</td>
						</tr>

						<tr>
							<td>Mobile</td>
							<td>{user.mobile}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Organization -->
		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Organization</h2>
					<p>Role and reporting structure</p>
				</div>
			</div>

			<div class="table-wrapper">
				<table>
					<tbody>
						<tr>
							<td>Department</td>
							<td>{user.department}</td>
						</tr>

						<tr>
							<td>Designation</td>
							<td>{user.designation}</td>
						</tr>

						<tr>
							<td>Role</td>
							<td>{user.role}</td>
						</tr>

						<tr>
							<td>Shift</td>
							<td>{user.shift}</td>
						</tr>

						<tr>
							<td>Manager</td>
							<td>{user.manager}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Account -->
		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Account</h2>
					<p>Account status and activity</p>
				</div>
			</div>

			<div class="table-wrapper">
				<table>
					<tbody>
						<tr>
							<td>Status</td>
							<td>
								<span class="status active">
									{user.status}
								</span>
							</td>
						</tr>

						<tr>
							<td>Last Login</td>
							<td>{user.lastLogin}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<!-- Quick Links -->
		<section class="panel">
			<div class="panel-header">
				<div>
					<h2>Quick Links</h2>
					<p>Open user-related information</p>
				</div>
			</div>

			<div class="links">
				<button type="button">
					<span>📅</span>
					<span>Assigned Meetings</span>
				</button>

				<button type="button">
					<span>📋</span>
					<span>Assigned Actions</span>
				</button>

				<button type="button">
					<span>📊</span>
					<span>Reports</span>
				</button>

				<button type="button">
					<span>💬</span>
					<span>Chat History</span>
				</button>
			</div>
		</section>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 24px;
		width: 100%;
		box-sizing: border-box;
	}

	/* ============================================================
	   HEADER
	   ============================================================ */

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
	}

	.heading h1 {
		margin: 0;
		color: #0f172a;
		font-size: 2rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.heading p {
		margin: 6px 0 0;
		color: #64748b;
		font-size: 14px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.actions button {
		border: 1px solid #dbe3ef;
		background: white;
		color: #334155;
		padding: 10px 14px;
		border-radius: 9px;
		cursor: pointer;
		font-family: inherit;
		font-size: 14px;
		font-weight: 600;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.actions button:hover {
		background: #f8fafc;
		border-color: #94a3b8;
		transform: translateY(-1px);
	}

	.actions button:focus-visible,
	.links button:focus-visible {
		outline: 2px solid #2563eb;
		outline-offset: 2px;
	}

	/* ============================================================
	   STATISTICS
	   ============================================================ */

	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}

	.card {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
		padding: 20px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
		box-sizing: border-box;
	}

	.card-icon {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 12px;
		background: #eff6ff;
		font-size: 20px;
	}

	.card h2 {
		margin: 0;
		color: #0f172a;
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
	}

	.card p {
		margin: 6px 0 0;
		color: #64748b;
		font-size: 13px;
	}

	.card.success {
		border-left: 4px solid #16a34a;
	}

	.card.success .card-icon {
		background: #f0fdf4;
	}

	.card.warning {
		border-left: 4px solid #f59e0b;
	}

	.card.warning .card-icon {
		background: #fffbeb;
	}

	/* ============================================================
	   PANELS
	   ============================================================ */

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}

	.panel {
		min-width: 0;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 20px;
		box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
		box-sizing: border-box;
	}

	.panel-header {
		margin-bottom: 14px;
	}

	.panel-header h2 {
		margin: 0;
		color: #0f172a;
		font-size: 17px;
		font-weight: 700;
	}

	.panel-header p {
		margin: 4px 0 0;
		color: #64748b;
		font-size: 12px;
	}

	/* ============================================================
	   TABLES
	   ============================================================ */

	.table-wrapper {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	table {
		width: 100%;
		min-width: 320px;
		border-collapse: collapse;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	td {
		padding: 12px 8px;
		border-bottom: 1px solid #eef2f7;
		vertical-align: middle;
		font-size: 14px;
	}

	td:first-child {
		width: 42%;
		color: #64748b;
		font-weight: 600;
	}

	td:last-child {
		color: #0f172a;
		font-weight: 500;
		word-break: break-word;
	}

	/* ============================================================
	   STATUS
	   ============================================================ */

	.status {
		display: inline-flex;
		align-items: center;
		padding: 5px 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
	}

	.status.active {
		background: #dcfce7;
		color: #166534;
	}

	/* ============================================================
	   QUICK LINKS
	   ============================================================ */

	.links {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.links button {
		display: flex;
		align-items: center;
		gap: 9px;
		min-height: 48px;
		border: 1px solid #e2e8f0;
		background: #f8fafc;
		color: #334155;
		padding: 11px 12px;
		border-radius: 9px;
		cursor: pointer;
		font-family: inherit;
		font-size: 13px;
		font-weight: 600;
		text-align: left;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.links button:hover {
		background: #eff6ff;
		border-color: #bfdbfe;
		transform: translateY(-1px);
	}

	/* ============================================================
	   TABLET
	   ============================================================ */

	@media (max-width: 1000px) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* ============================================================
	   MOBILE
	   ============================================================ */

	@media (max-width: 640px) {
		.page {
			gap: 16px;
		}

		.header {
			align-items: flex-start;
		}

		.heading h1 {
			font-size: 1.5rem;
		}

		.actions {
			width: 100%;
			display: grid;
			grid-template-columns: 1fr;
		}

		.actions button {
			width: 100%;
		}

		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 10px;
		}

		.card {
			padding: 14px;
			gap: 10px;
		}

		.card-icon {
			width: 38px;
			height: 38px;
			font-size: 17px;
		}

		.card h2 {
			font-size: 23px;
		}

		.card p {
			font-size: 12px;
		}

		.panel {
			padding: 15px;
		}

		.links {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 380px) {
		.stats {
			grid-template-columns: 1fr;
		}
	}
</style>