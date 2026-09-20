<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { getTemplateClient, getChatClient } from '$lib/supabase';

	import ProductionSummary from '$lib/components/dashboard/ProductionSummary.svelte';
	import MeetingSummary from '$lib/components/dashboard/MeetingSummary.svelte';
	import ActionSummary from '$lib/components/dashboard/ActionSummary.svelte';
	import RecentMeetings from '$lib/components/dashboard/RecentMeetings.svelte';
	import RecentActions from '$lib/components/dashboard/RecentActions.svelte';
	import ProductionTrend from '$lib/components/dashboard/ProductionTrend.svelte';
	import AISummary from '$lib/components/dashboard/AISummary.svelte';
	import DowntimeSummary from '$lib/components/dashboard/DowntimeSummary.svelte';
	import DashboardSkeleton from '$lib/components/dashboard/DashboardSkeleton.svelte';
	import ErrorCard from '$lib/components/ui/ErrorCard.svelte';

	let loading = $state(true);
	let errorMsg = $state<string | null>(null);
	let meetings: any[] = $state([]);
	let actions: any[] = $state([]);
	let production: any[] = $state([]);
	let downtime: any[] = $state([]);
	let user: any = $state(null);
	let selectedCard = $state<string | null>(null);
	let detailList: any[] = $state([]);

	const ROUTES = {
		todayMeetings: '/meetings?filter=today',
		actions: '/meetings',
		reports: '/reports'
	};

	function navigate(path: string) { goto(path); }
	function getToday(): string { return new Date().toISOString().split('T')[0]; }

	async function loadData() {
		if (!browser) return;
		loading = true;
		errorMsg = null;
		try {
			const chatClient = getChatClient();
			const tmplClient = getTemplateClient();

			const { data: { user: authUser } } = await chatClient.auth.getUser();
			user = authUser;

			// ✅ FIXED: Only fetch tables that EXIST - no production_reports
			const [meetRes, actionRes] = await Promise.allSettled([
				tmplClient.from('meetings').select('*').order('meeting_date', { ascending: false }).limit(50),
				tmplClient.from('meeting_actions').select('*').order('created_at', { ascending: false }).limit(50)
			]);

			if (meetRes.status === 'fulfilled' &&!meetRes.value.error) {
				meetings = meetRes.value.data || [];
			}

			if (actionRes.status === 'fulfilled' &&!actionRes.value.error) {
				actions = actionRes.value.data || [];
			}

			// Production comes from reports table if you have it, else empty
			production = [];
			downtime = [];

		} catch (e: any) {
			errorMsg = e.message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
		window.addEventListener('meetings:updated', loadData);
		return () => window.removeEventListener('meetings:updated', loadData);
	});

	let stats = $derived.by(() => {
		const today = getToday();
		const todayList = meetings.filter((m) => m?.meeting_date === today);
		const upcomingList = meetings.filter((m) => m?.meeting_date && new Date(m.meeting_date) >= new Date());
		const pendingList = actions.filter((a) => String(a?.status?? '').toLowerCase()!== 'completed');
		const overdueList = actions.filter((a) => String(a?.status?? '').toLowerCase()!== 'completed' && a?.due_date && new Date(a.due_date) < new Date());
		return {
			production, meetings, actions, downtime,
			todayMeetings: todayList.length,
			upcomingMeetings: upcomingList.length,
			pendingActions: pendingList.length,
			totalReports: production.length,
			totalTarget: 0, totalActual: 0, totalNG: 0, avgYield: '0.0', totalDowntimeMinutes: 0,
			todayList, upcomingList, pendingList, overdueList, todayDowntimeList: []
		};
	});

	let aiSummaryData = $derived({
		loading: false,
		production: { achievement: 0, yield: 0, oee: 0 },
		actions: { pending: stats.pendingActions, overdue: stats.overdueList.length },
		meetings: { today: stats.todayMeetings },
		issues: [],
		recommendations: ['Complete pending actions']
	});

	function openDetail(type: string) {
		selectedCard = type;
		if (type === 'today') detailList = stats.todayList;
		if (type === 'upcoming') detailList = stats.upcomingList;
		if (type === 'pending') detailList = stats.pendingList;
		if (type === 'overdue') detailList = stats.overdueList;
	}
