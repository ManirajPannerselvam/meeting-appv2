<script lang="ts">
import { goto } from "$app/navigation";
import { onMount } from "svelte";
import {
    meetings,
    refreshMeetings,
    removeMeeting
} from "$lib/stores/meetings";

let search = "";
let selectedType = "All";
let showHistory = false;
let currentPage = 1;
let loading = true;
const pageSize = 10;

const meetingTypes = [
    "All", "Internal", "Customer", "Management", "Review",
    "Production", "Quality", "PM", "Safety"
];

onMount(async () => {
    loading = true;
    try {
        await refreshMeetings();
    } catch (err) {
        console.error('Failed to load meetings:', err);
    } finally {
        loading = false;
    }
});

function formatDate(date: string) {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getMeetingStatus(meeting: any): string {
    if (!meeting.meeting_date) return "Unknown";
    
    if (meeting.completed || meeting.status === 'completed') return "Completed";

    const now = new Date();
    const meetingDateTime = new Date(
        `${meeting.meeting_date}T${meeting.start_time || "00:00"}`
    );

    if (isNaN(meetingDateTime.getTime())) return "Unknown";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetingDay = new Date(meetingDateTime);
    meetingDay.setHours(0, 0, 0, 0);

    if (meetingDay.getTime() === today.getTime()) {
        if (meetingDateTime > now) return "Today";
        const endTime = new Date(`${meeting.meeting_date}T${meeting.end_time || "23:59"}`);
        if (endTime < now) return "Completed";
        return "In Progress";
    }

    if (meetingDateTime > now) return "Upcoming";
    
    return "Overdue";
}

function viewMeeting(id:number){
    if (!id) return alert("Invalid meeting ID");
    goto(`/meeting/${id}`);
}

function editMeeting(id:number){
    if (!id) return alert("Invalid meeting ID");
    goto(`/meeting/edit/${id}`);
}

function minutesMeeting(id:number){
    if (!id) return alert("Invalid meeting ID");
    goto(`/minutes/${id}`);
}

async function deleteMeeting(id:number){
    const ok = confirm("Delete this meeting?");
    if(!ok) return;
    
    try {
        await removeMeeting(id);
    } catch (err: any) {
        console.error('Delete error:', err);
        alert("Failed to delete: " + err.message);
    }
}

function resetFilters(){
    search="";
    selectedType="All";
    showHistory=false;
    currentPage=1;
}

function formatTime(time: string | null | undefined) {
    if (!time) return "--:--";
    if (time.length === 5) return time;
    if (time.length >= 8) return time.substring(0, 5);
    return time;
}

/* -------------------------
   FILTERS
--------------------------*/
$: filteredMeetings = $meetings.filter((m:any)=>{
    const text = (m.title + " " + (m.type || "") + " " + (m.location || "")).toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchType = selectedType === "All" || (m.type || "") === selectedType;
    const status = getMeetingStatus(m);
    const history = showHistory ? status === "Completed" : status !== "Completed";
    return matchSearch && matchType && history;
});

/* -------------------------
   DASHBOARD
--------------------------*/
$: totalMeetings = $meetings.length;
$: todayMeetings = $meetings.filter(m => getMeetingStatus(m) === "Today").length;
$: upcomingMeetings = $meetings.filter(m => getMeetingStatus(m) === "Upcoming").length;
$: completedMeetings = $meetings.filter(m => getMeetingStatus(m) === "Completed").length;

/* -------------------------
   PAGINATION
--------------------------*/
$: totalPages = Math.max(1, Math.ceil(filteredMeetings.length/pageSize));
$: paginatedMeetings = filteredMeetings.slice((currentPage-1)*pageSize, currentPage*pageSize);

function previousPage(){
    if(currentPage>1) currentPage--;
}

function nextPage(){
    if(currentPage<totalPages) currentPage++;
}
</script>

<!-- ===========================================
MEETING SUMMARY CARDS
=========================================== -->
<h1>📋 Meeting Management</h1>

<div class="cards">
    <div class="card total">
        <h3>Total Meetings</h3>
        <h1>{totalMeetings}</h1>
    </div>
    <div class="card today">
        <h3>Today's Meetings</h3>
        <h1>{todayMeetings}</h1>
    </div>
    <div class="card upcoming">
        <h3>Upcoming Meetings</h3>
        <h1>{upcomingMeetings}</h1>
    </div>
    <div class="card completed">
        <h3>Completed Meetings</h3>
        <h1>{completedMeetings}</h1>
    </div>
</div>

<!-- ===========================================
SEARCH & FILTER
=========================================== -->
<div class="toolbar">
    <input
        type="text"
        bind:value={search}
        placeholder="🔍 Search by title, meeting type or location..."
    />
    <select bind:value={selectedType}>
        {#each meetingTypes as type}
            <option value={type}>{type}</option>
        {/each}
    </select>
    <button
        class:active={!showHistory}
        on:click={() => {
            showHistory = false;
            currentPage = 1;
        }}
    >📋 Active
    </button>
    <button
        class:active={showHistory}
        on:click={() => {
            showHistory = true;
            currentPage = 1;
        }}
    >📜 History
    </button>
    <button class="reset" on:click={resetFilters}>Reset</button>
    <button class="new" on:click={() => goto("/meetings")}>➕ New Meeting</button>
</div>
	
<!-- ===========================================
MEETING TABLE
=========================================== -->
<div class="table-container">
    {#if loading}
        <div class="loading">Loading meetings...</div>
    {:else}
    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Date</th>
                <th>Time</th>
                <th>Location</th>
                <th>Organizer</th>
                <th>Status</th>
                <th style="text-align:center;">Actions</th>
            </tr>
        </thead>
       <tbody>
    {#if paginatedMeetings.length === 0}
        <tr>
            <td colspan="10" class="empty">
                📭 No meetings found.
            </td>
        </tr>
    {:else}
        {#each paginatedMeetings as meeting (meeting.id)}
            <tr>
                <td><strong>#{meeting.id}</strong></td>
                <td>
                    <div><strong>{meeting.title}</strong></div>
                    {#if meeting.agenda}
                        <small class="agenda">{meeting.agenda}</small>
                    {/if}
                </td>
                <td>
                    <span class="type-badge">{meeting.type || "-"}</span>
                </td>
                <td>
                    {#if meeting.priority==="Critical"}
                        <span class="priority critical">🔴 Critical</span>
                    {:else if meeting.priority==="High"}
                        <span class="priority high">🟠 High</span>
                    {:else if meeting.priority==="Medium"}
                        <span class="priority medium">🟡 Medium</span>
                    {:else}
                        <span class="priority low">🟢 Low</span>
                    {/if}
                </td>
                <td>{formatDate(meeting.meeting_date)}</td>
                <td class="time-cell">
                    🕒 <strong>{formatTime(meeting.start_time)}</strong>
                    {#if meeting.end_time}
                        - <strong>{formatTime(meeting.end_time)}</strong>
                    {/if}
                </td>
                <td>📍 {meeting.location || "-"}</td>
                <td>👤 {meeting.organizer || "-"}</td>
                <td>
                    {#if getMeetingStatus(meeting) === "Completed"}
                        <span class="badge completed">✅ Completed</span>
                    {:else if getMeetingStatus(meeting) === "In Progress"}
                        <span class="badge progress">🟢 In Progress</span>
                    {:else if getMeetingStatus(meeting) === "Today"}
                        <span class="badge today">📅 Today</span>
                    {:else if getMeetingStatus(meeting) === "Upcoming"}
                        <span class="badge upcoming">⏳ Upcoming</span>
                    {:else}
                        <span class="badge overdue">🔴 Overdue</span>
                    {/if}
                </td>
                <td>
                    <div class="actions">
                        <button class="view" title="View Meeting" on:click={() => viewMeeting(meeting.id)}>👁</button>
                        <button class="edit" title="Edit Meeting" on:click={() => editMeeting(meeting.id)}>✏</button>
                        <button class="minutes" title="Meeting Minutes" on:click={() => minutesMeeting(meeting.id)}>📝</button>
                        <button class="delete" title="Delete Meeting" on:click={() => deleteMeeting(meeting.id)}>🗑</button>
                    </div>
                </td>
            </tr>
        {/each}
    {/if}
</tbody>
    </table>
    {/if}
</div>

<!-- ===========================================
PAGINATION
=========================================== -->
<div class="pagination">
    <button on:click={previousPage} disabled={currentPage === 1}>⬅ Previous</button>
    <span>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong></span>
    <button on:click={nextPage} disabled={currentPage === totalPages}>Next ➜</button>
</div>

<style>
* { box-sizing: border-box; transition: background-color .2s, color .2s, border-color .2s; }
:global(body) { margin: 0; background: #f1f5f9; font-family: "Segoe UI", Arial, sans-serif; }
h1 { margin-bottom: 20px; color: #1e293b; font-size: 28px; font-weight: 700; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-bottom: 25px; }
.priority{ padding:6px 12px; border-radius:20px; font-size:12px; font-weight:700; color:white; display:inline-block; min-width:90px; text-align:center; }
.priority.critical{ background:#dc2626; }
.priority.high{ background:#ea580c; }
.priority.medium{ background:#ca8a04; }
.priority.low{ background:#16a34a; }
.card { background: white; border-radius: 14px; padding: 20px; box-shadow: 0 6px 18px rgba(0,0,0,.08); transition: .25s; }
.time-cell{ white-space:nowrap; font-weight:600; color:#1e293b; font-family:Consolas,"Courier New",monospace; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,.12); }
.badge.progress{ background:#16a34a; color:white; }
.badge.overdue{ background:#dc2626; color:white; }
.card h3 { margin: 0; color: #64748b; font-size: 15px; }
.card h1 { margin-top: 12px; margin-bottom: 0; font-size: 34px; }
.total { border-left: 6px solid #2563eb; }
.today { border-left: 6px solid #22c55e; }
.upcoming { border-left: 6px solid #f59e0b; }
.completed { border-left: 6px solid #64748b; }
.toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 20px; }
.toolbar input { flex: 1; min-width: 260px; padding: 12px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; }
.toolbar select { padding: 12px; border-radius: 8px; border: 1px solid #d1d5db; }
.toolbar button { padding: 11px 18px; border: none; border-radius: 8px; cursor: pointer; background: #e2e8f0; font-weight: 600; transition: .2s; }
.toolbar button:hover { transform: translateY(-2px); opacity: .95; }
.toolbar button.active { background: #2563eb; color: white; }
.reset { background: #ef4444 !important; color: white; }
.new { background: #16a34a !important; color: white; }
.table-container { background: white; border-radius: 14px; overflow-x: auto; overflow-y: hidden; box-shadow: 0 6px 18px rgba(0,0,0,.08); }
table { width: 100%; border-collapse: collapse; }
thead { background: #2563eb; color: white; }
th { padding: 15px; text-align: left; white-space: nowrap; font-size: 14px; font-weight: 600; letter-spacing: .3px; }
td { padding: 14px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
tbody tr:nth-child(even) { background: #fafafa; }
tbody tr:hover { background: #eef6ff; transition: 0.2s; }
.type-badge { background: #dbeafe; color: #1d4ed8; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
.badge { padding: 6px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; }
.badge.completed { background: #6b7280; }
.badge.today { background: #16a34a; }
.badge.upcoming { background: #2563eb; }
.actions { display: flex; gap: 8px; justify-content: center; }
.actions button { width: 36px; height: 36px; border: none; border-radius: 8px; cursor: pointer; color: white; font-size: 16px; transition: .2s; }
.actions button:hover { transform: scale(1.1); box-shadow: 0 4px 10px rgba(0,0,0,.2); }
.view { background: #2563eb; }
.edit { background: #f59e0b; }
.minutes { background: #16a34a; }
.delete { background: #dc2626; }
.pagination { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
.pagination button { background: #2563eb; color: white; border: none; border-radius: 8px; padding: 10px 18px; cursor: pointer; font-weight: 600; }
.pagination button:disabled { background: #94a3b8; cursor: not-allowed; }
.empty { text-align: center; padding: 50px; color: #64748b; font-size: 16px; font-weight: 500; }
.loading { text-align: center; padding: 50px; color: #64748b; font-size: 16px; font-weight: 500; }
.agenda { color: #64748b; font-size: 12px; }
@media(max-width:900px) { 
    .cards { grid-template-columns: 1fr; }
    .toolbar { flex-direction: column; align-items: stretch; }
    .toolbar input, .toolbar select, .toolbar button { width: 100%; }
    table { font-size: 13px; }
    th, td { padding: 10px; }
    .actions { flex-wrap: wrap; }
}
</style>