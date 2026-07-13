<script lang="ts">

import { createEventDispatcher } from "svelte";

const dispatch=createEventDispatcher();

export let value="📄";

const icons=[

"📄","📊","📈","📉","📋","📌","📦","🏭",

"⚙️","🛠","🔧","🔬","🧪","💰","🧾","📁",

"📂","📑","📅","🕒","👤","👥","✅","❌",

"⚠️","🚀","💡","📝","📱","💻","🖨","🏆"

];

function choose(icon:string){

value=icon;

dispatch("change",icon);

}

</script>

<div class="picker">

{#each icons as icon}

<button

class:selected={value===icon}

on:click={()=>choose(icon)}

>

{icon}

</button>

{/each}

</div>

<style>

.picker{

display:grid;

grid-template-columns:repeat(8,1fr);

gap:10px;

}

button{

height:52px;

font-size:26px;

border:none;

background:white;

border-radius:12px;

cursor:pointer;

box-shadow:0 2px 10px rgba(0,0,0,.05);

transition:.2s;

}

button:hover{

transform:translateY(-2px);

}

.selected{

background:#2563eb;

color:white;

}

</style>