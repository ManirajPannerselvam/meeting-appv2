<script lang="ts">
    import { goto } from "$app/navigation";

    export let meetings:any[]=[];

    $: recent =
        [...meetings]
        .sort((a,b)=>{

            const da=new Date(`${a.meeting_date} ${a.start_time}`);
            const db=new Date(`${b.meeting_date} ${b.start_time}`);

            return db.getTime()-da.getTime();

        })
        .slice(0,10);

    function openMeeting(id:number){

        goto(`/meeting/${id}`);

    }

    function badge(status:string){

        switch(status){

            case "Today":
                return "today";

            case "Upcoming":
                return "upcoming";

            case "Completed":
                return "completed";

            case "In Progress":
                return "progress";

            case "Overdue":
                return "overdue";

            default:
                return "default";

        }

    }

    function priorityClass(priority:string){

        switch(priority){

            case "Critical":
                return "critical";

            case "High":
                return "high";

            case "Medium":
                return "medium";

            default:
                return "low";

        }

    }
</script>

<div class="card">

    <div class="header">

        <h2>📅 Recent Meetings</h2>

        <button
            class="view-all"
            on:click={()=>goto("/meeting-list")}
        >
            View All
        </button>

    </div>

    {#if recent.length===0}

        <div class="empty">

            No meetings available

        </div>

    {:else}

    <div class="table-wrapper">

        <table>

            <thead>

                <tr>

                    <th>ID</th>
                    <th>Meeting</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Organizer</th>
                    <th>Status</th>
                    <th>Priority</th>

                </tr>

            </thead>

            <tbody>

                {#each recent as meeting}

                <tr
                    on:click={()=>openMeeting(meeting.id)}
                >

                    <td>

                        #{meeting.id}

                    </td>

                    <td>

                        <strong>{meeting.title}</strong>

                        {#if meeting.type}

                            <div class="small">

                                {meeting.type}

                            </div>

                        {/if}

                    </td>

                    <td>

                        {meeting.meeting_date}

                    </td>

                    <td>

                        {meeting.start_time}
                        -
                        {meeting.end_time}

                    </td>

                    <td>

                        📍 {meeting.location||"-"}

                    </td>

                    <td>

                        👤 {meeting.organizer||"-"}

                    </td>

                    <td>

                        <span class={badge(meeting.status)}>

                            {meeting.status}

                        </span>

                    </td>

                    <td>

                        <span class={priorityClass(meeting.priority)}>

                            {meeting.priority||"Low"}

                        </span>

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

}

.header{

display:flex;

justify-content:space-between;

align-items:center;

margin-bottom:20px;

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

}

td{

padding:12px;

border-bottom:1px solid #e5e7eb;

}

tbody tr{

cursor:pointer;

transition:.2s;

}

tbody tr:hover{

background:#eff6ff;

}

.small{

font-size:12px;

color:#64748b;

margin-top:4px;

}

.today{

background:#16a34a;

color:white;

padding:5px 12px;

border-radius:20px;

}

.upcoming{

background:#2563eb;

color:white;

padding:5px 12px;

border-radius:20px;

}

.progress{

background:#0891b2;

color:white;

padding:5px 12px;

border-radius:20px;

}

.completed{

background:#64748b;

color:white;

padding:5px 12px;

border-radius:20px;

}

.overdue{

background:#dc2626;

color:white;

padding:5px 12px;

border-radius:20px;

}

.default{

background:#cbd5e1;

padding:5px 12px;

border-radius:20px;

}

.critical{

background:#dc2626;

color:white;

padding:5px 12px;

border-radius:20px;

}

.high{

background:#ea580c;

color:white;

padding:5px 12px;

border-radius:20px;

}

.medium{

background:#ca8a04;

color:white;

padding:5px 12px;

border-radius:20px;

}

.low{

background:#16a34a;

color:white;

padding:5px 12px;

border-radius:20px;

}

.view-all{

background:#2563eb;

color:white;

border:none;

padding:10px 18px;

border-radius:8px;

cursor:pointer;

}

.empty{

text-align:center;

padding:50px;

color:#64748b;

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