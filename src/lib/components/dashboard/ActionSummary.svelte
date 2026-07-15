<script lang="ts">
    import { goto } from "$app/navigation";

    export let actions:any[]=[];

    $: pending =
        actions.filter(a=>a.status==="Pending").length;

    $: open =
        actions.filter(a=>a.status==="Open").length;

    $: completed =
        actions.filter(a=>a.status==="Completed").length;

    $: overdue =
        actions.filter(a=>a.status==="Overdue").length;

    $: total = actions.length;

    function openStatus(status:string){

        goto(`/meeting-actions?status=${status}`);

    }

</script>

<div class="action-grid">

    <div
        class="card total"
        on:click={()=>goto("/meeting-actions")}
    >
        <h2>{total}</h2>
        <p>Total Actions</p>
    </div>

    <div
        class="card blue"
        on:click={()=>openStatus("Pending")}
    >
        <h2>{pending}</h2>
        <p>Pending</p>
    </div>

    <div
        class="card orange"
        on:click={()=>openStatus("Open")}
    >
        <h2>{open}</h2>
        <p>Open</p>
    </div>

    <div
        class="card green"
        on:click={()=>openStatus("Completed")}
    >
        <h2>{completed}</h2>
        <p>Completed</p>
    </div>

    <div
        class="card red"
        on:click={()=>openStatus("Overdue")}
    >
        <h2>{overdue}</h2>
        <p>Overdue</p>
    </div>

</div>

<style>

.action-grid{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(220px,1fr));

gap:20px;

margin-top:20px;

}

.card{

padding:22px;

border-radius:16px;

cursor:pointer;

color:white;

transition:.25s;

box-shadow:0 6px 20px rgba(0,0,0,.08);

}

.card:hover{

transform:translateY(-5px);

box-shadow:0 14px 28px rgba(0,0,0,.18);

}

.card h2{

margin:0;

font-size:34px;

}

.card p{

margin-top:10px;

font-size:15px;

}

.total{

background:#0f172a;

}

.blue{

background:#2563eb;

}

.orange{

background:#ea580c;

}

.green{

background:#16a34a;

}

.red{

background:#dc2626;

}

@media(max-width:768px){

.action-grid{

grid-template-columns:1fr;

}

.card h2{

font-size:28px;

}

}

</style>