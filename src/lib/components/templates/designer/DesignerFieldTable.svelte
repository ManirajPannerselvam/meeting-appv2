<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let fields = [];
    export let selectedIndex = 0;

    const dispatch = createEventDispatcher();

    let search = "";

    function addField() {
        dispatch("add");
    }

    function remove(index:number){
        dispatch("delete",index);
    }

    $: filtered =
        fields.filter((f:any)=>
            (f.label || "")
                .toLowerCase()
                .includes(search.toLowerCase())
        );
</script>

<div class="toolbar">

    <div class="search">

        🔍

        <input
            bind:value={search}
            placeholder="Search field..."
        />

    </div>

    <button
        class="primary"
        on:click={addField}
    >
        ＋ Add Field
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

    {#if filtered.length==0}

        <div class="empty">

            <div class="icon">📄</div>

            <h3>No Fields</h3>

            <p>

                Create your first template field.

            </p>

            <button
                class="primary"
                on:click={addField}
            >

                Add First Field

            </button>

        </div>

    {:else}

        {#each filtered as field,index}

        <div
            class:selected={selectedIndex==index}
            class="row"
            on:click={()=>selectedIndex=index}
        >

            <div>{index+1}</div>

            <div>

                <strong>

                    {field.label || "Unnamed"}

                </strong>

                <small>

                    {field.name}

                </small>

            </div>

            <div>

                <span class="type">

                    {field.type}

                </span>

            </div>

            <div>

                {#if field.required}

                    ✅

                {:else}

                    —

                {/if}

            </div>

            <div class="actions">

                <button>

                    📄

                </button>

                <button
                    on:click|stopPropagation={()=>remove(index)}
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

}

.search input{

border:none;

background:transparent;

width:100%;

outline:none;

margin-left:8px;

}

.primary{

background:#2563eb;

color:white;

border:none;

padding:10px 18px;

border-radius:10px;

cursor:pointer;

font-weight:600;

}

.table{

border:1px solid #e5e7eb;

border-radius:12px;

overflow:hidden;

}

.header{

display:grid;

grid-template-columns:60px 2fr 120px 100px 120px;

background:#f8fafc;

padding:12px;

font-weight:600;

font-size:13px;

}

.row{

display:grid;

grid-template-columns:60px 2fr 120px 100px 120px;

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

background:#e8f0ff;

}

.type{

background:#dbeafe;

padding:5px 10px;

border-radius:20px;

font-size:12px;

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