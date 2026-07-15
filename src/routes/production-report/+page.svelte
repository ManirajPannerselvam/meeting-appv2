<script lang="ts">
import { onMount } from "svelte";
import { getProductionReport } from "$lib/services/database";

let reports:any[]=[];

let search="";
let lineFilter="All";

let loading=true;

let currentPage=1;
const pageSize=15;

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

$: lines=[
    "All",
    ...new Set(
        reports.map(r=>r.line||"Unknown")
    )
];

$: filtered=reports.filter(r=>{

    const txt=(
        (r.line||"")+
        (r.model||"")+
        (r.shift||"")
    ).toLowerCase();

    const okSearch=txt.includes(search.toLowerCase());

    const okLine=lineFilter==="All"||r.line===lineFilter;

    return okSearch&&okLine;

});

$: totalPages=Math.max(
1,
Math.ceil(filtered.length/pageSize)
);

$: paged=filtered.slice(

(currentPage-1)*pageSize,

currentPage*pageSize

);

function reset(){

search="";

lineFilter="All";

currentPage=1;

}

</script>

<h1>

🏭 Production Report

</h1>

<div class="toolbar">

<input
bind:value={search}
placeholder="Search line/model..."
>

<select bind:value={lineFilter}>

{#each lines as line}

<option>{line}</option>

{/each}

</select>

<button on:click={reset}>

Reset

</button>

</div>

<div class="summary">

<div>

<b>Total Records</b>

<h2>{filtered.length}</h2>

</div>

<div>

<b>Total Target</b>

<h2>

{filtered.reduce((t,r)=>t+Number(r.target||0),0).toLocaleString()}

</h2>

</div>

<div>

<b>Total Actual</b>

<h2>

{filtered.reduce((t,r)=>t+Number(r.actual||0),0).toLocaleString()}

</h2>

</div>

<div>

<b>Average Yield</b>

<h2>

{

filtered.length

?

(

filtered.reduce((t,r)=>t+Number(r.yield||0),0)

/

filtered.length

).toFixed(2)

:

"0"

}%

</h2>

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

<th>Date</th>

<th>Shift</th>

<th>Line</th>

<th>Model</th>

<th>Target</th>

<th>Actual</th>

<th>Good</th>

<th>NG</th>

<th>Yield</th>

<th>OEE</th>

</tr>

</thead>

<tbody>

{#if paged.length===0}

<tr>

<td colspan="10">

No Records

</td>

</tr>

{:else}

{#each paged as row}

<tr>

<td>{row.date||"-"}</td>

<td>{row.shift||"-"}</td>

<td>{row.line||"-"}</td>

<td>{row.model||"-"}</td>

<td>{row.target||0}</td>

<td>{row.actual||0}</td>

<td>{row.good||0}</td>

<td>{row.ng||0}</td>

<td>

<span class:good={Number(row.yield)>=99}

class:warn={Number(row.yield)<99}>

{row.yield||0}%

</span>

</td>

<td>{row.oee||0}%</td>

</tr>

{/each}

{/if}

</tbody>

</table>

{/if}

</div>

<div class="pagination">

<button

disabled={currentPage===1}

on:click={()=>currentPage--}

>

Previous

</button>

<span>

{currentPage}

/

{totalPages}

</span>

<button

disabled={currentPage===totalPages}

on:click={()=>currentPage++}

>

Next

</button>

</div>

<style>

.toolbar{

display:flex;

gap:15px;

margin:20px 0;

flex-wrap:wrap;

}

.toolbar input,

.toolbar select{

padding:10px;

border-radius:8px;

border:1px solid #ddd;

}

.toolbar button{

background:#2563eb;

color:white;

border:none;

padding:10px 20px;

border-radius:8px;

cursor:pointer;

}

.summary{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(220px,1fr));

gap:20px;

margin-bottom:20px;

}

.summary div{

background:white;

padding:20px;

border-radius:14px;

box-shadow:0 5px 15px rgba(0,0,0,.08);

}

.table{

background:white;

padding:20px;

border-radius:14px;

overflow:auto;

box-shadow:0 5px 18px rgba(0,0,0,.08);

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

.good{

color:#16a34a;

font-weight:bold;

}

.warn{

color:#dc2626;

font-weight:bold;

}

.pagination{

margin-top:20px;

display:flex;

justify-content:center;

gap:20px;

align-items:center;

}

.pagination button{

padding:10px 18px;

background:#2563eb;

border:none;

color:white;

border-radius:8px;

}

.loading{

padding:50px;

text-align:center;

}

</style>