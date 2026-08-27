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
	let meetings = $state<any[]>(data.meetings?? []);
	let actions = $state<any[]>(data.actions?? []);
	let downtime = $state<any[]>(data.downtime?? []);

	const ROUTES = {
		todayMeetings: '/meeting-list?filter=today',
		upcomingMeetings: '/meeting-list?filter=upcoming',
		actions: '/meeting-actions',
		reports: '/report-summary',
		downtime: '/machine-downtime',
		ai: '/ai-summary'
	};

	function navigate(path: string) { if (!path) return; goto(path); }
	function getToday(): string { return new Date().toISOString().split('T')[0]; }
	function mapProduction(productionData: any[]) {
		return productionData.map((record) => {
			const values = record?.data && typeof record.data === 'object'? record.data : {};
			return {
				...record,
				date: record?.report_date?? record?.ts?.split?.('T')?.[0]?? getToday(),
				target: Number(record?.target?? values?.target?? 0),
				actual: Number(record?.actual?? values?.actual?? 0),
				ng: Number(record?.ng?? values?.ng?? 0),
				yield: Number(record?.yield?? values?.yield?? 0),
				oee: Number(record?.oee?? values?.oee?? 0)
			};
		}).filter((r) => r.target > 0 || r.actual > 0 || r.ng > 0 || r.yield > 0);
	}

	const production = $derived(mapProduction(data.production?? []));
	const stats = $derived(() => {
		const totalTarget = production.reduce((t, r) => t + Number(r?.target?? 0), 0);
		const totalActual = production.reduce((t, r) => t + Number(r?.actual?? 0), 0);
		const totalNG = production.reduce((t, r) => t + Number(r?.ng?? 0), 0);
		const yields = production.map((r) => Number(r?.yield?? 0)).filter((v) => v > 0);
		const avgYield = yields.length > 0? (yields.reduce((a,b)=>a+b,0)/yields.length).toFixed(1) : '0.0';
		const today = getToday();
		const todayMeetings = meetings.filter((m) => m?.meeting_date === today);
		const upcomingMeetings = meetings.filter((m) => m?.meeting_date && new Date(m.meeting_date) >= new Date());
		const pendingActions = actions.filter((a) => String(a?.status?? '').toLowerCase()!== 'completed');
		const totalDowntimeMinutes = downtime.filter((r) => r?.report_date === today).reduce((t, r) => t + Number(r?.duration_minutes?? 0), 0);
		return { production, meetings, actions, downtime, todayMeetings: todayMeetings.length, upcomingMeetings: upcomingMeetings.length, pendingActions: pendingActions.length, totalReports: production.length, totalTarget, totalActual, totalNG, avgYield, totalDowntimeMinutes };
	});
	const aiSummaryData = $derived(() => ({
		loading: false,
		production: { achievement: stats().totalTarget > 0? (stats().totalActual / stats().totalTarget) * 100 : 0, yield: Number(stats().avgYield), oee: 82.5 },
		actions: { pending: stats().pendingActions, overdue: actions.filter((a) => String(a?.status?? '').toLowerCase()!== 'completed' && a?.due_date && new Date(a.due_date) < new Date()).length },
		meetings: { today: stats().todayMeetings },
		issues: stats().totalDowntimeMinutes > 120? ['High downtime today'] : [],
		recommendations: ['Reduce changeover time', 'Complete pending actions']
	}));

	onMount(() => {
		if (!browser) return;
		const handleUpdate = () => window.location.reload();
		window.addEventListener('meetings:updated', handleUpdate);
		window.addEventListener('actions:updated', handleUpdate);
		return () => { window.removeEventListener('meetings:updated', handleUpdate); window.removeEventListener('actions:updated', handleUpdate); };
	});
</script>

