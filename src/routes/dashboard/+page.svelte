<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	import ProductionSummary from '$lib/components/dashboard/ProductionSummary.svelte';
	import MeetingSummary from '$lib/components/dashboard/MeetingSummary.svelte';
	import ActionSummary from '$lib/components/dashboard/ActionSummary.svelte';
	import ReportSummary from '$lib/components/dashboard/ReportSummary.svelte';
	import RecentMeetings from '$lib/components/dashboard/RecentMeetings.svelte';
	import RecentActions from '$lib/components/dashboard/RecentActions.svelte';
	import ProductionTrend from '$lib/components/dashboard/ProductionTrend.svelte';
	import AISummary from '$lib/components/dashboard/AISummary.svelte';
	import DowntimeSummary from '$lib/components/dashboard/DowntimeSummary.svelte';
	import DashboardSkeleton from '$lib/components/dashboard/DashboardSkeleton.svelte';
	import ErrorCard from '$lib/components/ui/ErrorCard.svelte';
	import HeaderBar from '$lib/components/layout/HeaderBar.svelte';

	let { data } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	let meetings = $state<any[]>(data.meetings ?? []);
	let actions = $state<any[]>(data.actions ?? []);
	let downtime = $state<any[]>(data.downtime ?? []);

	const ROUTES = {
		todayMeetings: '/meeting-list?filter=today',
		upcomingMeetings: '/meeting-list?filter=upcoming',
	actions: '/meeting-actions',
		reports: '/report-summary',
	downtime: '/machine-downtime',
	ai: '/ai-summary'
	};

	function navigate(path: string) {
		if (!path) return;
		goto(path).catch((err) => console.error('[Dashboard] Navigation failed:', err));
	}

	function handleKeydown(e: KeyboardEvent, path: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			navigate(path);
	}
	}

	function getToday(): string {
		return new Date().toISOString().split('T')[0];
	}

	function mapProduction(productionData: any[]) {
		return productionData
			.map((record) => {
				const values = record?.data && typeof record.data === 'object' ? record.data : {};
				return {
					...record,
					date: record?.report_date ?? record?.ts?.split?.('T')?.[0] ?? getToday(),
					target: Number(record?.target ?? values?.target ?? values?.total_target ?? 0),
					actual: Number(record?.actual ?? values?.actual ?? values?.total_actual ?? 0),
					ng: Number(record?.ng ?? values?.ng ?? values?.total_ng ?? 0),
					yield: Number(record?.yield ?? values?.yield ?? values?.yield_percent ?? 0),
					oee: Number(record?.oee ?? values?.oee ?? 0)
				};
			})
			.filter((record) => record.target > 0 || record.actual > 0 || record.ng > 0 || record.yield > 0);
	}

	const production = $derived(mapProduction(data.production ?? []));

	// IMPORTANT: $derived with () returns a function
	const stats = $derived(() => {
		const totalTarget = production.reduce((total, row) => total + Number(row?.target ?? 0), 0);
		const totalActual = production.reduce((total, row) => total + Number(row?.actual ?? 0), 0);
		const totalNG = production.reduce((total, row) => total + Number(row?.ng ?? 0), 0);

		const yields = production.map((row) => Number(row?.yield ?? 0)).filter((value) => Number.isFinite(value) && value > 0);
		const avgYield = yields.length > 0 ? (yields.reduce((total, value) => total + value, 0) / yields.length).toFixed(2) : '0.00';

		const today = getToday();
		const todayMeetings = meetings.filter((meeting) => meeting?.meeting_date === today);
		const upcomingMeetings = meetings.filter((meeting) => {
			if (!meeting?.meeting_date) return false;
			const meetingDate = new Date(meeting.meeting_date);
			return !Number.isNaN(meetingDate.getTime()) && meetingDate >= new Date();
	});
		const completedMeetings = meetings.filter((meeting) => String(meeting?.status ?? '').toLowerCase() === 'completed');
		const pendingActions = actions.filter((action) => String(action?.status ?? '').toLowerCase() !== 'completed');
		const totalDowntimeMinutes = downtime.filter((row) => row?.report_date === today).reduce((total, row) => total + Number(row?.duration_minutes ?? 0), 0);

		return {
			production, meetings, actions, downtime,
			todayMeetings: todayMeetings.length,
			upcomingMeetings: upcomingMeetings.length,
			completedMeetings: completedMeetings.length,
			pendingActions: pendingActions.length,
			totalReports: production.length,
			totalTarget, totalActual, totalNG, avgYield, totalDowntimeMinutes
	};
	});

	const aiSummaryData = $derived(() => ({
		loading: false,
		production: {
			achievement: stats().totalTarget > 0 ? (stats().totalActual / stats().totalTarget) * 100 : 0,
			yield: Number(stats().avgYield),
			oee: 82.5
		},
		actions: {
			pending: stats().pendingActions,
			overdue: actions.filter((action) => {
				if (String(action?.status ?? '').toLowerCase() === 'completed') return false;
				if (!action?.due_date) return false;
				const dueDate = new Date(action.due_date);
				return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
			}).length
		},
	meetings: { today: stats().todayMeetings },
		issues: stats().totalDowntimeMinutes > 120 ? ['High downtime detected today'] : [],
		recommendations: ['Focus on reducing changeover time', 'Complete pending actions']
	}));

	onMount(() => {
		if (!browser) return;
		const handleUpdate = () => window.location.reload();
		window.addEventListener('meetings:updated', handleUpdate);
		window.addEventListener('actions:updated', handleUpdate);
		window.addEventListener('downtime:updated', handleUpdate);
		window.addEventListener('templates:updated', handleUpdate);
		return () => {
			window.removeEventListener('meetings:updated', handleUpdate);
			window.removeEventListener('actions:updated', handleUpdate);
			window.removeEventListener('downtime:updated', handleUpdate);
			window.removeEventListener('templates:updated', handleUpdate);
		};
	});

	function reloadDashboard() {
		window.location.reload();
	}
