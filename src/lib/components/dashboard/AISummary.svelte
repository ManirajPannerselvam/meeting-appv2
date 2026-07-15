<script lang="ts">
    import { goto } from "$app/navigation";

    export let summary:any;

    function color(v:number){

        if(v>=99) return "good";

        if(v>=95) return "warn";

        return "bad";

    }
</script>

<div class="card">

    <div class="header">

        <div>

            <h2>🤖 AI Executive Summary</h2>

            <small>Last 7 Days Analysis</small>

        </div>

        <button
        class="view"
        on:click={()=>goto("/ai-summary")}>

            Open Report →

        </button>

    </div>

    {#if summary.loading}

        <div class="loading">

            Analysing database...

        </div>

    {:else}

    <div class="grid">

        <div class="kpi">

            <label>Production Achievement</label>

            <h1>

                {summary.production.achievement.toFixed(1)}%

            </h1>

        </div>

        <div class="kpi">

            <label>Average Yield</label>

            <h1 class={color(summary.production.yield)}>

                {summary.production.yield.toFixed(2)}%

            </h1>

        </div>

        <div class="kpi">

            <label>Average OEE</label>

            <h1>

                {summary.production.oee.toFixed(1)}%

            </h1>

        </div>

        <div class="kpi">

            <label>Pending Actions</label>

            <h1>

                {summary.actions.pending}

            </h1>

        </div>

        <div class="kpi">

            <label>Overdue</label>

            <h1 class="bad">

                {summary.actions.overdue}

            </h1>

        </div>

        <div class="kpi">

            <label>Today's Meetings</label>

            <h1>

                {summary.meetings.today}

            </h1>

        </div>

    </div>

    <hr>

    <h3>⚠ Major Issues</h3>

    <ul>

        {#if summary.issues.length===0}

            <li>No major issues detected.</li>

        {:else}

            {#each summary.issues as issue}

                <li>{issue}</li>

            {/each}

        {/if}

    </ul>

    <h3>💡 Recommendations</h3>

    <ul>

        {#each summary.recommendations as rec}

            <li>{rec}</li>

        {/each}

    </ul>

    {/if}

</div>

<style>

.card{

background:white;

padding:24px;

border-radius:18px;

box-shadow:0 8px 24px rgba(0,0,0,.08);

margin-top:25px;

}

.header{

display:flex;

justify-content:space-between;

align-items:center;

margin-bottom:20px;

}

.header h2{

margin:0;

}

.header small{

color:#64748b;

}

.grid{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(170px,1fr));

gap:18px;

}

.kpi{

background:#f8fafc;

padding:18px;

border-radius:12px;

text-align:center;

}

.kpi label{

display:block;

font-size:13px;

color:#64748b;

margin-bottom:8px;

}

.kpi h1{

margin:0;

font-size:30px;

}

.good{

color:#16a34a;

}

.warn{

color:#ca8a04;

}

.bad{

color:#dc2626;

}

ul{

margin:10px 0 0;

padding-left:18px;

}

li{

margin:6px 0;

}

.loading{

padding:60px;

text-align:center;

color:#64748b;

font-size:16px;

}

.view{

background:#2563eb;

color:white;

border:none;

padding:10px 18px;

border-radius:8px;

cursor:pointer;

font-weight:600;

}

.view:hover{

background:#1d4ed8;

}

@media(max-width:768px){

.header{

flex-direction:column;

align-items:flex-start;

gap:12px;

}

.grid{

grid-template-columns:repeat(2,1fr);

}

}

</style>