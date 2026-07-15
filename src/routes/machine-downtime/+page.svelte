<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    import {
        machineDowntime,
        startMachineDowntimeRefresh
    } from "$lib/stores/machineDowntime";

    import {
        deleteMachineDowntime
    } from "$lib/services/database";

    let stop: any;

    let keyword = "";

    onMount(() => {

        stop = startMachineDowntimeRefresh();

        return () => stop();

    });

    $: rows = ($machineDowntime.items ?? []).filter((r: any) => {

        const text =
            `${r.machine} ${r.reason} ${r.production_line} ${r.department}`
                .toLowerCase();

        return text.includes(keyword.toLowerCase());

    });

    async function remove(id: number) {

        if (!confirm("Delete this downtime record?")) return;

        await deleteMachineDowntime(id);

        startMachineDowntimeRefresh();

    }

    function edit(id: number) {

        goto(`/machine-downtime/${id}`);

    }

    function add() {

        goto("/machine-downtime/add");

    }
</script>

<h1>🏭 Machine Downtime</h1>

<div class="toolbar">

    <input
        bind:value={keyword}
        placeholder="Search Machine / Reason...">

    <button on:click={add}>
        + Add Downtime
    </button>

</div>

<div class="summary">

    <div class="card">

        <label>Total Today</label>

        <h2>{$machineDowntime.totalMinutes} min</h2>

    </div>

    <div class="card">

        <label>Machines</label>

        <h2>{$machineDowntime.totalMachines}</h2>

    </div>

    <div class="card">

        <label>Highest Downtime</label>

        <h2>{$machineDowntime.highestMachine || "-"}</h2>

        <small>{$machineDowntime.highestMinutes} min</small>

    </div>

</div>

<div class="table-card">

<table>

<thead>

<tr>

<th>Date</th>

<th>Department</th>

<th>Line</th>

<th>Machine</th>

<th>Reason</th>

<th>Minutes</th>

<th>Status</th>

<th>Action</th>

</tr>

</thead>

<tbody>

{#if rows.length === 0}

<tr>

<td colspan="8" class="empty">

No downtime records found.

</td>

</tr>

{:else}

{#each rows as row}

<tr>

<td>{row.report_date}</td>

<td>{row.department}</td>

<td>{row.production_line}</td>

<td>{row.machine}</td>

<td>{row.reason}</td>

<td>{row.duration_min}</td>

<td>{row.status}</td>

<td>

<button class="edit" on:click={() => edit(row.id)}>

Edit

</button>

<button class="delete" on:click={() => remove(row.id)}>

Delete

</button>

</td>

</tr>

{/each}

{/if}

</tbody>

</table>

</div>

<style>

.toolbar{

display:flex;
justify-content:space-between;
gap:20px;
margin-bottom:20px;

}

.toolbar input{

flex:1;
padding:10px;
border:1px solid #ddd;
border-radius:8px;

}

.toolbar button{

background:#2563eb;
color:white;
border:none;
padding:12px 20px;
border-radius:8px;
cursor:pointer;

}

.summary{

display:grid;
grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
gap:20px;
margin-bottom:20px;

}

.card{

background:white;
padding:20px;
border-radius:12px;
box-shadow:0 5px 15px rgba(0,0,0,.08);

}

.card label{

color:#64748b;

}

.card h2{

margin:10px 0;

}

.table-card{

background:white;
padding:20px;
border-radius:12px;
overflow:auto;
box-shadow:0 5px 15px rgba(0,0,0,.08);

}

table{

width:100%;
border-collapse:collapse;

}

th{

background:#2563eb;
color:white;
padding:12px;

}

td{

padding:10px;
border-bottom:1px solid #eee;

}

.empty{

text-align:center;
padding:40px;

}

.edit{

background:#16a34a;
color:white;
border:none;
padding:6px 12px;
margin-right:5px;
border-radius:6px;
cursor:pointer;

}

.delete{

background:#dc2626;
color:white;
border:none;
padding:6px 12px;
border-radius:6px;
cursor:pointer;

}

@media(max-width:768px){

.toolbar{

flex-direction:column;

}

}

</style>