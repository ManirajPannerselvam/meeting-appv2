<script lang="ts">

import { onMount } from "svelte";

let reports=[];

async function load(){

    const res=await fetch("/api/template-report/list");

    const data=await res.json();

    reports=data.reports;

}

onMount(load);

</script>

<h1>

Production Reports

</h1>

<table>

<thead>

<tr>

<th>ID</th>

<th>Template</th>

<th>Sender</th>

<th>Date</th>

</tr>

</thead>

<tbody>

{#each reports as r}

<tr>

<td>{r.id}</td>

<td>{r.template_name}</td>

<td>{r.sender}</td>

<td>{r.created_at}</td>

</tr>

{/each}

</tbody>

</table>