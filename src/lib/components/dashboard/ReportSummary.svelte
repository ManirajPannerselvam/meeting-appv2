<script lang="ts">
    import { goto } from "$app/navigation";

    export let reports:any[]=[];

    $: totalTarget =
        reports.reduce((t,r)=>t+Number(r.target||0),0);

    $: totalActual =
        reports.reduce((t,r)=>t+Number(r.actual||0),0);

    $: totalNG =
        reports.reduce((t,r)=>t+Number(r.ng||0),0);

    $: avgYield =
        reports.length
        ? (
            reports.reduce((t,r)=>t+Number(r.yield||0),0)
            /
            reports.length
          ).toFixed(2)
        : "0.00";

    $: avgOEE =
        reports.length
        ? (
            reports.reduce((t,r)=>t+Number(r.oee||0),0)
            /
            reports.length
          ).toFixed(1)
        : "0.0";

    function openReports(){

        goto("/production-report");

    }
</script>

<div class="report-grid">

    <div
        class="card blue"
        on:click={openReports}
    >
        <h2>{reports.length}</h2>
        <p>Production Reports</p>
    </div>

    <div
        class="card green"
        on:click={openReports}
    >
        <h2>{totalTarget.toLocaleString()}</h2>
        <p>Total Target</p>
    </div>

    <div
        class="card teal"
        on:click={openReports}
    >
        <h2>{totalActual.toLocaleString()}</h2>
        <p>Total Actual</p>
    </div>

    <div
        class="card orange"
        on:click={openReports}
    >
        <h2>{avgYield}%</h2>
        <p>Average Yield</p>
    </div>

    <div
        class="card red"
        on:click={openReports}
    >
        <h2>{totalNG.toLocaleString()}</h2>
        <p>NG Quantity</p>
    </div>

    <div
        class="card purple"
        on:click={openReports}
    >
        <h2>{avgOEE}%</h2>
        <p>Average OEE</p>
    </div>

</div>

<style>

.report-grid{

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

box-shadow:0 6px 20px rgba(0,0,0,.08);

}

.card:hover{

transform:translateY(-5px);

box-shadow:0 14px 28px rgba(0,0,0,.18);

}

.card h2{

margin:0;

font-size:34px;

}

.card p{

margin-top:12px;

font-size:15px;

}

.blue{background:#2563eb;}
.green{background:#16a34a;}
.teal{background:#0f766e;}
.orange{background:#ea580c;}
.red{background:#dc2626;}
.purple{background:#7c3aed;}

@media(max-width:768px){

.report-grid{

grid-template-columns:1fr;

}

.card h2{

font-size:28px;

}

}

</style>