</script>

<div class="dashboard">
	<HeaderBar
		title="Temple Operations Reporting System"
		user={data.user}
		online={true}
		queueCount={0}
		notifications={0}
		chatUnread={0}
	/>

	{#if loading}
	<DashboardSkeleton />
	{:else if error}
	<ErrorCard title="Dashboard Error" message={error} on:retry={reloadDashboard} />
	{:else}
	<AISummary summary={aiSummaryData()} /> <!-- CALL IT -->

	<div class="top-cards">
			<ProductionSummary production={stats().production} /> <!-- CALL IT -->
			<MeetingSummary meetings={stats().meetings} />
			<ActionSummary actions={stats().actions} />
			<ReportSummary reports={stats().production} />
			<DowntimeSummary downtime={stats().downtime} />
		</div>

	<div class="kpi-grid">
			<div class="card blue clickable" role="button" tabindex="0" on:click={() => navigate(ROUTES.todayMeetings)} on:keydown={(e) => handleKeydown(e, ROUTES.todayMeetings)}>
				<h2>{stats().todayMeetings}</h2> <!-- CALL IT -->
				<p>Today's Meetings</p>
			</div>

			<div class="card green clickable" role="button" tabindex="0" on:click={() => navigate(ROUTES.upcomingMeetings)} on:keydown={(e) => handleKeydown(e, ROUTES.upcomingMeetings)}>
				<h2>{stats().upcomingMeetings}</h2>
				<p>Upcoming Meetings</p>
			</div>

			<div class="card red clickable" role="button" tabindex="0" on:click={() => navigate(ROUTES.actions)} on:keydown={(e) => handleKeydown(e, ROUTES.actions)}>
				<h2>{stats().pendingActions}</h2>
				<p>Pending Actions</p>
			</div>

			<div class="card orange clickable" role="button" tabindex="0" on:click={() => navigate(ROUTES.reports)} on:keydown={(e) => handleKeydown(e, ROUTES.reports)}>
				<h2>{stats().totalReports}</h2>
				<p>Production Reports</p>
			</div>

			<div class="card purple clickable" role="button" tabindex="0" on:click={() => navigate(ROUTES.downtime)} on:keydown={(e) => handleKeydown(e, ROUTES.downtime)}>
				<h2>{stats().totalDowntimeMinutes}</h2>
				<p>Today's Downtime (min)</p>
			</div>

			<div class="card dark clickable" role="button" tabindex="0" on:click={() => navigate(ROUTES.ai)} on:keydown={(e) => handleKeydown(e, ROUTES.ai)}>
				<h2>🤖</h2>
				<p>AI Executive Summary</p>
			</div>
	</div>

		<div class="middle-grid">
			<RecentMeetings meetings={stats().meetings} />
			<RecentActions actions={stats().actions} />
	</div>

	<ProductionTrend production={stats().production} />

		<div class="summary">
			<div>
				<b>Total Target</b>
				<p>{(stats().totalTarget ?? 0).toLocaleString()}</p> <!-- GUARD -->
			</div>
			<div>
				<b>Total Actual</b>
				<p>{(stats().totalActual ?? 0).toLocaleString()}</p>
			</div>
			<div>
				<b>Total NG</b>
				<p>{(stats().totalNG ?? 0).toLocaleString()}</p>
			</div>
			<div>
				<b>Average Yield</b>
				<p>{stats().avgYield}%</p>
			</div>
			<div>
				<b>Completed Meetings</b>
				<p>{stats().completedMeetings}</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.dashboard {
		width: 100%;
		min-height: 100%;
		padding: 20px;
		box-sizing: border-box;
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		margin-top: 20px;
	}

	.card {
		padding: 20px;
		border-radius: 14px;
		background: white;
		border: 1px solid #e2e8f0;
		box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.clickable {
		cursor: pointer;
		user-select: none;
	}

	.clickable:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
	}

	.clickable:focus-visible {
		outline: 3px solid rgba(37, 99, 235, 0.35);
		outline-offset: 2px;
	}

	.card h2 {
		margin: 0 0 6px;
		font-size: 28px;
		font-weight: 700;
	}

	.card p {
		margin: 0;
		color: #64748b;
	}

	.blue { border-left: 4px solid #2563eb; }
	.green { border-left: 4px solid #16a34a; }
	.red { border-left: 4px solid #dc2626; }
	.orange { border-left: 4px solid #ea580c; }
	.purple { border-left: 4px solid #9333ea; }
	.dark { border-left: 4px solid #334155; }

	.top-cards, .middle-grid {
		display: grid;
		gap: 16px;
		margin-top: 20px;
	}

	.top-cards { grid-template-columns: repeat(5, minmax(0, 1fr)); }
	.middle-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

	.summary {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 16px;
		margin-top: 20px;
	}

	.summary > div {
		padding: 18px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
	}

	.summary b {
		display: block;
		color: #475569;
		font-size: 13px;
	}

	.summary p {
		margin: 8px 0 0;
		color: #0f172a;
		font-size: 24px;
		font-weight: 700;
	}

	@media (max-width: 1100px) {
		.top-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	}

	@media (max-width: 800px) {
		.dashboard { padding: 14px; }
		.kpi-grid, .middle-grid { grid-template-columns: 1fr; }
		.summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}

	@media (max-width: 600px) {
		.dashboard { padding: 10px; }
		.top-cards, .summary { grid-template-columns: 1fr; }
		.card { padding: 16px; }
	}
</style>