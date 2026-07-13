<script lang="ts">

    export let chartType = "Line";

    const chartTypes = [
        {
            name: "Line",
            icon: "📈",
            desc: "Trend over time"
        },
        {
            name: "Bar",
            icon: "📊",
            desc: "Compare values"
        },
        {
            name: "Pie",
            icon: "🥧",
            desc: "Percentage"
        },
        {
            name: "Area",
            icon: "📉",
            desc: "Accumulated"
        },
        {
            name: "Radar",
            icon: "🕸",
            desc: "KPI Comparison"
        },
        {
            name: "Scatter",
            icon: "🔹",
            desc: "Correlation"
        },
        {
            name: "Gauge",
            icon: "🎯",
            desc: "Target Achievement"
        }
    ];

</script>

<div class="panel">

<h2>📊 Chart Builder</h2>

<div class="grid">

{#each chartTypes as chart}

<div
class:selected={chartType===chart.name}
class="card"
on:click={()=>chartType=chart.name}
>

<div class="icon">

{chart.icon}

</div>

<h3>{chart.name}</h3>

<p>{chart.desc}</p>

</div>

{/each}

</div>

<div class="preview">

<h3>

Live Chart Preview

</h3>

{#if chartType==="Line"}

📈 Line Chart Preview

{:else if chartType==="Bar"}

📊 Bar Chart Preview

{:else if chartType==="Pie"}

🥧 Pie Chart Preview

{:else if chartType==="Area"}

📉 Area Chart Preview

{:else if chartType==="Radar"}

🕸 Radar Chart Preview

{:else if chartType==="Scatter"}

🔹 Scatter Chart Preview

{:else}

🎯 Gauge Preview

{/if}

<div class="fakeChart">

<div></div>

<div></div>

<div></div>

<div></div>

<div></div>

<div></div>

</div>

</div>

</div>

<style>

.panel{

background:white;

padding:25px;

border-radius:18px;

box-shadow:0 5px 18px rgba(0,0,0,.08);

margin-top:25px;

}

.grid{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(150px,1fr));

gap:15px;

margin-top:20px;

}

.card{

border:1px solid #dbe4ee;

padding:15px;

border-radius:12px;

cursor:pointer;

text-align:center;

transition:.2s;

}

.card:hover{

transform:translateY(-3px);

box-shadow:0 5px 15px rgba(0,0,0,.08);

}

.selected{

border:2px solid #2563eb;

background:#eff6ff;

}

.icon{

font-size:34px;

margin-bottom:10px;

}

.preview{

margin-top:30px;

padding:20px;

background:#f8fafc;

border-radius:12px;

}

.fakeChart{

height:220px;

display:flex;

align-items:flex-end;

gap:12px;

margin-top:20px;

}

.fakeChart div{

flex:1;

background:#2563eb;

border-radius:6px 6px 0 0;

}

.fakeChart div:nth-child(1){height:40%;}
.fakeChart div:nth-child(2){height:70%;}
.fakeChart div:nth-child(3){height:90%;}
.fakeChart div:nth-child(4){height:65%;}
.fakeChart div:nth-child(5){height:80%;}
.fakeChart div:nth-child(6){height:55%;}

</style>