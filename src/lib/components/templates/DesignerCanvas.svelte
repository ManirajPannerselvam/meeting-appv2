<script lang="ts">

interface CanvasItem{
    id:number;
    title:string;
    icon:string;
    x:number;
    y:number;
    w:number;
    h:number;
}

let items:CanvasItem=[
    {
        id:1,
        title:"Customer",
        icon:"🏢",
        x:40,
        y:40,
        w:220,
        h:70
    },
    {
        id:2,
        title:"Model",
        icon:"📱",
        x:300,
        y:40,
        w:220,
        h:70
    },
    {
        id:3,
        title:"Target Qty",
        icon:"🎯",
        x:40,
        y:150,
        w:220,
        h:70
    },
    {
        id:4,
        title:"Actual Qty",
        icon:"📦",
        x:300,
        y:150,
        w:220,
        h:70
    },
    {
        id:5,
        title:"Yield",
        icon:"📈",
        x:40,
        y:260,
        w:480,
        h:120
    }
];

let selected:number|null=null;

</script>

<div class="panel">

<div class="toolbar">

<button>➕ Text</button>

<button>🔢 Number</button>

<button>📅 Date</button>

<button>📊 Chart</button>

<button>📷 Image</button>

<button>💾 Save Layout</button>

</div>

<div class="canvas">

{#each items as item}

<div

class:selected={selected===item.id}

class="widget"

style="left:{item.x}px;
top:{item.y}px;
width:{item.w}px;
height:{item.h}px"

on:click={()=>selected=item.id}

>

<div class="header">

<span>{item.icon}</span>

<b>{item.title}</b>

</div>

</div>

{/each}

</div>

</div>

<style>

.panel{

background:white;

border-radius:20px;

padding:20px;

box-shadow:0 6px 18px rgba(0,0,0,.08);

}

.toolbar{

display:flex;

gap:10px;

flex-wrap:wrap;

margin-bottom:20px;

}

.toolbar button{

background:#2563eb;

color:white;

border:none;

padding:10px 16px;

border-radius:10px;

cursor:pointer;

}

.canvas{

position:relative;

height:700px;

background:#f8fafc;

border:2px dashed #cbd5e1;

border-radius:16px;

overflow:auto;

}

.widget{

position:absolute;

background:white;

border:2px solid #dbeafe;

border-radius:12px;

padding:10px;

cursor:pointer;

transition:.2s;

}

.widget:hover{

border-color:#2563eb;

box-shadow:0 5px 15px rgba(37,99,235,.2);

}

.selected{

border:3px solid #2563eb;

}

.header{

display:flex;

gap:10px;

align-items:center;

font-size:16px;

}

</style>