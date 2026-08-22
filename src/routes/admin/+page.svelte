<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let loading = true;

	let statistics = {
		users: 125,
		activeUsers: 118,
		templates: 42,
		reports: 1685,
		meetings: 84,
		aiRequests: 3248,
		backups: 18,
		storage: '42 GB'
	};

	let health = {
		database: 'Healthy',
		api: 'Online',
		ai: 'Running',
		storage: 'Available'
	};

	let recentActivities = [
		{
			title: 'New User Created',
			user: 'Admin',
			time: '10 minutes ago'
		},
		{
			title: 'Template Published',
			user: 'Production Manager',
			time: '25 minutes ago'
		},
		{
			title: 'Backup Completed',
			user: 'System',
			time: '1 hour ago'
		},
		{
			title: 'AI Summary Generated',
			user: 'Quality',
			time: '2 hours ago'
		}
	];

	onMount(async () => {
		loading = false;
	});
</script>

<svelte:head>
	<title>Administration Dashboard</title>
</svelte:head>

<div class="page">

	<!-- ============================================================
	     HEADER
	     ============================================================ -->

	<div class="header">
		<div>
			<h1>🛠 Administration Dashboard</h1>
			<p>Enterprise Management Console</p>
		</div>
	</div>

	<!-- ============================================================
	     STATISTICS
	     ============================================================ -->

	<div class="cards">

		<div class="card blue">
			<h2>{statistics.users}</h2>
			<p>Total Users</p>
		</div>

		<div class="card green">
			<h2>{statistics.activeUsers}</h2>
			<p>Active Users</p>
		</div>

		<div class="card orange">
			<h2>{statistics.templates}</h2>
			<p>Templates</p>
		</div>

		<div class="card purple">
			<h2>{statistics.reports}</h2>
			<p>Reports</p>
		</div>

		<div class="card red">
			<h2>{statistics.meetings}</h2>
			<p>Meetings</p>
		</div>

		<div class="card dark">
			<h2>{statistics.aiRequests}</h2>
			<p>AI Requests</p>
		</div>

	</div>

	<!-- ============================================================
	     ADMIN PANELS
	     ============================================================ -->

	<div class="grid">

		<!-- QUICK ACTIONS -->

		<div class="panel">

			<h2>🚀 Quick Actions</h2>

			<button
				type="button"
				on:click={() => goto('/admin/users')}
			>
				User Management
			</button>

			<button
				type="button"
				on:click={() => goto('/admin/roles')}
			>
				Roles
			</button>

			<button
				type="button"
				on:click={() => goto('/admin/permissions')}
			>
				Permissions
			</button>

			<button
				type="button"
				on:click={() => goto('/admin/system')}
			>
				System Settings
			</button>

			<button
				type="button"
				on:click={() => goto('/admin/backups')}
			>
				Backup Center
			</button>

			<button
				type="button"
				on:click={() => goto('/admin/integrations')}
			>
				Integrations
			</button>

		</div>

		<!-- SYSTEM HEALTH -->

		<div class="panel">

			<h2>💚 System Health</h2>

			<table>
				<tbody>

					<tr>
						<td>Database</td>
						<td class="status healthy">
							<span class="status-dot"></span>
							{health.database}
						</td>
					</tr>

					<tr>
						<td>API</td>
						<td class="status healthy">
							<span class="status-dot"></span>
							{health.api}
						</td>
					</tr>

					<tr>
						<td>AI Service</td>
						<td class="status healthy">
							<span class="status-dot"></span>
							{health.ai}
						</td>
					</tr>

					<tr>
						<td>Storage</td>
						<td class="status healthy">
							<span class="status-dot"></span>
							{health.storage}
						</td>
					</tr>

					<tr>
						<td>Storage Used</td>
						<td>
							<strong>{statistics.storage}</strong>
						</td>
					</tr>

				</tbody>
			</table>

		</div>

	</div>

	<!-- ============================================================
	     RECENT ACTIVITIES
	     ============================================================ -->

	<div class="panel">

		<h2>📋 Recent Activities</h2>

		<div class="table-wrapper">

			<table>

				<thead>
					<tr>
						<th>Activity</th>
						<th>User</th>
						<th>Time</th>
					</tr>
				</thead>

				<tbody>

					{#each recentActivities as item}
						<tr>
							<td>{item.title}</td>
							<td>{item.user}</td>
							<td>{item.time}</td>
						</tr>
					{/each}

				</tbody>

			</table>

		</div>

	</div>

</div>

<style>
	/* ============================================================
	   PAGE
	   ============================================================ */

	.page {
		width: 100%;
		box-sizing: border-box;

		padding: 24px;

		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* ============================================================
	   HEADER
	   ============================================================ */

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;

		gap: 16px;
		flex-wrap: wrap;
	}

	.header h1 {
		margin: 0;

		color: #0f172a;

		font-size: 32px;
		font-weight: 700;
		line-height: 1.2;
	}

	.header p {
		margin: 8px 0 0;

		color: #64748b;

		font-size: 14px;
		line-height: 1.5;
	}

	/* ============================================================
	   STATISTICS CARDS
	   ============================================================ */

	.cards {
		display: grid;

		grid-template-columns:
			repeat(auto-fit, minmax(180px, 1fr));

		gap: 18px;
	}

	.card {
		min-width: 0;

		padding: 22px;

		border-radius: 12px;

		color: white;

		box-shadow:
			0 8px 18px rgba(0, 0, 0, 0.08);
	}

	.card h2 {
		margin: 0;

		font-size: 34px;
		font-weight: 700;
		line-height: 1.1;
	}

	.card p {
		margin: 8px 0 0;

		font-size: 14px;
		opacity: 0.9;
	}

	.blue {
		background: #2563eb;
	}

	.green {
		background: #16a34a;
	}

	.orange {
		background: #ea580c;
	}

	.purple {
		background: #7c3aed;
	}

	.red {
		background: #dc2626;
	}

	.dark {
		background: #1e293b;
	}

	/* ============================================================
	   MAIN GRID
	   ============================================================ */

	.grid {
		display: grid;

		grid-template-columns: 1fr 1fr;

		gap: 20px;

		min-width: 0;
	}

	/* ============================================================
	   PANELS
	   ============================================================ */

	.panel {
		min-width: 0;

		background: white;

		padding: 20px;

		border-radius: 12px;

		box-shadow:
			0 8px 18px rgba(0, 0, 0, 0.08);

		box-sizing: border-box;
	}

	.panel h2 {
		margin: 0 0 18px;

		color: #0f172a;

		font-size: 20px;
		font-weight: 700;
	}

	/* ============================================================
	   QUICK ACTIONS
	   ============================================================ */

	button {
		display: block;

		width: 100%;

		margin-bottom: 10px;

		padding: 12px 14px;

		border: none;

		border-radius: 8px;

		background: #2563eb;

		color: white;

		cursor: pointer;

		font-family: inherit;
		font-size: 14px;
		font-weight: 600;

		transition:
			background 0.15s ease,
			transform 0.15s ease;
	}

	button:last-child {
		margin-bottom: 0;
	}

	button:hover {
		background: #1d4ed8;

		transform: translateY(-1px);
	}

	button:active {
		transform: translateY(0);
	}

	button:focus-visible {
		outline: 2px solid #60a5fa;
		outline-offset: 2px;
	}

	/* ============================================================
	   TABLE
	   ============================================================ */

	.table-wrapper {
		width: 100%;

		overflow-x: auto;
	}

	table {
		width: 100%;

		border-collapse: collapse;

		min-width: 420px;
	}

	th,
	td {
		padding: 11px 10px;

		border-bottom: 1px solid #e5e7eb;

		text-align: left;

		font-size: 14px;
	}

	th {
		background: #f8fafc;

		color: #475569;

		font-weight: 700;
	}

	td {
		color: #334155;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: #f8fafc;
	}

	/* ============================================================
	   HEALTH STATUS
	   ============================================================ */

	.status {
		display: inline-flex;

		align-items: center;

		gap: 7px;

		font-weight: 600;
	}

	.status-dot {
		width: 8px;
		height: 8px;

		border-radius: 50%;

		background: #16a34a;

		flex-shrink: 0;
	}

	.status.healthy {
		color: #15803d;
	}

	/* ============================================================
	   TABLET
	   ============================================================ */

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* ============================================================
	   MOBILE
	   ============================================================ */

	@media (max-width: 768px) {
		.page {
			padding: 16px;

			gap: 18px;
		}

		.header h1 {
			font-size: 24px;
		}

		.header p {
			font-size: 13px;
		}

		.cards {
			grid-template-columns:
				repeat(2, minmax(0, 1fr));

			gap: 12px;
		}

		.card {
			padding: 16px;
		}

		.card h2 {
			font-size: 26px;
		}

		.card p {
			font-size: 12px;
		}

		.panel {
			padding: 16px;
		}

		.panel h2 {
			font-size: 18px;
		}
	}

	/* ============================================================
	   SMALL MOBILE
	   ============================================================ */

	@media (max-width: 420px) {
		.page {
			padding: 12px;
		}

		.cards {
			grid-template-columns: 1fr;
		}

		.card h2 {
			font-size: 28px;
		}

		th,
		td {
			padding: 9px 8px;
			font-size: 13px;
		}
	}
</style>