<script lang="ts">

import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { getActions } from "$lib/services/database";

let actions:any[]=[];

let loading=true;

let search="";

let statusFilter="All";

let ownerFilter="All";

let currentPage=1;

const pageSize=15;

async function load(){

    loading=true;

    actions=await getActions();

    loading=false;

}

onMount(()=>{

    load();

    const timer=setInterval(load,60000);

    return ()=>clearInterval(timer);

});

$: owners=[
"All",
...new Set(actions.map(a=>a.owner||"Unknown"))
];

$: filtered=actions.filter(a=>{

const txt=(

(a.description||"")+

(a.meeting_title||"")+

(a.owner||"")

).toLowerCase();

const okSearch=txt.includes(search.toLowerCase());

const okStatus=statusFilter==="All"||a.status===statusFilter;

const okOwner=ownerFilter==="All"||a.owner===ownerFilter;

return okSearch&&okStatus&&okOwner;

});

$: totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));

$: paged=filtered.slice(

(currentPage-1)*pageSize,

currentPage*pageSize

);

$: completed=actions.filter(a=>a.status==="Completed").length;

$: pending=actions.filter(a=>a.status==="Pending").length;

$: overdue=actions.filter(a=>a.status==="Overdue").length;

$: open=actions.filter(a=>a.status==="Open").length;

function badge(status:string){

switch(status){

case "Completed":

return "green";

case "Pending":

return "blue";

case "Open":

return "orange";

case "Overdue":

return "red";

default:

return "gray";

}

}

function reset(){

search="";

statusFilter="All";

ownerFilter="All";

currentPage=1;

}

</script>

<h1>

✅ Meeting Action Tracker

</h1>

<div class="cards">

<div class="card green">

<h2>{completed}</h2>

<p>Completed</p>

</div>

<div class="card blue">

<h2>{pending}</h2>

<p>Pending</p>

</div>

<div class="card orange">

<h2>{open}</h2>

<p>Open</p>

</div>

<div class="card red">

<h2>{overdue}</h2>

<p>Overdue</p>

</div>

</div>

<div class="toolbar">

<input
bind:value={search}
placeholder="Search action..."
>

<select bind:value={statusFilter}>

<option>All</option>
<option>Open</option>
<option>Pending</option>
<option>Completed</option>
<option>Overdue</option>

</select>

<select bind:value={ownerFilter}>

{#each owners as owner}

<option>{owner}</option>

{/each}

</select>

<button on:click={reset}>

Reset

</button>

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

<th>ID</th>

<th>Meeting</th>

<th>Action</th>

<th>Owner</th>

<th>Due Date</th>

<th>Status</th>

<th>Action</th>

</tr>

</thead>

<tbody>

{#if paged.length===0}

<tr>

<td colspan="7">

No Action Items

</td>

</tr>

{:else}

{#each paged as item}

<tr>

<td>#{item.id}</td>

<td>{item.meeting_title||"-"}</td>

<td>{item.description}</td>

<td>{item.owner||"-"}</td>

<td>{item.due_date||"-"}</td>

<td>

<span class={badge(item.status)}>

{item.status}

</span>

</td>

<td>

<button

class="view"

on:click={()=>goto(`/meeting-action/${item.id}`)}

>

👁 View

</button>

</td>

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

{currentPage} / {totalPages}

</span>

<button

disabled={currentPage===totalPages}

on:click={()=>currentPage++}

>

Next

</button>

</div>

<style>

.cards{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(220px,1fr));

gap:20px;

margin:20px 0;

}

.card{

padding:20px;

border-radius:14px;

color:white;

}

.card h2{

margin:0;

font-size:34px;

}

.green{background:#16a34a;}
.blue{background:#2563eb;}
.orange{background:#ea580c;}
.red{background:#dc2626;}

.toolbar{

display:flex;

gap:15px;

margin-bottom:20px;

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

padding:10px 18px;

border-radius:8px;

cursor:pointer;

}

.table{

background:white;

padding:20px;

border-radius:16px;

overflow:auto;

box-shadow:0 5px 15px rgba(0,0,0,.08);

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

.green,
.blue,
.orange,
.red,
.gray{

padding:6px 12px;

border-radius:20px;

color:white;

display:inline-block;

}

.gray{

background:#64748b;

}

.view{

background:#2563eb;

border:none;

color:white;

padding:8px 14px;

border-radius:8px;

cursor:pointer;

}

.pagination{

margin-top:20px;

display:flex;

justify-content:center;

gap:20px;

align-items:center;

}

.pagination button{

background:#2563eb;

color:white;

border:none;

padding:10px 18px;

border-radius:8px;

}

.loading{

padding:40px;

text-align:center;

}

@media(max-width:768px){

.cards{

grid-template-columns:1fr;

}

.toolbar{

flex-direction:column;

}

.toolbar input,
.toolbar select,
.toolbar button{

width:100%;

}

}

</style>