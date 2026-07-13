<script lang="ts">

import { createEventDispatcher } from "svelte";

const dispatch=createEventDispatcher();

const tools = [

    { icon:"📝", name:"Text", type:"text" },

    { icon:"🔢", name:"Number", type:"number" },

    { icon:"📅", name:"Date", type:"date" },

    { icon:"⏰", name:"Time", type:"time" },

    { icon:"📋", name:"Dropdown", type:"dropdown" },

    { icon:"☑", name:"Checkbox", type:"checkbox" },

    { icon:"🧾", name:"Textarea", type:"textarea" },

    { icon:"🧮", name:"Formula", type:"formula" },

    { icon:"📷", name:"Image", type:"image" },

    { icon:"📎", name:"Attachment", type:"attachment" },

    { icon:"📍", name:"GPS", type:"gps" },

    { icon:"✍", name:"Signature", type:"signature" },

    { icon:"⭐", name:"Rating", type:"rating" }

];
</script>

<div class="toolbox">

<h2>

Field Toolbox

</h2>

{#each tools as tool}

<div

class="tool"

on:click={()=>dispatch("add",tool)}

>

<div class="icon">

{tool.icon}

</div>

<div>

<b>{tool.name}</b>

</div>

</div>

{/each}

</div>

<style>

.toolbox{

background:white;

padding:20px;

border-radius:16px;

box-shadow:0 5px 18px rgba(0,0,0,.06);

}

.toolbox h2{

margin-bottom:18px;

}

.tool{

display:flex;

align-items:center;

gap:15px;

padding:12px;

border-radius:10px;

cursor:pointer;

transition:.2s;

margin-bottom:8px;

}

.tool:hover{

background:#eff6ff;

transform:translateX(5px);

}

.icon{

font-size:28px;

width:42px;

text-align:center;

}

</style>