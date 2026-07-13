<script lang="ts">

let breakdown = {

    ticketNo: "DT-" + Date.now(),

    date: new Date().toISOString().substring(0,10),

    shift: "A",

    line: "",

    machine: "",

    station: "",

    alarmCode: "",

    category: "Breakdown",

    priority: "Medium",

    startTime: "",

    endTime: "",

    duration: 0,

    engineer: "",

    rootCause: "",

    correctiveAction: "",

    sparePart: "",

    remarks: "",

    status: "Open"

};

const categories=[
"Breakdown",
"PM",
"Setup",
"Material",
"Utility",
"Software",
"Others"
];

const priorities=[
"Low",
"Medium",
"High",
"Critical"
];

const statusList=[
"Open",
"In Progress",
"Waiting",
"Completed"
];

function calculateDT(){

    if(!breakdown.startTime || !breakdown.endTime) return;

    const start = new Date("1970-01-01T"+breakdown.startTime);

    const end = new Date("1970-01-01T"+breakdown.endTime);

    breakdown.duration = Math.floor(

        (end.getTime()-start.getTime())/60000

    );

}

function saveDowntime(){

    calculateDT();

    alert("Downtime Saved");

}

</script>
<div class="page">

<h1>⚙ Maintenance & Downtime</h1>

<div class="card">

<div class="grid">

<input bind:value={breakdown.ticketNo} readonly>

<input type="date" bind:value={breakdown.date}>

<select bind:value={breakdown.shift}>

<option>A</option>
<option>B</option>
<option>C</option>

</select>

<input placeholder="Production Line" bind:value={breakdown.line}>

<input placeholder="Machine Name" bind:value={breakdown.machine}>

<input placeholder="Station" bind:value={breakdown.station}>

<input placeholder="Alarm Code" bind:value={breakdown.alarmCode}>

<select bind:value={breakdown.category}>

{#each categories as c}
<option>{c}</option>
{/each}

</select>

<select bind:value={breakdown.priority}>

{#each priorities as p}
<option>{p}</option>
{/each}

</select>

<input
type="time"
bind:value={breakdown.startTime}
on:change={calculateDT}
/>

<input
type="time"
bind:value={breakdown.endTime}
on:change={calculateDT}
/>

<input
readonly
bind:value={breakdown.duration}
placeholder="Downtime (Min)"
/>

<input
placeholder="Maintenance Engineer"
bind:value={breakdown.engineer}
/>

</div>
<h3>Root Cause</h3>

<textarea rows="4"
bind:value={breakdown.rootCause}></textarea>

<h3>Corrective Action</h3>

<textarea rows="4"
bind:value={breakdown.correctiveAction}></textarea>

<h3>Spare Parts Used</h3>

<textarea rows="3"
bind:value={breakdown.sparePart}></textarea>

<h3>Remarks</h3>

<textarea rows="4"
bind:value={breakdown.remarks}></textarea>

<select bind:value={breakdown.status}>

{#each statusList as s}

<option>{s}</option>

{/each}

</select>

<button
class="save"
on:click={saveDowntime}
>

💾 Save Downtime

</button>

</div>

</div>
<style>

.page{
padding:25px;
background:#eef4fb;
min-height:100vh;
}

.card{
background:white;
padding:25px;
border-radius:16px;
box-shadow:0 5px 15px rgba(0,0,0,.08);
}

.grid{
display:grid;
grid-template-columns:repeat(2,1fr);
gap:15px;
margin-bottom:20px;
}

input,
select,
textarea{
width:100%;
padding:12px;
border:1px solid #d6dbe5;
border-radius:10px;
margin-bottom:15px;
}

textarea{
resize:vertical;
}

.save{
width:100%;
padding:15px;
background:#2563eb;
color:white;
border:none;
border-radius:10px;
font-size:16px;
cursor:pointer;
}

</style>