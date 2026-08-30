<script lang="ts">
import { createEventDispatcher } from "svelte";

const dispatch = createEventDispatcher();

interface Tool {
    icon: string;
    name: string;
    type: string;
}

const tools: Tool[] = [
    { icon: "📝", name: "Text", type: "text" },
    { icon: "🔢", name: "Number", type: "number" },
    { icon: "📅", name: "Date", type: "date" },
    { icon: "⏰", name: "Time", type: "time" },
    { icon: "📋", name: "Dropdown", type: "dropdown" },
    { icon: "☑", name: "Checkbox", type: "checkbox" },
    { icon: "🧾", name: "Textarea", type: "textarea" },
    { icon: "🧮", name: "Formula", type: "formula" },
    { icon: "📷", name: "Image", type: "image" },
    { icon: "📎", name: "Attachment", type: "attachment" },
    { icon: "📍", name: "GPS", type: "gps" },
    { icon: "✍", name: "Signature", type: "signature" },
    { icon: "⭐", name: "Rating", type: "rating" }
];

let search = "";

$: keyword = search.trim().toLowerCase();

$: filtered = tools.filter(t =>
    t.name.toLowerCase().includes(keyword)
);

function addTool(tool: Tool) {
    dispatch("add", {
        type: tool.type,
        label: tool.name,
        name: tool.name
    });
}
</script>

<div class="toolbox">

    <h2>🧰 Field Toolbox</h2>

    <input
        class="search"
        bind:value={search}
        placeholder="Search field..."
    />

    <div class="tool-list">

        {#each filtered as tool (tool.type)}

            <button
                type="button"
                class="tool"
                title={tool.name}
                on:click={() => addTool(tool)}
            >

                <div class="icon">
                    {tool.icon}
                </div>

                <div class="content">
                    <b>{tool.name}</b>
                    <small>{tool.type}</small>
                </div>

            </button>

        {/each}

        {#if filtered.length === 0}

            <div class="empty">
                No matching field found.
            </div>

        {/if}

    </div>

</div>

<style>

.toolbox{
background:white;
padding:20px;
border-radius:16px;
box-shadow:0 5px 18px rgba(0,0,0,.06);
display:flex;
flex-direction:column;
gap:16px;
}

.toolbox h2{
margin:0;
font-size:18px;
}

.search{
width:100%;
padding:10px 12px;
border:1px solid #dbe3ef;
border-radius:10px;
font-size:14px;
outline:none;
}

.search:focus{
border-color:#2563eb;
box-shadow:0 0 0 3px rgba(37,99,235,.15);
}

.tool-list{
display:flex;
flex-direction:column;
gap:8px;
max-height:550px;
overflow:auto;
}

.tool{
display:flex;
align-items:center;
gap:14px;
padding:12px;
border:none;
border-radius:10px;
background:white;
cursor:pointer;
transition:.2s;
text-align:left;
width:100%;
}

.tool:hover{
background:#eff6ff;
transform:translateX(4px);
}

.icon{
font-size:28px;
width:40px;
text-align:center;
flex-shrink:0;
}

.content{
display:flex;
flex-direction:column;
}

.content b{
font-size:14px;
}

.content small{
color:#94a3b8;
font-size:11px;
margin-top:2px;
}

.empty{
padding:30px;
text-align:center;
color:#94a3b8;
}

</style>