<div class="app">
  <!-- 1. TOP FIXED -->
  <div class="top-fixed">
    <HeaderBar title="TORS" user={data.user} online={true} queueCount={0} notifications={0} chatUnread={0} />
  </div>

  <!-- 3. MIDDLE SCROLL ONLY -->
  <div class="scroll-area">
    {#if loading}<DashboardSkeleton />{:else if error}<ErrorCard title="Error" message={error} onretry={()=>window.location.reload()} />{:else}

    <AISummary summary={aiSummaryData()} />

    <!-- Quick 4 KPIs - Simple -->
    <div class="kpi-simple">
      <div class="k" onclick={()=>navigate(ROUTES.todayMeetings)}><span class="n">{stats().todayMeetings}</span><span class="l">Today Meet</span></div>
      <div class="k" onclick={()=>navigate(ROUTES.actions)}><span class="n" style="color:#dc2626">{stats().pendingActions}</span><span class="l">Pending</span></div>
      <div class="k" onclick={()=>navigate(ROUTES.reports)}><span class="n" style="color:#16a34a">{stats().totalReports}</span><span class="l">Reports</span></div>
      <div class="k" onclick={()=>navigate(ROUTES.downtime)}><span class="n" style="color:#ea580c">{stats().totalDowntimeMinutes}m</span><span class="l">Downtime</span></div>
    </div>

    <!-- Production Totals - Clean -->
    <div class="totals">
      <div><b>{stats().totalTarget.toLocaleString()}</b><p>Target</p></div>
      <div><b style="color:#16a34a">{stats().totalActual.toLocaleString()}</b><p>Actual</p></div>
      <div><b style="color:#dc2626">{stats().totalNG.toLocaleString()}</b><p>NG</p></div>
      <div><b style="color:#2563eb">{stats().avgYield}%</b><p>Yield</p></div>
    </div>

    <!-- Summary Cards - Horizontal Scroll on mobile -->
    <div class="h-scroll">
      <ProductionSummary production={stats().production} />
      <MeetingSummary meetings={stats().meetings} />
      <ActionSummary actions={stats().actions} />
      <DowntimeSummary downtime={stats().downtime} />
    </div>

    <ProductionTrend production={stats().production} />

    <div class="grid-2">
      <RecentMeetings meetings={stats().meetings} />
      <RecentActions actions={stats().actions} />
    </div>

    {/if}
    <div style="height:20px"></div>
  </div>

  <!-- 2. BOTTOM FIXED -->
  <div class="bottom-fixed">
    <a href="/" class="b active">🏠<span>Home</span></a>
    <a href="/chat" class="b">💬<span>Chat</span></a>
    <a href="/report" class="b">📊<span>Report</span></a>
    <a href="/profile" class="b">👤<span>Me</span></a>
  </div>
</div>

<style>
.app{display:flex;flex-direction:column;height:100dvh;width:100vw;overflow:hidden;background:#f6f7fb;}
.top-fixed{flex:0 0 auto;background:white;border-bottom:1px solid #e2e8f0;z-index:30;}
.scroll-area{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px;display:flex;flex-direction:column;gap:12px;}
.bottom-fixed{flex:0 0 auto;height:56px;background:#111827;display:flex;justify-content:space-around;align-items:center;z-index:30;}

.kpi-simple{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.k{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;}
.k.n{font-size:20px;font-weight:800;color:#0f172a;}
.k.l{font-size:10px;color:#64748b;margin-top:2px;}

.totals{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:10px;}
.totals div{text-align:center;border-right:1px solid #f1f5f9;}
.totals div:last-child{border:none;}
.totals b{font-size:16px;display:block;}
.totals p{font-size:10px;color:#64748b;margin:2px 0 0;}

.h-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory;}
.h-scroll > :global(*){flex:0 0 280px;scroll-snap-align:start;}

.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}

.b{color:#9ca3af;text-decoration:none;font-size:18px;display:flex;flex-direction:column;align-items:center;line-height:1;}
.b span{font-size:9px;margin-top:2px;}
.b.active{color:white;}

@media(max-width:768px){
 .kpi-simple{grid-template-columns:repeat(2,1fr);}
 .totals{grid-template-columns:repeat(2,1fr);gap:0;}
 .totals div{padding:8px;border-bottom:1px solid #f1f5f9;}
 .grid-2{grid-template-columns:1fr;}
 .h-scroll > :global(*){flex:0 0 85vw;}
}
</style>