<script lang="ts">

import { createEventDispatcher } from "svelte";

const dispatch = createEventDispatcher();

let name = "";
let department = "";
let icon = "📄";

let fields = [
    {
        label: "",
        type: "text"
    }
];

function addField() {

    fields = [
        ...fields,
        {
            label: "",
            type: "text"
        }
    ];

}

async function saveTemplate() {

    const res = await fetch("/api/templates", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            name,

            department,

            icon,

            fields

        })

    });

    if (res.ok) {

        alert("Template Saved Successfully");

        dispatch("saved");

    }
    else {

        alert("Failed to Save Template");

    }

}

</script>

<h2>Create Template</h2>

<input
    bind:value={name}
    placeholder="Template Name"
/>

<input
    bind:value={department}
    placeholder="Department"
/>

<input
    bind:value={icon}
    placeholder="Icon"
/>

<h3>Fields</h3>

{#each fields as field, i}

<div class="field">

    <input
        bind:value={field.label}
        placeholder="Field Name"
    />

    <select bind:value={field.type}>

        <option value="text">Text</option>

        <option value="number">Number</option>

        <option value="date">Date</option>

        <option value="time">Time</option>

    </select>

</div>

{/each}

<button on:click={addField}>

➕ Add Field

</button>

<hr>

<button
    class="save"
    on:click={saveTemplate}
>

💾 Save Template

</button>

<style>

input,
select{

width:100%;

padding:10px;

margin:8px 0;

}

.field{

display:flex;

gap:10px;

}

.save{

margin-top:20px;

width:100%;

padding:12px;

background:#25D366;

color:white;

border:none;

border-radius:8px;

cursor:pointer;

}

</style>