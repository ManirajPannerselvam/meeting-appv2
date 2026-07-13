<script lang="ts">

import { createEventDispatcher } from "svelte";

export let item:any;

const dispatch=createEventDispatcher();

</script>

<div
class="card"
on:click={()=>dispatch("select",item)}
>

<div class="icon">

{item.icon}

</div>

<h3>

{item.name}

</h3>

<p>

{item.description}

</p>

<span>

{item.category}

</span>

</div>

<style>

.card{

background:white;

padding:20px;

border-radius:16px;

cursor:pointer;

transition:.25s;

box-shadow:0 4px 16px rgba(0,0,0,.05);

}

.card:hover{

transform:translateY(-5px);

box-shadow:0 10px 24px rgba(0,0,0,.12);

}

.icon{

font-size:42px;

margin-bottom:12px;

}

span{

background:#2563eb;

color:white;

padding:4px 10px;

border-radius:20px;

font-size:12px;

}

</style>