</script>

<div class="dashboard-page">
	{#if loading}
		<DashboardSkeleton />
	{:else if errorMsg}
		<ErrorCard title="Error" message={errorMsg} onretry={loadData} />
	{:else}
	<AISummary summary={aiSummaryData} />
	<div class="kpi-simple">
		<button class="k" onclick={()=>openDetail('today')}><span class="n">{stats.todayMeetings}</span><span class="l">Today Meet</span></button>
		<button class="k" onclick={()=>openDetail('pending')}><span class="n" style="color:#dc2626">{stats.pendingActions}</span><span class="l">Pending</span></button>
		<button class="k" onclick={()=>openDetail('upcoming')}><span class="n" style="color:#16a34a">{stats.upcomingMeetings}</span><span class="l">Upcoming</span></button>
		<button class="k" onclick={()=>openDetail('overdue')}><span class="n" style="color:#ea580c">{stats.overdueList.length}</span><span class="l">Overdue</span></button>
	</div>

	<div class="h-scroll">
		<button class="card-btn" onclick={()=>openDetail('today')}><MeetingSummary meetings={stats.meetings} /></button>
		<button class="card-btn" onclick={()=>openDetail('pending')}><ActionSummary actions={stats.actions} /></button>
	</div>

	<ProductionTrend production={[]} />

	<div class="grid-2">
		<RecentMeetings meetings={stats.meetings} />
		<RecentActions actions={stats.actions} />
	</div>
	{/if}
</div>

{#if selectedCard}
<div class="modal-bg" role="dialog" aria-modal="true">
	<button class="bg-close" onclick={()=>selectedCard=null} aria-label="close"></button>
	<div class="modal">
		<div class="modal-head">
			<b>{selectedCard.toUpperCase()}</b>
			<button class="close-btn" onclick={()=>selectedCard=null}>✕</button>
		</div>
		<div class="modal-body">
			{#if detailList.length===0}
				<div class="empty"><p>🔒 No data.</p><small>{user?.email}</small></div>
			{:else}
				{#each detailList as item, i}
					<button class="detail-row" onclick={()=>{ selectedCard=null; if(item.id) navigate(`/meetings/${item.id}`); }}>
						<div class="detail-left"><b>{item.title?? item.action_title?? `Item ${i+1}`}</b><span>{item.meeting_date?? item.due_date?? ''}</span></div>
						<span class="arrow">›</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
.dashboard-page{display:flex;flex-direction:column;gap:12px;padding:10px;}
.kpi-simple{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.k{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;}
.k.n{font-size:20px;font-weight:800;}
.k.l{font-size:10px;color:#64748b;text-transform:uppercase;}
.h-scroll{display:flex;gap:10px;overflow-x:auto;}
.card-btn{flex:0 0 280px;border:none;background:transparent;padding:0;text-align:left;cursor:pointer;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;}
.bg-close{position:absolute;inset:0;border:none;background:transparent;}
.modal{background:white;border-radius:16px;width:100%;max-width:420px;max-height:85vh;display:flex;flex-direction:column;z-index:1;position:relative;}
.modal-head{display:flex;justify-content:space-between;padding:16px;border-bottom:1px solid #e2e8f0;}
.close-btn{border:none;background:#f1f5f9;width:28px;height:28px;border-radius:50%;cursor:pointer;}
.modal-body{padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;}
.detail-row{padding:12px;border:1px solid #f1f5f9;border-radius:10px;display:flex;justify-content:space-between;background:#f8fafc;width:100%;}
@media(max-width:768px){.kpi-simple{grid-template-columns:repeat(2,1fr);}.grid-2{grid-template-columns:1fr;}.card-btn{flex:0 0 85vw;}}
</style>