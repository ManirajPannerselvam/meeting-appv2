<script lang="ts">
    import { goto } from "$app/navigation";

    export let meetings:any[]=[];

    $: total =
        meetings.length;

    $: today =
        meetings.filter(m=>m.status==="Today").length;

    $: upcoming =
        meetings.filter(m=>m.status==="Upcoming").length;

    $: progress =
        meetings.filter(m=>m.status==="In Progress").length;

    $: completed =
        meetings.filter(m=>m.status==="Completed").length;

    $: overdue =
        meetings.filter(m=>m.status==="Overdue").length;

    $: critical =
        meetings.filter(m=>m.priority==="Critical").length;

    $: high =
        meetings.filter(m=>m.priority==="High").length;

    function open(filter:string){

        goto(`/meeting-list?filter=${filter}`);

    }

</script>

<div class="grid">

    <div class="card blue" on:click={()=>open("all")}>

        <h2>{total}</h2>

        <p>Total Meetings</p>

    </div>

    <div class="card green" on:click={()=>open("today")}>

        <h2>{today}</h2>

        <p>Today's Meetings</p>

    </div>

    <div class="card cyan" on:click={()=>open("upcoming")}>

        <h2>{upcoming}</h2>

        <p>Upcoming</p>

    </div>

    <div class="card teal" on:click={()=>open("progress")}>

        <h2>{progress}</h2>

        <p>In Progress</p>

    </div>

    <div class="card gray" on:click={()=>open("completed")}>

        <h2>{completed}</h2>

        <p>Completed</p>

    </div>

    <div class="card red" on:click={()=>open("overdue")}>

        <h2>{overdue}</h2>

        <p>Overdue</p>

    </div>

    <div class="card danger" on:click={()=>open("critical")}>

        <h2>{critical}</h2>

        <p>Critical Priority</p>

    </div>

    <div class="card orange" on:click={()=>open("high")}>

        <h2>{high}</h2>

        <p>High Priority</p>

    </div>

</div>

<style>

.grid{

display:grid;

grid-template-columns:repeat(auto-fit,minmax(220px,1fr));

gap:20px;

margin-top:20px;

}

.card{

padding:22px;

border-radius:16px;

color:white;

cursor:pointer;

transition:.25s;

box-shadow:0 6px 18px rgba(0,0,0,.08);

}

.card:hover{

transform:translateY(-5px);

box-shadow:0 12px 24px rgba(0,0,0,.18);

}

.card h2{

margin:0;

font-size:34px;

font-weight:bold;

}

.card p{

margin-top:12px;

font-size:15px;

}

.blue{background:#2563eb;}
.green{background:#16a34a;}
.cyan{background:#0891b2;}
.teal{background:#0f766e;}
.gray{background:#64748b;}
.red{background:#dc2626;}
.orange{background:#ea580c;}
.danger{background:#991b1b;}

@media(max-width:768px){

.grid{

grid-template-columns:1fr;

}

.card{

padding:18px;

}

.card h2{

font-size:28px;

}

}

</style>