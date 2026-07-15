<script lang="ts">
    import { goto } from "$app/navigation";

    export let production:any[]=[];

    $: totalTarget =
        production.reduce((t,r)=>t+Number(r.target||0),0);

    $: totalActual =
        production.reduce((t,r)=>t+Number(r.actual||0),0);

    $: totalGood =
        production.reduce((t,r)=>t+Number(r.good||0),0);

    $: totalNG =
        production.reduce((t,r)=>t+Number(r.ng||0),0);

    $: avgYield =
        production.length
            ? (
                production.reduce((t,r)=>t+Number(r.yield||0),0)
                /
                production.length
              ).toFixed(2)
            : "0.00";

    $: avgOEE =
        production.length
            ? (
                production.reduce((t,r)=>t+Number(r.oee||0),0)
                /
                production.length
              ).toFixed(1)
            : "0.0";

    $: totalDowntime =
        production.reduce((t,r)=>t+Number(r.dt||0),0);

    $: achievement =
        totalTarget
            ? ((totalActual/totalTarget)*100).toFixed(1)
            : "0.0";

    function openProduction(){

        goto("/production-report");

    }

</script>

<div class="grid">

    <div class="card blue" on:click={openProduction}>
        <h2>{totalTarget.toLocaleString()}</h2>
        <p>Daily Target</p>
    </div>

    <div class="card green" on:click={openProduction}>
        <h2>{totalActual.toLocaleString()}</h2>
        <p>Actual Production</p>
    </div>

    <div class="card teal" on:click={openProduction}>
        <h2>{achievement}%</h2>
        <p>Achievement</p>
    </div>

    <div class="card cyan" on:click={openProduction}>
        <h2>{avgYield}%</h2>
        <p>Yield</p>
    </div>

    <div class="card orange" on:click={openProduction}>
        <h2>{totalNG.toLocaleString()}</h2>
        <p>NG Quantity</p>
    </div>

    <div class="card purple" on:click={openProduction}>
        <h2>{avgOEE}%</h2>
        <p>Average OEE</p>
    </div>

    <div class="card dark" on:click={openProduction}>
        <h2>{totalGood.toLocaleString()}</h2>
        <p>Good Quantity</p>
    </div>

    <div class="card gray" on:click={openProduction}>
        <h2>{totalDowntime} min</h2>
        <p>Downtime</p>
    </div>

</div>

<style>

.grid{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(220px,1fr));

gap:20px;

margin-top:20px;

}

.card{

padding:22px;

border-radius:16px;

color:white;

cursor:pointer;

transition:.25s;

box-shadow:0 6px 18px rgba(0,0,0,.08);

}

.card:hover{

transform:translateY(-5px);

box-shadow:0 12px 24px rgba(0,0,0,.18);

}

.card h2{

margin:0;

font-size:34px;

font-weight:700;

}

.card p{

margin-top:10px;

font-size:15px;

opacity:.95;

}

.blue{background:#2563eb;}
.green{background:#16a34a;}
.teal{background:#0f766e;}
.cyan{background:#0891b2;}
.orange{background:#ea580c;}
.purple{background:#9333ea;}
.dark{background:#1e293b;}
.gray{background:#64748b;}

@media(max-width:768px){

.grid{

grid-template-columns:1fr;

}

.card{

padding:18px;

}

.card h2{

font-size:28px;

}

}

</style>