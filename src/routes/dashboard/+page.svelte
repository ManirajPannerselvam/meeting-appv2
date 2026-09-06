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

	let selectedCard = $state<string | null>(null);
	let detailList = $state<any[]>([]);

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
		const todayList = meetings.filter((m) => m?.meeting_date === today);
		const upcomingList = meetings.filter((m) => m?.meeting_date && new Date(m.meeting_date) >= new Date());
		const pendingList = actions.filter((a) => String(a?.status?? '').toLowerCase()!== 'completed');
		const overdueList = actions.filter((a) => String(a?.status?? '').toLowerCase()!== 'completed' && a?.due_date && new Date(a.due_date) < new Date());
		const todayDowntimeList = downtime.filter((r) => r?.report_date === today);
		const totalDowntimeMinutes = todayDowntimeList.reduce((t, r) => t + Number(r?.duration_minutes?? 0), 0);
		return {
			production, meetings, actions, downtime,
			todayMeetings: todayList.length,
			upcomingMeetings: upcomingList.length,
			pendingActions: pendingList.length,
			totalReports: production.length,
			totalTarget, totalActual, totalNG, avgYield, totalDowntimeMinutes,
			todayList, upcomingList, pendingList, overdueList, todayDowntimeList
		};
	});

	const aiSummaryData = $derived(() => ({
		loading: false,
		production: { achievement: stats().totalTarget > 0? (stats().totalActual / stats().totalTarget) * 100 : 0, yield: Number(stats().avgYield), oee: 82.5 },
		actions: { pending: stats().pendingActions, overdue: stats().overdueList.length },
		meetings: { today: stats().todayMeetings },
		issues: stats().totalDowntimeMinutes > 120? ['High downtime today'] : [],
		recommendations: ['Reduce changeover time', 'Complete pending actions']
	}));

	function openDetail(type: string) {
		selectedCard = type;
		if (type === 'today') detailList = stats().todayList;
		if (type === 'upcoming') detailList = stats().upcomingList;
		if (type === 'pending') detailList = stats().pendingList;
		if (type === 'overdue') detailList = stats().overdueList;
		if (type === 'reports') detailList = production;
		if (type === 'downtime') detailList = stats().todayDowntimeList;
		if (type === 'target') detailList = production.slice(0,10);
	}

	onMount(() => {
		if (!browser) return;
		const handleUpdate = () => window.location.reload();
		window.addEventListener('meetings:updated', handleUpdate);
		window.addEventListener('actions:updated', handleUpdate);
		return () => { window.removeEventListener('meetings:updated', handleUpdate); window.removeEventListener('actions:updated', handleUpdate); };
	});
</script>

