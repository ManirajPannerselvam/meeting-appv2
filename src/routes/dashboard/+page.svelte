<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";

import ProductionSummary from "$lib/components/dashboard/ProductionSummary.svelte";
import MeetingSummary from "$lib/components/dashboard/MeetingSummary.svelte";
import ActionSummary from "$lib/components/dashboard/ActionSummary.svelte";
import ReportSummary from "$lib/components/dashboard/ReportSummary.svelte";

import RecentMeetings from "$lib/components/dashboard/RecentMeetings.svelte";
import RecentActions from "$lib/components/dashboard/RecentActions.svelte";

import ProductionTrend from "$lib/components/dashboard/ProductionTrend.svelte";

import AISummary from "$lib/components/dashboard/AISummary.svelte";
import DowntimeSummary from "$lib/components/dashboard/DowntimeSummary.svelte";

import {
    dashboard,
    startDashboardRefresh
} from "$lib/stores/dashboard";

import {
    aiSummary,
    startAISummaryRefresh
} from "$lib/stores/aiSummary";

import {
    machineDowntime,
    startMachineDowntimeRefresh
} from "$lib/stores/machineDowntime";

let stopDashboardRefresh: (() => void) | undefined;

let stopAIRefresh: (() => void) | undefined;

let stopDowntimeRefresh: (() => void) | undefined;

onMount(() => {

    stopDashboardRefresh = startDashboardRefresh();

    stopAIRefresh = startAISummaryRefresh();

    stopDowntimeRefresh = startMachineDowntimeRefresh();

    return () => {

        stopDashboardRefresh?.();

        stopAIRefresh?.();

        stopDowntimeRefresh?.();

    };

});
$: production = $dashboard.production ?? [];

$: meetings = $dashboard.meetings ?? [];

$: actions = $dashboard.actions ?? [];

$: downtime = $machineDowntime.today ?? [];

$: todayMeetings =
meetings.filter(m=>m.status==="Today").length;

$: upcomingMeetings =
meetings.filter(m=>m.status==="Upcoming").length;

$: completedMeetings =
meetings.filter(m=>m.status==="Completed").length;

$: pendingActions =
actions.filter(a=>a.status!=="Completed").length;

$: totalReports = production.length;

$: totalTarget =
production.reduce((t,r)=>t+Number(r.target||0),0);

$: totalActual =
production.reduce((t,r)=>t+Number(r.actual||0),0);

$: totalNG =
production.reduce((t,r)=>t+Number(r.ng||0),0);

$: avgYield =
production.length
?
(
production.reduce(
(t,r)=>t+Number(r.yield||0),0
)
/
production.length
).toFixed(2)
:
"0.00";

</script>

<div class="dashboard">

    <!-- AI Executive Summary -->

    <AISummary
        summary={$aiSummary}
    />

    <!-- Top Summary -->

    <div class="top-cards">

        <ProductionSummary production={production}/>

        <MeetingSummary meetings={meetings}/>

        <ActionSummary actions={actions}/>

        <ReportSummary reports={production}/>

        <DowntimeSummary downtime={downtime}/>

    </div>

    <!-- KPI Cards -->

    <div class="kpi-grid">

        <div
            class="card blue clickable"
            on:click={() => goto("/meeting-list?filter=today")}
        >
            <h2>{todayMeetings}</h2>
            <p>Today's Meetings</p>
        </div>

        <div
            class="card green clickable"
            on:click={() => goto("/meeting-list?filter=upcoming")}
        >
            <h2>{upcomingMeetings}</h2>
            <p>Upcoming Meetings</p>
        </div>

        <div
            class="card red clickable"
            on:click={() => goto("/meeting-actions")}
        >
            <h2>{pendingActions}</h2>
            <p>Pending Actions</p>
        </div>

        <div
            class="card orange clickable"
            on:click={() => goto("/report-summary")}
        >
            <h2>{totalReports}</h2>
            <p>Production Reports</p>
        </div>

        <div
            class="card purple clickable"
            on:click={() => goto("/machine-downtime")}
        >
            <h2>{$machineDowntime.totalMinutes}</h2>
            <p>Today's Downtime</p>
        </div>

        <div
            class="card dark clickable"
            on:click={() => goto("/ai-summary")}
        >
            <h2>🤖</h2>
            <p>AI Executive Summary</p>
        </div>

    </div>

    <!-- Recent -->

    <div class="middle-grid">

        <RecentMeetings meetings={meetings}/>

        <RecentActions actions={actions}/>

    </div>

    <!-- Production Trend -->

    <ProductionTrend production={production}/>

    <!-- Factory KPI -->

    <div class="summary">

        <div>

            <b>Total Target</b>

            <p>{totalTarget.toLocaleString()}</p>

        </div>

        <div>

            <b>Total Actual</b>

            <p>{totalActual.toLocaleString()}</p>

        </div>

        <div>

            <b>Total NG</b>

            <p>{totalNG.toLocaleString()}</p>

        </div>

        <div>

            <b>Average Yield</b>

            <p>{avgYield}%</p>

        </div>

        <div>

            <b>Completed Meetings</b>

            <p>{completedMeetings}</p>

        </div>

    </div>

</div>

<style>

.dashboard{
    display:flex;
    flex-direction:column;
    gap:24px;
    padding:5px;
}

/* ---------- TOP SUMMARY ---------- */

.top-cards{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
    gap:20px;
}

/* ---------- KPI GRID ---------- */

.kpi-grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:20px;
}

/* ---------- MIDDLE ---------- */

.middle-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:20px;
}

/* ---------- FACTORY SUMMARY ---------- */

.summary{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:20px;
}

.summary div{

    background:white;

    padding:22px;

    border-radius:16px;

    box-shadow:0 8px 24px rgba(0,0,0,.08);

    transition:.25s;

}

.summary div:hover{

    transform:translateY(-4px);

}

.summary b{

    color:#64748b;

    font-size:14px;

}

.summary p{

    margin-top:12px;

    font-size:30px;

    font-weight:bold;

    color:#1e293b;

}

/* ---------- KPI CARD ---------- */

.card{

    color:white;

    padding:24px;

    border-radius:18px;

    box-shadow:0 10px 30px rgba(0,0,0,.15);

    transition:.25s;

}

.card:hover{

    transform:translateY(-6px);

}

.card h2{

    margin:0;

    font-size:40px;

}

.card p{

    margin-top:10px;

    opacity:.9;

}

/* ---------- COLORS ---------- */

.blue{

    background:linear-gradient(135deg,#2563eb,#1d4ed8);

}

.green{

    background:linear-gradient(135deg,#16a34a,#15803d);

}

.red{

    background:linear-gradient(135deg,#dc2626,#b91c1c);

}

.orange{

    background:linear-gradient(135deg,#ea580c,#c2410c);

}

.purple{

    background:linear-gradient(135deg,#7c3aed,#6d28d9);

}

.dark{

    background:linear-gradient(135deg,#1e293b,#0f172a);

}

.clickable{

    cursor:pointer;

}

/* ---------- TABLETS ---------- */

@media(max-width:1200px){

.middle-grid{

grid-template-columns:1fr;

}

}

/* ---------- MOBILE ---------- */

@media(max-width:768px){

.dashboard{

gap:18px;

}

.top-cards{

grid-template-columns:1fr;

}

.kpi-grid{

grid-template-columns:1fr;

}

.summary{

grid-template-columns:1fr;

}

.card{

padding:20px;

}

.card h2{

font-size:30px;

}

.summary p{

font-size:24px;

}

}

</style>