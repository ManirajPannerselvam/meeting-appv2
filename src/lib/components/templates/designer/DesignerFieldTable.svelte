<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let fields: any[] = [];
    export let selectedIndex = 0;

    const dispatch = createEventDispatcher();

    let search = "";

    $: keyword = search.trim().toLowerCase();

    $: filtered = fields
        .map((field, index) => ({ field, index }))
        .filter(({ field }) => {
            if (!keyword) return true;

            return (
                (field.label ?? "").toLowerCase().includes(keyword) ||
                (field.field_name ?? "").toLowerCase().includes(keyword) ||
                (field.field_type ?? "").toLowerCase().includes(keyword)
            );
        });

    function addField() {
        dispatch("add");
    }

    function select(index: number) {
        selectedIndex = index;
    }

    function remove(index: number) {
        dispatch("delete", index);
    }
</script>

<div class="toolbar">

    <div class="search">
        🔍
        <input
            bind:value={search}
            placeholder="Search fields..."
        />
    </div>

    <button
        class="primary"
        on:click={addField}
    >
        + Add Field
    </button>

</div>

<div class="table">

    <div class="header">
        <div>#</div>
        <div>Label</div>
        <div>Type</div>
        <div>Required</div>
        <div>Action</div>
    </div>

    {#if filtered.length === 0}

        <div class="empty">

            <div class="icon">📄</div>

            <h3>No Fields</h3>

            <p>Create your first template field.</p>

            <button
                class="primary"
                on:click={addField}
            >
                Add First Field
            </button>

        </div>

    {:else}

        {#each filtered as item (item.field.id)}

            <div
                class="row"
                class:selected={selectedIndex === item.index}
                on:click={() => select(item.index)}
            >

                <div>{item.index + 1}</div>

                <div>

                    <strong>
                        {item.field.label || "Unnamed"}
                    </strong>

                    <small>
                        {item.field.field_name}
                    </small>

                </div>

                <div>

                    <span class="type">
                        {item.field.field_type}
                    </span>

                </div>

                <div>

                    {#if item.field.required}
                        ✅
                    {:else}
                        —
                    {/if}

                </div>

                <div class="actions">

                    <button
                        title="Duplicate"
                        on:click|stopPropagation={() => dispatch("duplicate", item.index)}
                    >
                        📄
                    </button>

                    <button
                        title="Delete"
                        on:click|stopPropagation={() => remove(item.index)}
                    >
                        🗑
                    </button>

                </div>

            </div>

        {/each}

    {/if}

</div>

<style>
.toolbar{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:14px;
gap:12px;
}

.search{
flex:1;
display:flex;
align-items:center;
background:#f1f5f9;
padding:8px 12px;
border-radius:10px;
border:1px solid #e2e8f0;
}

.search input{
border:none;
background:transparent;
width:100%;
outline:none;
margin-left:8px;
font-size:14px;
}

.primary{
background:#2563eb;
color:white;
border:none;
padding:10px 18px;
border-radius:10px;
cursor:pointer;
font-weight:600;
transition:.2s;
}

.primary:hover{
background:#1d4ed8;
}

.table{
border:1px solid #e5e7eb;
border-radius:12px;
overflow:hidden;
background:white;
}

.header{
display:grid;
grid-template-columns:60px 2fr 140px 100px 120px;
background:#f8fafc;
padding:12px;
font-weight:600;
font-size:13px;
}

.row{
display:grid;
grid-template-columns:60px 2fr 140px 100px 120px;
padding:12px;
border-top:1px solid #edf2f7;
align-items:center;
cursor:pointer;
transition:.2s;
}

.row:hover{
background:#f8fbff;
}

.selected{
background:#dbeafe;
}

.type{
display:inline-block;
background:#dbeafe;
padding:5px 10px;
border-radius:999px;
font-size:12px;
font-weight:600;
}

.actions{
display:flex;
gap:8px;
}

.actions button{
border:none;
background:#f3f4f6;
padding:6px 10px;
border-radius:8px;
cursor:pointer;
transition:.2s;
}

.actions button:hover{
background:#e2e8f0;
}

.empty{
padding:60px;
text-align:center;
}

.empty .icon{
font-size:54px;
opacity:.35;
margin-bottom:12px;
}

small{
display:block;
color:#94a3b8;
font-size:11px;
margin-top:3px;
}
</style>