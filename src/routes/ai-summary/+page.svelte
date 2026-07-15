<script lang="ts">
import { onMount } from "svelte";
import {
    aiSummary,
    startAISummaryRefresh
} from "$lib/stores/aiSummary";

let stop: (() => void) | undefined;

onMount(() => {

    stop = startAISummaryRefresh();

    return () => {

        if (stop) stop();

    };

});

function printReport() {

    window.print();

}
</script>

<svelte:head>

<title>AI Executive Summary</title>

</svelte:head>
<h1>🤖 AI Executive Summary</h1>

{#if $aiSummary.loading}

<div class="loading">

    Generating AI Summary...

</div>

{:else}

<div class="toolbar">

    <button on:click={printReport}>

        🖨 Print Report

    </button>

</div>

<!-- =========================
Executive Summary
========================= -->

<div class="section ai-card">

    <h2>🤖 Executive Summary</h2>

    <pre>{$aiSummary.executiveSummary}</pre>

</div>

<!-- =========================
Production
========================= -->

<div class="section">

<h2>🏭 Today's Production</h2>

<div class="grid">

<div class="box">
<label>Target</label>
<h2>{$aiSummary.production.target}</h2>
</div>

<div class="box">
<label>Actual</label>
<h2>{$aiSummary.production.actual}</h2>
</div>

<div class="box">
<label>Achievement</label>
<h2>{$aiSummary.production.achievement.toFixed(1)}%</h2>
</div>

<div class="box">
<label>Yield</label>
<h2>{$aiSummary.production.yield.toFixed(2)}%</h2>
</div>

<div class="box">
<label>OEE</label>
<h2>{$aiSummary.production.oee.toFixed(2)}%</h2>
</div>

<div class="box">
<label>Reject Rate</label>
<h2>{$aiSummary.production.rr.toFixed(2)}%</h2>
</div>

<div class="box">
<label>NG Qty</label>
<h2>{$aiSummary.production.ng}</h2>
</div>

<div class="box">
<label>Downtime</label>
<h2>{$aiSummary.production.downtime} min</h2>
</div>

</div>

</div>

<!-- =========================
Meetings
========================= -->

<div class="section">

<h2>📅 Meeting Status</h2>

<div class="grid">

<div class="box">

<label>Today's Meetings</label>

<h2>{$aiSummary.meetings.today}</h2>

</div>

<div class="box">

<label>Upcoming</label>

<h2>{$aiSummary.meetings.upcoming}</h2>

</div>

<div class="box">

<label>Completed</label>

<h2>{$aiSummary.meetings.completed}</h2>

</div>

</div>

</div>

<!-- =========================
Actions
========================= -->

<div class="section">

<h2>✅ Meeting Actions</h2>

<div class="grid">

<div class="box">

<label>Pending</label>

<h2>{$aiSummary.actions.pending}</h2>

</div>

<div class="box">

<label>Completed</label>

<h2>{$aiSummary.actions.completed}</h2>

</div>

<div class="box">

<label>Overdue</label>

<h2>{$aiSummary.actions.overdue}</h2>

</div>

</div>

</div>

<!-- =========================
Major Issues
========================= -->

<div class="section">

<h2>⚠ Major Issues</h2>

{#if $aiSummary.issues.length===0}

<p class="good">

No major issues detected.

</p>

{:else}

<ul>

{#each $aiSummary.issues as issue}

<li>{issue}</li>

{/each}

</ul>

{/if}

</div>

<!-- =========================
Recommendations
========================= -->

<div class="section">

<h2>💡 AI Recommendations</h2>

{#if $aiSummary.recommendations.length===0}

<p>No recommendations.</p>

{:else}

<ol>

{#each $aiSummary.recommendations as rec}

<li>{rec}</li>

{/each}

</ol>

{/if}

</div>

{/if}

<style>

:global(body){

    margin:0;
    padding:20px;
    background:#f1f5f9;
    font-family:Segoe UI,Arial,sans-serif;

}

h1{

    margin-bottom:20px;
    color:#0f172a;

}

/* ==========================
Loading
========================== */

.loading{

    padding:80px;
    text-align:center;
    font-size:22px;
    color:#2563eb;

}

/* ==========================
Toolbar
========================== */

.toolbar{

    display:flex;
    justify-content:flex-end;
    margin-bottom:20px;

}

.toolbar button{

    background:#2563eb;
    color:white;
    border:none;
    padding:12px 20px;
    border-radius:8px;
    cursor:pointer;
    font-weight:bold;

}

.toolbar button:hover{

    background:#1d4ed8;

}

/* ==========================
Cards
========================== */

.section{

    background:white;
    padding:25px;
    border-radius:16px;
    margin-bottom:20px;
    box-shadow:0 6px 18px rgba(0,0,0,.08);

}

.ai-card{

    background:#0f172a;
    color:white;

}

.ai-card h2{

    color:#38bdf8;

}

.ai-card pre{

    white-space:pre-wrap;
    font-family:inherit;
    font-size:16px;
    line-height:1.8;
    margin:0;

}

/* ==========================
Grid
========================== */

.grid{

    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    gap:20px;

}

.box{

    background:#f8fafc;
    border-radius:12px;
    padding:20px;
    text-align:center;
    border:1px solid #e2e8f0;

}

.box label{

    display:block;
    color:#64748b;
    margin-bottom:10px;
    font-size:14px;

}

.box h2{

    margin:0;
    font-size:30px;
    color:#0f172a;

}

/* ==========================
Lists
========================== */

ul,
ol{

    margin-top:10px;
    padding-left:24px;

}

li{

    margin:10px 0;
    line-height:1.6;

}

.good{

    color:#16a34a;
    font-weight:bold;

}

/* ==========================
Responsive
========================== */

@media(max-width:1200px){

.grid{

    grid-template-columns:repeat(2,1fr);

}

}

@media(max-width:768px){

:global(body){

    padding:10px;

}

.grid{

    grid-template-columns:1fr;

}

.section{

    padding:18px;

}

.box h2{

    font-size:24px;

}

.ai-card pre{

    font-size:15px;

}

.toolbar{

    justify-content:center;

}

.toolbar button{

    width:100%;

}

}

@media(max-width:480px){

h1{

    font-size:24px;

}

.section h2{

    font-size:20px;

}

.box{

    padding:15px;

}

.box h2{

    font-size:22px;

}

}

/* ==========================
Print
========================== */

@media print{

:global(body){

    background:white;

}

.toolbar{

    display:none;

}

.section{

    box-shadow:none;
    border:1px solid #ddd;

}

.ai-card{

    background:white !important;
    color:black !important;

}

.ai-card h2{

    color:black !important;

}

}

</style>