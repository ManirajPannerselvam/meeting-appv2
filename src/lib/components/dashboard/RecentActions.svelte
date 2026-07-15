<script lang="ts">
    import { goto } from "$app/navigation";

    export let actions:any[]=[];

    $: recent =
        [...actions]
        .sort((a,b)=>Number(b.id)-Number(a.id))
        .slice(0,10);

    function badge(status:string){

        switch(status){

            case "Completed":
                return "green";

            case "Open":
                return "orange";

            case "Pending":
                return "blue";

            case "Overdue":
                return "red";

            default:
                return "gray";

        }

    }

    function openAction(id:number){

        goto(`/meeting-action/${id}`);

    }

    function viewAll(){

        goto("/meeting-actions");

    }

</script>

<div class="card">

    <div class="header">

        <h2>✅ Meeting Action Follow-ups</h2>

        <button
            class="view-all"
            on:click={viewAll}
        >

            View All

        </button>

    </div>

    {#if recent.length===0}

        <div class="empty">

            No Action Items

        </div>

    {:else}

    <div class="table-wrapper">

        <table>

            <thead>

                <tr>

                    <th>ID</th>
                    <th>Meeting</th>
                    <th>Action</th>
                    <th>Owner</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th></th>

                </tr>

            </thead>

            <tbody>

                {#each recent as item}

                <tr>

                    <td>

                        #{item.id}

                    </td>

                    <td>

                        {item.meeting_title || "-"}

                    </td>

                    <td>

                        <strong>

                            {item.description}

                        </strong>

                    </td>

                    <td>

                        👤 {item.owner || "-"}

                    </td>

                    <td>

                        📅 {item.due_date || "-"}

                    </td>

                    <td>

                        <span class={badge(item.status)}>

                            {item.status}

                        </span>

                    </td>

                    <td>

                        <button
                            class="view"
                            on:click={()=>openAction(item.id)}
                        >

                            👁

                        </button>

                    </td>

                </tr>

                {/each}

            </tbody>

        </table>

    </div>

    {/if}

</div>

<style>

.card{

background:white;

padding:20px;

border-radius:16px;

box-shadow:0 6px 18px rgba(0,0,0,.08);

margin-top:20px;

}

.header{

display:flex;

justify-content:space-between;

align-items:center;

margin-bottom:18px;

}

.table-wrapper{

overflow:auto;

}

table{

width:100%;

border-collapse:collapse;

}

th{

background:#1e293b;

color:white;

padding:12px;

font-size:14px;

}

td{

padding:12px;

border-bottom:1px solid #e5e7eb;

}

tbody tr{

transition:.2s;

}

tbody tr:hover{

background:#eff6ff;

}

.green{

background:#16a34a;

color:white;

padding:5px 12px;

border-radius:20px;

font-size:12px;

}

.orange{

background:#ea580c;

color:white;

padding:5px 12px;

border-radius:20px;

font-size:12px;

}

.blue{

background:#2563eb;

color:white;

padding:5px 12px;

border-radius:20px;

font-size:12px;

}

.red{

background:#dc2626;

color:white;

padding:5px 12px;

border-radius:20px;

font-size:12px;

}

.gray{

background:#64748b;

color:white;

padding:5px 12px;

border-radius:20px;

font-size:12px;

}

.view{

background:#2563eb;

color:white;

border:none;

padding:8px 12px;

border-radius:8px;

cursor:pointer;

}

.view:hover{

background:#1d4ed8;

}

.view-all{

background:#16a34a;

color:white;

border:none;

padding:10px 18px;

border-radius:8px;

cursor:pointer;

}

.view-all:hover{

background:#15803d;

}

.empty{

padding:60px;

text-align:center;

color:#64748b;

font-size:16px;

}

@media(max-width:768px){

table{

font-size:13px;

}

th,td{

padding:8px;

}

.view-all{

padding:8px 14px;

font-size:13px;

}

}

</style>