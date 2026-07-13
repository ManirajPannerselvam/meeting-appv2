<script lang="ts">

let issue={

issueNo:"ENG-"+Date.now(),

date:new Date().toISOString().substring(0,10),

customer:"",

model:"",

line:"",

machine:"",

priority:"Medium",

category:"Machine",

problem:"",

rootCause:"",

action:"",

owner:"",

dueDate:"",

status:"Open",

remarks:""

};

const priorities=[
"Low",
"Medium",
"High",
"Critical"
];

const categories=[
"Machine",
"Process",
"Fixture",
"Program",
"Tooling",
"Material",
"Operator",
"Others"
];

const statusList=[
"Open",
"In Progress",
"Waiting",
"Verified",
"Closed"
];

async function saveIssue(){

alert("Engineering Issue Saved");

}

</script>
<div class="page">

<h1>🛠 Engineering Issue Management</h1>

<div class="card">

<div class="grid">

<input bind:value={issue.issueNo} readonly>

<input type="date" bind:value={issue.date}>

<input placeholder="Customer" bind:value={issue.customer}>

<input placeholder="Model" bind:value={issue.model}>

<input placeholder="Production Line" bind:value={issue.line}>

<input placeholder="Machine" bind:value={issue.machine}>

<select bind:value={issue.priority}>

{#each priorities as p}

<option>{p}</option>

{/each}

</select>

<select bind:value={issue.category}>

{#each categories as c}

<option>{c}</option>

{/each}

</select>

<select bind:value={issue.status}>

{#each statusList as s}

<option>{s}</option>

{/each}

</select>

<input placeholder="Owner" bind:value={issue.owner}>

<input type="date" bind:value={issue.dueDate}>

</div>
<h3>Problem Description</h3>

<textarea
rows="4"
bind:value={issue.problem}>
</textarea>

<h3>Root Cause</h3>

<textarea
rows="4"
bind:value={issue.rootCause}>
</textarea>

<h3>Corrective Action</h3>

<textarea
rows="4"
bind:value={issue.action}>
</textarea>

<h3>Remarks</h3>

<textarea
rows="4"
bind:value={issue.remarks}>
</textarea>

<div class="upload">

<label>📷 Machine Photo</label>

<input type="file">

</div>

<button
class="save"
on:click={saveIssue}
>

💾 Save Engineering Issue

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

border-radius:18px;

box-shadow:0 5px 18px rgba(0,0,0,.08);

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

font-size:14px;

margin-bottom:15px;

}

.upload{

margin:20px 0;

padding:15px;

border:2px dashed #94a3b8;

border-radius:12px;

background:#f8fafc;

}

.save{

width:100%;

padding:15px;

background:#2563eb;

color:white;

border:none;

border-radius:10px;

font-size:16px;

font-weight:bold;

cursor:pointer;

}

</style>