<script lang="ts">

import { createEventDispatcher } from "svelte";

const dispatch=createEventDispatcher();

export let value="#2563eb";

const themes=[

"#2563eb",

"#16a34a",

"#9333ea",

"#ef4444",

"#ea580c",

"#0891b2",

"#0f766e",

"#111827"

];

</script>

<div class="themes">

{#each themes as color}

<div

class:selected={value===color}

style="background:{color}"

on:click={()=>{

value=color;

dispatch("change",color);

}}

></div>

{/each}

</div>

<style>

.themes{

display:flex;

gap:12px;

}

.themes div{

width:38px;

height:38px;

border-radius:50%;

cursor:pointer;

border:4px solid transparent;

transition:.2s;

}

.selected{

border-color:#111827!important;

transform:scale(1.1);

}

</style>