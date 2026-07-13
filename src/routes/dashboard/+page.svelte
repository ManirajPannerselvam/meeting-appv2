<script lang="ts">

const now = new Date();

const currentTime = now.toLocaleTimeString();

const shift =
    now.getHours() < 14
        ? "Shift A"
        : now.getHours() < 22
        ? "Shift B"
        : "Shift C";

let production = {

    target: 120000,

    actual: 118450,

    good: 117420,

    ng: 1030,

    yield: 99.12,

    rr: 0.42,

    uph: 1180,

    dt: 45,

    oee: 88.4

};

$: achievement = (
    production.actual /
    production.target *
    100
).toFixed(1);

const lines = [

{
line:"SMT-01",
status:"Running",
target:25000,
actual:24880,
yield:99.35,
rr:0.31,
oee:91
},

{
line:"SMT-02",
status:"Running",
target:25000,
actual:24650,
yield:98.92,
rr:0.62,
oee:89
},

{
line:"SMT-03",
status:"Breakdown",
target:25000,
actual:21450,
yield:97.81,
rr:1.35,
oee:71
},

{
line:"FATP-01",
status:"Running",
target:45000,
actual:44520,
yield:99.56,
rr:0.22,
oee:94
}

];

</script>
<div class="page">

<h1>🏭 EMS Production Dashboard</h1>

<div class="cards">

<div class="card blue">
<h2>{production.target.toLocaleString()}</h2>
<p>Daily Target</p>
</div>

<div class="card green">
<h2>{production.actual.toLocaleString()}</h2>
<p>Actual Output</p>
</div>

<div class="card teal">
<h2>{achievement}%</h2>
<p>Achievement</p>
</div>

<div class="card cyan">
<h2>{production.yield}%</h2>
<p>Yield</p>
</div>

<div class="card orange">
<h2>{production.ng}</h2>
<p>NG Qty</p>
</div>

<div class="card red">
<h2>{production.rr}%</h2>
<p>Reject Rate</p>
</div>

<div class="card purple">
<h2>{production.uph}</h2>
<p>UPH</p>
</div>

<div class="card dark">
<h2>{production.oee}%</h2>
<p>OEE</p>
</div>

<div class="card gray">
<h2>{production.dt} min</h2>
<p>Downtime</p>
</div>

</div>
<div class="summary">

<div>

<b>Current Shift</b>

<p>{shift}</p>

</div>

<div>

<b>Good Qty</b>

<p>{production.good.toLocaleString()}</p>

</div>

<div>

<b>NG Qty</b>

<p>{production.ng.toLocaleString()}</p>

</div>

<div>

<b>Last Update</b>

<p>{currentTime}</p>

</div>

</div>

<div class="table">

<table>

<thead>

<tr>

<th>Line</th>
<th>Status</th>
<th>Target</th>
<th>Actual</th>
<th>Yield</th>
<th>RR</th>
<th>OEE</th>

</tr>

</thead>

<tbody>

{#each lines as line}

<tr>

<td>

<b>{line.line}</b>

</td>

<td>

{#if line.status==="Running"}

<span class="running">

🟢 Running

</span>

{:else}

<span class="breakdown">

🔴 Breakdown

</span>

{/if}

</td>

<td>{line.target.toLocaleString()}</td>

<td>{line.actual.toLocaleString()}</td>

<td>

<span class:good={line.yield>=99}

class:warn={line.yield<99}

>

{line.yield}%

</span>

</td>

<td>

<span class:good={line.rr<0.5}

class:bad={line.rr>=0.5}

>

{line.rr}%

</span>

</td>

<td>

{line.oee}%

</td>

</tr>

{/each}

</tbody>
</table>

</div>

</div>

<style>

.page{
padding:25px;
background:#eef3f8;
min-height:100vh;
}

.cards{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
gap:18px;
margin:20px 0;
}

.card{
padding:20px;
border-radius:16px;
color:white;
box-shadow:0 6px 18px rgba(0,0,0,.08);
}

.card h2{
margin:0;
font-size:32px;
}
.summary{
display:grid;
grid-template-columns:repeat(4,1fr);
gap:15px;
margin-bottom:20px;
}

.summary div{
background:white;
padding:18px;
border-radius:14px;
box-shadow:0 5px 15px rgba(0,0,0,.08);
}

.summary b{
color:#475569;
}

.summary p{
margin-top:8px;
font-size:22px;
font-weight:bold;
}

.running{
color:#16a34a;
font-weight:bold;
}

.breakdown{
color:#dc2626;
font-weight:bold;
}

.good{
color:#16a34a;
font-weight:bold;
}

.warn{
color:#ca8a04;
font-weight:bold;
}

.bad{
color:#dc2626;
font-weight:bold;
}

.teal{
background:#0f766e;
}

.gray{
background:#475569;
}

@media(max-width:900px){

.summary{

grid-template-columns:repeat(2,1fr);

}

}

.card p{
margin-top:8px;
opacity:.9;
}

.blue{background:#2563eb;}
.green{background:#16a34a;}
.red{background:#dc2626;}
.orange{background:#ea580c;}
.purple{background:#9333ea;}
.cyan{background:#0891b2;}
.dark{background:#1e293b;}

.table{
background:white;
padding:20px;
border-radius:16px;
box-shadow:0 5px 18px rgba(0,0,0,.08);
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
border-bottom:1px solid #e5e7eb;
}

tr:hover{
background:#f8fafc;
}

</style>