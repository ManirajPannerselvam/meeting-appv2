<script lang="ts">

import { createEventDispatcher } from "svelte";

import TemplateCard from "./TemplateCard.svelte";

import { templateLibrary } from "./templateLibrary";

const dispatch=createEventDispatcher();

let search="";

$: filtered=templateLibrary.filter(x=>

x.name.toLowerCase().includes(search.toLowerCase())

);

</script>

<h2>

📚 Production Template Library

</h2>

<input

bind:value={search}

placeholder="Search template..."

class="search"

/>

<div class="grid">

{#each filtered as item}

<TemplateCard

{item}

on:select={(e)=>dispatch("select",e.detail)}

/>

{/each}

</div>

<style>

.search{

width:100%;

padding:12px;

border-radius:10px;

border:1px solid #d1d5db;

margin:18px 0;

}

.grid{

display:grid;

grid-template-columns:repeat(auto-fill,minmax(240px,1fr));

gap:18px;

}

</style>