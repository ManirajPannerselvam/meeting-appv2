<script lang="ts">
import { page } from "$app/stores";
import { goto } from "$app/navigation";
import { onMount } from "svelte";

import {
    getMachineDowntimeById,
    updateMachineDowntime
} from "$lib/services/database";

let id:Number;

let form:any={

    report_date:"",
    department:"",
    production_line:"",
    machine:"",
    reason:"",
    category:"",
    duration_min:0,
    reported_by:"",
    action_taken:"",
    status:"Open"

};

let loading=true;
let saving=false;

onMount(async()=>{

    id=Number($page.params.id);

    const row=await getMachineDowntimeById(id);

    if(row){

        form=row;

    }

    loading=false;

});

async function save(){

    saving=true;

    await updateMachineDowntime(Number(id),form);

    saving=false;

    alert("Updated Successfully");

    goto("/machine-downtime");

}
</script>

{#if loading}

<h2>Loading...</h2>

{:else}

<h1>Edit Machine Downtime</h1>

<div class="card">

<div class="grid">

<div>

<label>Date</label>

<input
type="date"
bind:value={form.report_date}>

</div>

<div>

<label>Department</label>

<select bind:value={form.department}>

<option>SMT</option>

<option>FATP</option>

<option>Warehouse</option>

<option>Maintenance</option>

</select>

</div>

<div>

<label>Production Line</label>

<input bind:value={form.production_line}>

</div>

<div>

<label>Machine</label>

<input bind:value={form.machine}>

</div>

<div>

<label>Category</label>

<select bind:value={form.category}>

<option>Breakdown</option>

<option>Maintenance</option>

<option>Power</option>

<option>Material</option>

<option>Setup</option>

<option>Quality</option>

<option>Other</option>

</select>

</div>

<div>

<label>Duration</label>

<input
type="number"
bind:value={form.duration_min}>

</div>

</div>

<label>Reason</label>

<textarea
rows="3"
bind:value={form.reason}>
</textarea>

<label>Corrective Action</label>

<textarea
rows="3"
bind:value={form.action_taken}>
</textarea>

<div class="grid">

<div>

<label>Reported By</label>

<input bind:value={form.reported_by}>

</div>

<div>

<label>Status</label>

<select bind:value={form.status}>

<option>Open</option>

<option>Closed</option>

</select>

</div>

</div>

<button
on:click={save}
disabled={saving}>

{saving?"Updating...":"Update Downtime"}

</button>

</div>

{/if}

<style>

.card{

background:white;

padding:25px;

border-radius:12px;

box-shadow:0 5px 15px rgba(0,0,0,.08);

}

.grid{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(250px,1fr));

gap:20px;

margin-bottom:20px;

}

label{

display:block;

margin-bottom:5px;

font-weight:bold;

}

input,
select,
textarea{

width:100%;

padding:10px;

border:1px solid #ddd;

border-radius:8px;

box-sizing:border-box;

}

textarea{

margin-bottom:20px;

}

button{

background:#2563eb;

color:white;

padding:12px 20px;

border:none;

border-radius:8px;

cursor:pointer;

}

@media(max-width:768px){

.grid{

grid-template-columns:1fr;

}

}

</style>