<script lang="ts">

let handover = {

    date:new Date().toISOString().substring(0,10),

    line:"",

    customer:"",

    model:"",

    shiftFrom:"A",

    shiftTo:"B",

    target:0,

    actual:0,

    yield:0,

    rr:0,

    downtime:0,

    operator:"",

    qualityIssue:"",

    engineeringIssue:"",

    materialIssue:"",

    pendingAction:"",

    remarks:""

};

async function saveHandover(){

    alert("Shift Handover Saved");

}

</script>
<div class="page">

<h1>🔄 Shift Handover</h1>

<div class="card">

<div class="grid">

<input type="date" bind:value={handover.date}>

<input placeholder="Production Line" bind:value={handover.line}>

<input placeholder="Customer" bind:value={handover.customer}>

<input placeholder="Model" bind:value={handover.model}>

<select bind:value={handover.shiftFrom}>

<option>A</option>

<option>B</option>

<option>C</option>

</select>

<select bind:value={handover.shiftTo}>

<option>A</option>

<option>B</option>

<option>C</option>

</select>

<input type="number" placeholder="Target" bind:value={handover.target}>

<input type="number" placeholder="Actual" bind:value={handover.actual}>

<input type="number" placeholder="Yield %" bind:value={handover.yield}>

<input type="number" placeholder="RR %" bind:value={handover.rr}>

<input type="number" placeholder="Downtime (Minutes)" bind:value={handover.downtime}>

<input placeholder="Operator" bind:value={handover.operator}>

</div>
<h2>Production Communication</h2>

<textarea
rows="4"
placeholder="Production Status"
bind:value={handover.remarks}>
</textarea>

<h2>Quality Issues</h2>

<textarea
rows="4"
bind:value={handover.qualityIssue}>
</textarea>

<h2>Engineering Issues</h2>

<textarea
rows="4"
bind:value={handover.engineeringIssue}>
</textarea>

<h2>Material Issues</h2>

<textarea
rows="4"
bind:value={handover.materialIssue}>
</textarea>

<h2>Pending Actions</h2>

<textarea
rows="4"
bind:value={handover.pendingAction}>
</textarea>

<button
class="save"
on:click={saveHandover}
>

💾 Save Shift Handover

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

margin-bottom:25px;

}

input,
select,
textarea{

width:100%;

padding:12px;

border:1px solid #d6dbe5;

border-radius:10px;

margin-bottom:15px;

font-size:14px;

}

h2{

margin-top:20px;

}

.save{

width:100%;

padding:14px;

background:#16a34a;

color:white;

border:none;

border-radius:10px;

cursor:pointer;

font-size:16px;

font-weight:bold;

margin-top:20px;

}

</style>