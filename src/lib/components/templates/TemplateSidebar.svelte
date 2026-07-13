<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    let templates = [
        {
            id: 1,
            name: "Production Hourly Report"
        },
        {
            id: 2,
            name: "Machine Breakdown"
        },
        {
            id: 3,
            name: "Quality Inspection"
        }
    ];

    function selectTemplate(template:any){
        dispatch("select", template);
    }
</script>

<div class="sidebar">

    <div class="title">
        Templates
    </div>

    <button
        class="new"
        on:click={() => dispatch("create")}
    >
        + New Template
    </button>

    {#each templates as t}

        <div
            class="item"
            draggable="true"
            on:dragstart={(e)=>{
                e.dataTransfer?.setData(
                    "application/json",
                    JSON.stringify(t)
                );
            }}
            on:click={()=>selectTemplate(t)}
        >

            📄 {t.name}

        </div>

    {/each}

</div>

<style>

.sidebar{

    width:100%;
    height:100%;
    background:white;
    border-left:1px solid #ddd;
    overflow:auto;

}

.title{

    padding:15px;
    font-weight:bold;
    font-size:18px;
    background:#2563eb;
    color:white;

}

.new{

    margin:15px;
    width:calc(100% - 30px);
    padding:10px;
    border:none;
    background:#16a34a;
    color:white;
    border-radius:8px;
    cursor:pointer;

}

.item{

    margin:10px;
    padding:12px;
    border-radius:8px;
    background:#f3f4f6;
    cursor:pointer;

}

.item:hover{

    background:#dbeafe;

}

</style>