<div class="app">
  <div class="top-fixed">
    <HeaderBar title="TORS" user={data.user} online={true} queueCount={0} notifications={0} chatUnread={0} />
  </div>

  <div class="scroll-area">
    {#if loading}<DashboardSkeleton />{:else if error}<ErrorCard title="Error" message={error} onretry={()=>window.location.reload()} />{:else}

    <AISummary summary={aiSummaryData()} />

    <div class="kpi-simple">
      <div class="k" onclick={()=>openDetail('today')}>
        <span class="n">{stats().todayMeetings}</span>
        <span class="l">Today Meet</span>
        <small>my meetings • view</small>
      </div>
      <div class="k" onclick={()=>openDetail('pending')}>
        <span class="n" style="color:#dc2626">{stats().pendingActions}</span>
        <span class="l">Pending</span>
        <small>my tasks • view</small>
      </div>
      <div class="k" onclick={()=>openDetail('reports')}>
        <span class="n" style="color:#16a34a">{stats().totalReports}</span>
        <span class="l">My Reports</span>
        <small>click to view</small>
      </div>
      <div class="k" onclick={()=>openDetail('downtime')}>
        <span class="n" style="color:#ea580c">{stats().totalDowntimeMinutes}m</span>
        <span class="l">Downtime</span>
        <small>today • view</small>
      </div>
    </div>

    <div class="totals">
      <div onclick={()=>openDetail('target')}><b>{stats().totalTarget.toLocaleString()}</b><p>Target</p></div>
      <div onclick={()=>openDetail('reports')}><b style="color:#16a34a">{stats().totalActual.toLocaleString()}</b><p>Actual</p></div>
      <div><b style="color:#dc2626">{stats().totalNG.toLocaleString()}</b><p>NG</p></div>
      <div><b style="color:#2563eb">{stats().avgYield}%</b><p>Yield</p></div>
    </div>

    <div class="h-scroll">
      <div onclick={()=>openDetail('reports')}><ProductionSummary production={stats().production} /></div>
      <div onclick={()=>openDetail('today')}><MeetingSummary meetings={stats().meetings} /></div>
      <div onclick={()=>openDetail('pending')}><ActionSummary actions={stats().actions} /></div>
      <div onclick={()=>openDetail('downtime')}><DowntimeSummary downtime={stats().downtime} /></div>
    </div>

    <ProductionTrend production={stats().production} />

    <div class="grid-2">
      <RecentMeetings meetings={stats().meetings} />
      <RecentActions actions={stats().actions} />
    </div>

    {/if}
    <div style="height:20px"></div>
  </div>

  <div class="bottom-fixed">
    <a href="/" class="b active">🏠<span>Home</span></a>
    <a href="/chat" class="b">💬<span>Chat</span></a>
    <a href="/report" class="b">📊<span>Report</span></a>
    <a href="/settings" class="b">👤<span>Me</span></a>
  </div>
</div>

{#if selectedCard}
<div class="modal-bg" onclick={()=>selectedCard=null} role="button" tabindex="0" onkeydown={(e)=>{ if(e.key==='Escape') selectedCard=null; }}>
  <div class="modal" onclick={(e)=>e.stopPropagation()} role="dialog" tabindex="0" onkeydown={(e)=>e.stopPropagation()}>
    <div class="modal-head">
      <b>{selectedCard.toUpperCase()} - MY SECURE DATA</b>
      <button class="close-btn" onclick={()=>selectedCard=null}>✕</button>
    </div>
    <div class="modal-body">
      {#if detailList.length===0}
        <div class="empty">
          <p>🔒 No data found for you.</p>
          <small>Dashboard is secured by user ID: {data.user?.email}<br/>Only your meetings/actions/reports are shown.</small>
        </div>
      {:else}
        {#each detailList as item, i}
          <div class="detail-row" onclick={()=>{ selectedCard=null; if(item.id) navigate(`/meeting-list/${item.id}`); }}>
            <div class="detail-left">
              <b>{item.title?? item.action_title?? item.report_date?? item.meeting_title?? `Item ${i+1}`}</b>
              <span>{item.meeting_date?? item.due_date?? item.report_date?? ''} {item.meeting_time?? ''}</span>
            </div>
            <div class="detail-right">
              <span class="badge" class:pending={String(item.status??'').toLowerCase()!=='completed'}>{item.status?? 'active'}</span>
              <span class="arrow">›</span>
            </div>
          </div>
        {/each}
      {/if}
      <button class="view-all" onclick={()=>{ selectedCard=null; navigate(ROUTES.todayMeetings); }}>View All in List →</button>
    </div>
  </div>
</div>
{/if}

<style>
.app{display:flex;flex-direction:column;height:100dvh;width:100vw;overflow:hidden;background:#f6f7fb;}
.top-fixed{flex:0 0 auto;background:white;border-bottom:1px solid #e2e8f0;z-index:30;}
.scroll-area{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px;display:flex;flex-direction:column;gap:12px;}
.bottom-fixed{flex:0 0 auto;height:56px;background:#111827;display:flex;justify-content:space-around;align-items:center;z-index:30;}
.kpi-simple{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.k{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:all 0.15s;}
.k:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.08);border-color:#cbd5e1;}
.k.n{font-size:20px;font-weight:800;color:#0f172a;display:block;}
.k.l{font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;}
.k small{font-size:8px;color:#94a3b8;margin-top:4px;}
.totals{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:white;border:1px solid #e2e8f0;border-radius:12px;padding:10px;}
.totals div{text-align:center;border-right:1px solid #f1f5f9;cursor:pointer;padding:4px;}
.totals div:last-child{border:none;}
.totals b{font-size:16px;display:block;}
.totals p{font-size:10px;color:#64748b;margin:2px 0 0;}
.h-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory;}
.h-scroll > :global(*){flex:0 0 280px;scroll-snap-align:start;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.b{color:#9ca3af;text-decoration:none;font-size:18px;display:flex;flex-direction:column;align-items:center;line-height:1;}
.b span{font-size:9px;margin-top:2px;}
.b.active{color:white;}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px);}
.modal{background:white;border-radius:16px;width:100%;max-width:420px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.2);}
.modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #e2e8f0;font-size:13px;}
.close-btn{border:none;background:#f1f5f9;width:28px;height:28px;border-radius:50%;cursor:pointer;}
.modal-body{padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;}
.empty{text-align:center;padding:30px 10px;color:#64748b;}
.empty small{font-size:11px;display:block;margin-top:8px;line-height:1.4;}
.detail-row{padding:12px;border:1px solid #f1f5f9;border-radius:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;background:#f8fafc;}
.detail-row:hover{background:white;border-color:#e2e8f0;}
.detail-left{display:flex;flex-direction:column;gap:2px;}
.detail-left b{font-size:13px;color:#0f172a;}
.detail-left span{font-size:11px;color:#64748b;}
.detail-right{display:flex;align-items:center;gap:8px;}
.badge{font-size:10px;padding:3px 8px;border-radius:20px;background:#e0f2fe;color:#0369a1;}
.badge.pending{background:#fee2e2;color:#b91c1c;}
.arrow{font-size:18px;color:#94a3b8;}
.view-all{margin-top:8px;padding:12px;background:#0f172a;color:white;border:none;border-radius:10px;font-weight:600;cursor:pointer;}
@media(max-width:768px){
.kpi-simple{grid-template-columns:repeat(2,1fr);}
.totals{grid-template-columns:repeat(2,1fr);gap:0;}
.totals div{padding:10px;border-bottom:1px solid #f1f5f9;}
.grid-2{grid-template-columns:1fr;}
.h-scroll > :global(*){flex:0 0 85vw;}
}
</style>