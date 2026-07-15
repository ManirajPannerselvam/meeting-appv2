<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { getProductionReport } from "$lib/services/database";

let reports:any[]=[];

let loading=true;

async function load(){

    loading=true;

    reports=await getProductionReport();

    loading=false;

}

onMount(()=>{

    load();

    const timer=setInterval(load,60000);

    return ()=>clearInterval(timer);

});

$: totalTarget=
reports.reduce((t,r)=>t+Number(r.target||0),0);

$: totalActual=
reports.reduce((t,r)=>t+Number(r.actual||0),0);

$: totalGood=
reports.reduce((t,r)=>t+Number(r.good||0),0);

$: totalNG=
reports.reduce((t,r)=>t+Number(r.ng||0),0);

$: avgYield=

reports.length

?

(

reports.reduce((t,r)=>t+Number(r.yield||0),0)

/

reports.length

).toFixed(2)

:

"0.00";

$: avgOEE=

reports.length

?

(

reports.reduce((t,r)=>t+Number(r.oee||0),0)

/

reports.length

).toFixed(1)

:

"0.0";

$: achievement=

totalTarget

?

((totalActual/totalTarget)*100).toFixed(1)

:

"0";

$: byLine={};

$: {

    byLine={};

    reports.forEach(r=>{

        const line=r.line||"Unknown";

        if(!byLine[line]){

            byLine[line]={

                target:0,

                actual:0,

                good:0,

                ng:0,

                yield:0,

                oee:0,

                count:0

            };

        }

        byLine[line].target+=Number(r.target||0);

        byLine[line].actual+=Number(r.actual||0);

        byLine[line].good+=Number(r.good||0);

        byLine[line].ng+=Number(r.ng||0);

        byLine[line].yield+=Number(r.yield||0);

        byLine[line].oee+=Number(r.oee||0);

        byLine[line].count++;

    });

}
</script>

<h1>📊 Executive Production Summary</h1>

<div class="cards">

<div class="card blue">

<h2>{totalTarget.toLocaleString()}</h2>

<p>Total Target</p>

</div>

<div class="card green">

<h2>{totalActual.toLocaleString()}</h2>

<p>Total Actual</p>

</div>

<div class="card teal">

<h2>{achievement}%</h2>

<p>Achievement</p>

</div>

<div class="card cyan">

<h2>{avgYield}%</h2>

<p>Yield</p>

</div>

<div class="card purple">

<h2>{avgOEE}%</h2>

<p>OEE</p>

</div>

<div class="card red">

<h2>{totalNG.toLocaleString()}</h2>

<p>NG Qty</p>

</div>

</div>

<div class="table">

{#if loading}

<div class="loading">

Loading...

</div>

{:else}

<table>

<thead>

<tr>

<th>Line</th>

<th>Target</th>

<th>Actual</th>

<th>Good</th>

<th>NG</th>

<th>Yield</th>

<th>OEE</th>

<th></th>

</tr>

</thead>

<tbody>

{#each Object.entries(byLine) as [line,data]}

<tr>

<td>

<b>{line}</b>

</td>

<td>{data.target.toLocaleString()}</td>

<td>{data.actual.toLocaleString()}</td>

<td>{data.good.toLocaleString()}</td>

<td>{data.ng.toLocaleString()}</td>

<td>

{(data.yield/data.count).toFixed(2)}%

</td>

<td>

{(data.oee/data.count).toFixed(1)}%

</td>

<td>

<button

on:click={()=>goto(`/production-report?line=${line}`)}

>

View

</button>

</td>

</tr>

{/each}

</tbody>

</table>

{/if}

</div>

<style>

.cards{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(220px,1fr));

gap:20px;

margin:20px 0;

}

.card{

padding:22px;

border-radius:16px;

color:white;

box-shadow:0 6px 18px rgba(0,0,0,.08);

}

.card h2{

margin:0;

font-size:34px;

}

.card p{

margin-top:10px;

}

.blue{background:#2563eb;}
.green{background:#16a34a;}
.teal{background:#0f766e;}
.cyan{background:#0891b2;}
.purple{background:#9333ea;}
.red{background:#dc2626;}

.table{

background:white;

padding:20px;

border-radius:16px;

box-shadow:0 6px 18px rgba(0,0,0,.08);

overflow:auto;

}

table{

width:100%;

border-collapse:collapse;

}

th{

background:#1e293b;

color:white;

padding:12px;

}

td{

padding:12px;

border-bottom:1px solid #eee;

}

tbody tr:hover{

background:#f8fafc;

}

button{

background:#2563eb;

color:white;

border:none;

padding:8px 14px;

border-radius:8px;

cursor:pointer;

}

.loading{

padding:50px;

text-align:center;

}

@media(max-width:768px){

.cards{

grid-template-columns:1fr;

}

}

</style>