<script lang="ts">

import { createEventDispatcher } from "svelte";

const dispatch=createEventDispatcher();

export let field:any;

export let index:number;

</script>

<tr>

<td class="drag">

☰

</td>

<td>

<input
bind:value={field.name}
placeholder="Field Name"
/>

</td>

<td>

<select bind:value={field.type}>

<option>Text</option>

<option>Number</option>

<option>Date</option>

<option>Time</option>

<option>Dropdown</option>

<option>Checkbox</option>

<option>Textarea</option>

</select>

</td>

<td>

<input
type="checkbox"
bind:checked={field.required}
/>

</td>

<td>

<button
on:click={()=>dispatch("duplicate",index)}
>

📄

</button>

<button
on:click={()=>dispatch("delete",index)}
>

🗑

</button>

</td>

</tr>

<style>

.drag{

cursor:grab;

font-size:20px;

color:#64748b;

width:40px;

text-align:center;

}

button{

border:none;

background:white;

cursor:pointer;

font-size:18px;

margin-right:8px;

}

</style>