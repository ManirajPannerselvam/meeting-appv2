<script lang="ts">

    interface Widget{
        id:number;
        icon:string;
        title:string;
        color:string;
    }

    const widgets:Widget[]=[

        {id:1,icon:"🎯",title:"Target",color:"#2563eb"},
        {id:2,icon:"📦",title:"Actual",color:"#16a34a"},
        {id:3,icon:"📈",title:"Yield",color:"#0891b2"},
        {id:4,icon:"❌",title:"RR",color:"#dc2626"},
        {id:5,icon:"⏱",title:"Downtime",color:"#ea580c"},
        {id:6,icon:"⚡",title:"UPH",color:"#9333ea"},
        {id:7,icon:"🏭",title:"Production",color:"#0f766e"},
        {id:8,icon:"🛠",title:"Engineering",color:"#0284c7"},
        {id:9,icon:"🔍",title:"Quality",color:"#d97706"},
        {id:10,icon:"📊",title:"Pareto",color:"#1d4ed8"},
        {id:11,icon:"📉",title:"Trend",color:"#0ea5e9"},
        {id:12,icon:"🚨",title:"Alarm",color:"#b91c1c"}

    ];

</script>

<div class="panel">

<h2>📊 KPI Widget Library</h2>

<div class="grid">

{#each widgets as widget}

<div class="card">

<div
class="icon"
style="background:{widget.color}"
>

{widget.icon}

</div>

<h3>{widget.title}</h3>

<button>

➕ Add Widget

</button>

</div>

{/each}

</div>

</div>

<style>

.panel{

background:white;

padding:25px;

border-radius:18px;

box-shadow:0 6px 18px rgba(0,0,0,.08);

}

.grid{

display:grid;

grid-template-columns:repeat(auto-fill,minmax(170px,1fr));

gap:15px;

margin-top:20px;

}

.card{

border:1px solid #e5e7eb;

border-radius:15px;

padding:18px;

text-align:center;

transition:.2s;

}

.card:hover{

transform:translateY(-4px);

box-shadow:0 6px 18px rgba(0,0,0,.08);

}

.icon{

width:60px;

height:60px;

border-radius:15px;

display:flex;

align-items:center;

justify-content:center;

font-size:28px;

color:white;

margin:auto;

margin-bottom:15px;

}

button{

margin-top:12px;

width:100%;

padding:10px;

border:none;

border-radius:10px;

background:#2563eb;

color:white;

cursor:pointer;

}

</style>