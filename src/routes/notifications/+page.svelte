<script lang="ts">

interface Notification{

    id:number;

    type:string;

    title:string;

    message:string;

    priority:string;

    department:string;

    status:string;

    time:string;

}

let notifications:Notification=[

{
id:1,
type:"Quality",
title:"Quality Alert",
message:"RR exceeded 1% on SMT-02",
priority:"High",
department:"Quality",
status:"Open",
time:"10:25"
},

{
id:2,
type:"Engineering",
title:"Machine Breakdown",
message:"AOI Camera Error",
priority:"Critical",
department:"Engineering",
status:"Open",
time:"10:32"
},

{
id:3,
type:"Maintenance",
title:"PM Due",
message:"Reflow Oven PM Today",
priority:"Medium",
department:"Maintenance",
status:"Pending",
time:"11:00"
},

{
id:4,
type:"Meeting",
title:"Production Review",
message:"Meeting starts at 2 PM",
priority:"Low",
department:"Management",
status:"Pending",
time:"09:00"
}

];

function closeNotification(id:number){

notifications=notifications.filter(n=>n.id!==id);

}

</script>
<div class="page">

<h1>🔔 Notification Center</h1>

{#each notifications as n}

<div class="card">

<div class="left">

<h2>{n.title}</h2>

<p>{n.message}</p>

<small>

{n.department}

|

{n.time}

</small>

</div>

<div class="right">

<div class={n.priority}>

{n.priority}

</div>

<button

on:click={()=>closeNotification(n.id)}

>

✓ Close

</button>

</div>

</div>

{/each}

</div>
<style>

.page{

padding:25px;

background:#eef4fb;

min-height:100vh;

}

.card{

display:flex;

justify-content:space-between;

align-items:center;

background:white;

padding:20px;

border-radius:16px;

margin-bottom:15px;

box-shadow:0 4px 12px rgba(0,0,0,.08);

}

.left h2{

margin:0;

}

.left p{

margin:8px 0;

color:#555;

}

.right{

text-align:right;

}

.High,
.Critical{

background:#dc2626;

color:white;

padding:6px 12px;

border-radius:20px;

margin-bottom:10px;

}

.Medium{

background:#f59e0b;

color:white;

padding:6px 12px;

border-radius:20px;

margin-bottom:10px;

}

.Low{

background:#16a34a;

color:white;

padding:6px 12px;

border-radius:20px;

margin-bottom:10px;

}

button{

padding:8px 14px;

background:#2563eb;

color:white;

border:none;

border-radius:8px;

cursor:pointer;

}

</style>