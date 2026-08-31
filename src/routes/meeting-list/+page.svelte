<script lang="ts">
import { goto } from "$app/navigation";
import { onMount, onDestroy } from "svelte";
import { browser } from "$app/environment";
import { meetings, refreshMeetings, removeMeeting } from "$lib/stores/meetings";
import { supabaseChat } from "$lib/supabase/client";

let search = ""; let selectedType = "All"; let showHistory = false; let currentPage = 1; let loading = true;
const pageSize = 10;
const meetingTypes = ["All", "Internal", "Customer", "Management", "Review","Production", "Quality", "PM", "Safety"];
let realtimeChannel: any = null;
let onFocus: any = null; let onStorage: any = null; let onCustom: any = null;

onMount(async () => {
    if(!browser) return;
    loading = true;
    try { 
      await refreshMeetings(); 
      realtimeChannel = supabaseChat.channel('meetings-list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => refreshMeetings())
        .subscribe();
      onFocus = () => refreshMeetings();
      onStorage = () => refreshMeetings();
      onCustom = () => refreshMeetings();
      window.addEventListener('focus', onFocus);
      window.addEventListener('storage', onStorage);
      window.addEventListener('meetings:updated', onCustom);
    } catch (err) { console.error(err); } finally { loading = false; }
});
onDestroy(() => {
  if(!browser) return;
  if(realtimeChannel) supabaseChat.removeChannel(realtimeChannel);
  if(onFocus) window.removeEventListener('focus', onFocus);
  if(onStorage) window.removeEventListener('storage', onStorage);
  if(onCustom) window.removeEventListener('meetings:updated', onCustom);
});

function formatDate(date: string) {
    if (!date) return "-"; const d = new Date(date); if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function getMeetingStatus(meeting: any): string {
    if (!meeting.meeting_date) return "Upcoming";
    if (meeting.completed || meeting.status === 'completed') return "Completed";
    const now = new Date();
    const meetingDateTime = new Date(`${meeting.meeting_date}T${meeting.start_time || "00:00"}`);
    if (isNaN(meetingDateTime.getTime())) return "Upcoming";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const meetingDay = new Date(meetingDateTime); meetingDay.setHours(0, 0, 0, 0);
    if (meetingDay.getTime() === today.getTime()) {
        if (meetingDateTime > now) return "Today";
        const endTime = new Date(`${meeting.meeting_date}T${meeting.end_time || "23:59"}`);
        if (endTime < now) return "Completed";
        return "In Progress";
    }
    if (meetingDateTime > now) return "Upcoming"; return "Overdue";
}
function viewMeeting(id:number){ goto(`/meeting/${id}`); }
function editMeeting(id:number){ goto(`/meeting/edit/${id}`); }
function minutesMeeting(id:number){ goto(`/minutes/${id}`); }
async function handleDeleteMeeting(id:number){
    if(!confirm("Delete this meeting?")) return;
    await removeMeeting(id); await refreshMeetings();
}
function resetFilters(){ search=""; selectedType="All"; showHistory=false; currentPage=1; }
function formatTime(t: string | null | undefined) {
    if (!t) return "--:--"; if (t.length === 5) return t; if (t.length >= 8) return t.substring(0, 5); return t;
}
$: filteredMeetings = $meetings.filter((m:any)=>{
    const text = (m.title + " " + (m.type || "") + " " + (m.location || "")).toLowerCase();
    const matchSearch = search ? text.includes(search.toLowerCase()) : true;
    const matchType = selectedType === "All" || (m.type || "") === selectedType;
    const status = getMeetingStatus(m);
    return showHistory ? (matchSearch && matchType && status === "Completed") : (matchSearch && matchType && status !== "Completed");
});
$: totalMeetings = $meetings.length;
$: todayMeetings = $meetings.filter(m => getMeetingStatus(m) === "Today").length;
$: upcomingMeetings = $meetings.filter(m => { const s=getMeetingStatus(m); return s==="Upcoming"||s==="In Progress"; }).length;
$: completedMeetings = $meetings.filter(m => getMeetingStatus(m) === "Completed").length;
$: totalPages = Math.max(1, Math.ceil(filteredMeetings.length/pageSize));
$: paginatedMeetings = filteredMeetings.slice((currentPage-1)*pageSize, currentPage*pageSize);
$: search, selectedType, showHistory, currentPage = 1;
function previousPage(){ if(currentPage>1) currentPage--; }
function nextPage(){ if(currentPage<totalPages) currentPage++; }
</script>

<div class="page">
  <div class="page-header">
    <div><h1>📋 Meetings</h1><p>Manage all scheduled meetings</p></div>
    <button class="new desktop-only" on:click={() => goto("/meetings")}>➕ New Meeting</button>
  </div>

  <div class="cards">
      <div class="kpi total"><span class="kpi-icon">📊</span><div><h3>Total</h3><h2>{totalMeetings}</h2></div></div>
      <div class="kpi today"><span class="kpi-icon">📅</span><div><h3>Today</h3><h2>{todayMeetings}</h2></div></div>
      <div class="kpi upcoming"><span class="kpi-icon">⏳</span><div><h3>Upcoming</h3><h2>{upcomingMeetings}</h2></div></div>
      <div class="kpi completed"><span class="kpi-icon">✅</span><div><h3>Completed</h3><h2>{completedMeetings}</h2></div></div>
  </div>

  <div class="toolbar">
      <input type="text" bind:value={search} placeholder="🔍 Search title, type, location..." />
      <select bind:value={selectedType}>
          {#each meetingTypes as type}<option value={type}>{type}</option>{/each}
      </select>
      <div class="toolbar-row">
        <button class:active={!showHistory} on:click={() => showHistory = false}>📋 Active</button>
        <button class:active={showHistory} on:click={() => showHistory = true}>📜 History</button>
        <button class="reset" on:click={resetFilters}>Reset</button>
        <button class="new mobile-only" on:click={() => goto("/meetings")}>➕ New</button>
      </div>
  </div>

  <div class="table-container">
      {#if loading}
          <div class="loading">Loading meetings...</div>
      {:else}
      <table class="desktop-table">
          <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Priority</th><th>Date</th><th>Time</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
          {#if paginatedMeetings.length === 0}
              <tr><td colspan="9" class="empty">📭 No meetings found.</td></tr>
          {:else}
              {#each paginatedMeetings as meeting (meeting.id)}
                  <tr>
                      <td><strong>#{meeting.id}</strong></td>
                      <td><strong>{meeting.title}</strong>{#if meeting.agenda}<br><small class="agenda">{meeting.agenda.slice(0,40)}</small>{/if}</td>
                      <td><span class="type-badge">{meeting.type || "-"}</span></td>
                      <td>
                          {#if meeting.priority==="Critical"}<span class="priority critical">Critical</span>
                          {:else if meeting.priority==="High"}<span class="priority high">High</span>
                          {:else if meeting.priority==="Medium"}<span class="priority medium">Medium</span>
                          {:else}<span class="priority low">Low</span>{/if}
                      </td>
                      <td>{formatDate(meeting.meeting_date)}</td>
                      <td class="time-cell">{formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</td>
                      <td>📍 {meeting.location || "-"}</td>
                      <td>
                          {#if getMeetingStatus(meeting) === "Completed"}<span class="badge completed">Completed</span>
                          {:else if getMeetingStatus(meeting) === "Today"}<span class="badge today">Today</span>
                          {:else if getMeetingStatus(meeting) === "In Progress"}<span class="badge progress">In Progress</span>
                          {:else if getMeetingStatus(meeting) === "Upcoming"}<span class="badge upcoming">Upcoming</span>
                          {:else}<span class="badge overdue">Overdue</span>{/if}
                      </td>
                      <td><div class="actions"><button class="view" on:click={() => viewMeeting(meeting.id)}>👁</button><button class="edit" on:click={() => editMeeting(meeting.id)}>✏</button><button class="minutes" on:click={() => minutesMeeting(meeting.id)}>📝</button><button class="delete" on:click={() => handleDeleteMeeting(meeting.id)}>🗑</button></div></td>
                  </tr>
              {/each}
          {/if}
          </tbody>
      </table>

      <div class="mobile-list">
        {#if paginatedMeetings.length === 0}
          <div class="empty">📭 No meetings found.</div>
        {:else}
          {#each paginatedMeetings as meeting (meeting.id)}
            <div class="m-card" on:click={() => viewMeeting(meeting.id)}>
              <div class="m-head"><strong class="m-title">#{meeting.id} {meeting.title}</strong><span class="type-badge">{meeting.type || "-"}</span></div>
              <div class="m-row"><span>📅 {formatDate(meeting.meeting_date)}</span><span>🕒 {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</span></div>
              <div class="m-row"><span>📍 {meeting.location || "-"}</span><span>👤 {meeting.organizer || "-"}</span></div>
              <div class="m-foot">
                {#if getMeetingStatus(meeting) === "Completed"}<span class="badge completed">✅ Completed</span>
                {:else if getMeetingStatus(meeting) === "Today"}<span class="badge today">📅 Today</span>
                {:else if getMeetingStatus(meeting) === "In Progress"}<span class="badge progress">🟢 Live</span>
                {:else if getMeetingStatus(meeting) === "Upcoming"}<span class="badge upcoming">⏳ Upcoming</span>
                {:else}<span class="badge overdue">🔴 Overdue</span>{/if}
                <span class="priority {meeting.priority?.toLowerCase()}">{meeting.priority || "Low"}</span>
              </div>
              <div class="m-actions">
                <button class="view" on:click|stopPropagation={() => viewMeeting(meeting.id)}>👁</button>
                <button class="edit" on:click|stopPropagation={() => editMeeting(meeting.id)}>✏</button>
                <button class="minutes" on:click|stopPropagation={() => minutesMeeting(meeting.id)}>📝</button>
                <button class="delete" on:click|stopPropagation={() => handleDeleteMeeting(meeting.id)}>🗑</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
      {/if}
  </div>

  <div class="pagination"><button on:click={previousPage} disabled={currentPage === 1}>⬅ Prev</button><span>Page <b>{currentPage}</b> of <b>{totalPages}</b> ({filteredMeetings.length})</span><button on:click={nextPage} disabled={currentPage === totalPages}>Next ➜</button></div>
</div>

<style>
:global(html){ height:100%; overflow-y:auto; scroll-behavior:smooth; }
:global(body){ margin:0; background:#f1f5f9; font-family:Inter,Segoe UI,Arial,sans-serif; height:100%; overflow-y:auto; -webkit-overflow-scrolling:touch; }
:global(#svelte){ min-height:100%; overflow-y:auto; }

.page{ max-width:1400px; margin:0 auto; padding:14px; min-height:100vh; overflow-y:visible; display:flex; flex-direction:column; gap:12px; }
.page-header{ display:flex; justify-content:space-between; align-items:center; }
.page-header h1{ margin:0; font-size:24px; color:#1e293b; } .page-header p{ margin:2px 0 0; color:#64748b; font-size:12px; }

.cards{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.kpi{ background:white; border-radius:12px; padding:12px; display:flex; align-items:center; gap:10px; box-shadow:0 1px 3px rgba(0,0,0,.08); border-left:4px solid transparent; }
.kpi h3{ margin:0; font-size:11px; color:#64748b; font-weight:600; } .kpi h2{ margin:0; font-size:18px; color:#1e293b; }
.total{ border-color:#2563eb; }.today{ border-color:#22c55e; }.upcoming{ border-color:#f59e0b; }.completed{ border-color:#94a3b8; }

.toolbar{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; background:white; padding:10px; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.06); }
.toolbar input{ flex:1; min-width:200px; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0; font-size:14px; background:#f8fafc; }
.toolbar select{ padding:10px; border-radius:10px; border:1px solid #e2e8f0; background:#f8fafc; }
.toolbar-row{ display:flex; gap:6px; }
.toolbar button{ padding:8px 14px; border:none; border-radius:20px; cursor:pointer; background:#eef2ff; color:#334155; font-weight:600; font-size:12px; }
.toolbar button.active{ background:#2563eb; color:white; }
.reset{ background:#fee2e2!important; color:#dc2626!important; }.new{ background:#16a34a!important; color:white!important; }

.table-container{ background:white; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,.06); overflow-x:auto; }
table{ width:100%; border-collapse:collapse; min-width:850px; }
thead{ background:#f8fafc; color:#64748b; border-bottom:1px solid #e2e8f0; }
th{ padding:12px 10px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
td{ padding:12px 10px; border-bottom:1px solid #f1f5f9; font-size:12px; }

.type-badge{ background:#eff6ff; color:#2563eb; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:700; border:1px solid #dbeafe; }
.badge{ padding:4px 10px; border-radius:20px; font-size:10px; font-weight:700; }
.badge.completed{ background:#f1f5f9; color:#64748b; }.badge.today{ background:#dcfce7; color:#16a34a; }.badge.upcoming{ background:#dbeafe; color:#2563eb; }.badge.progress{ background:#dcfce7; color:#15803d; }.badge.overdue{ background:#fee2e2; color:#dc2626; }
.priority{ padding:4px 10px; border-radius:20px; font-size:10px; font-weight:700; }
.priority.critical{ background:#fee2e2; color:#dc2626; }.priority.high{ background:#ffedd5; color:#ea580c; }.priority.medium{ background:#fef9c3; color:#a16207; }.priority.low{ background:#dcfce7; color:#15803d; }
.time-cell{ font-family:monospace; font-weight:600; }
.actions{ display:flex; gap:5px; }
.actions button{ width:32px; height:32px; border:none; border-radius:8px; cursor:pointer; color:white; display:flex; align-items:center; justify-content:center; }
.view{ background:#2563eb; }.edit{ background:#f59e0b; }.minutes{ background:#16a34a; }.delete{ background:#ef4444; }
.pagination{ display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; }
.pagination button{ background:white; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; font-weight:600; cursor:pointer; }
.pagination button:disabled{ opacity:.5; }
.empty,.loading{ text-align:center; padding:40px; color:#94a3b8; }
.mobile-list{ display:none; }

/* ===== MOBILE FIX ===== */
@media(max-width:900px){
 .page{ padding:8px; gap:8px; background:#f8fafc; }
 .cards{ grid-template-columns:1fr 1fr; gap:6px; }
 .kpi{ padding:10px; border-radius:10px; } .kpi h2{ font-size:16px; }
 .toolbar{ padding:8px; gap:6px; border-radius:10px; }
 .toolbar input{ font-size:16px; width:100%; min-width:0; }
 .toolbar-row{ width:100%; } .toolbar-row button{ flex:1; }
 .desktop-table{ display:none; }
 .mobile-list{ display:flex; flex-direction:column; gap:8px; padding:0; }
 .table-container{ background:transparent; box-shadow:none; overflow:visible; }

 .m-card{
   background:white; border-radius:16px; padding:12px 12px 10px;
   box-shadow:0 1px 2px rgba(0,0,0,.06); border:1px solid #f1f5f9;
   display:flex; flex-direction:column; gap:8px;
 }
 .m-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
 .m-title{ font-size:14px; font-weight:700; color:#0f172a; line-height:1.2; flex:1; }
 .m-row{ display:flex; justify-content:space-between; font-size:12px; color:#475569; }
 .m-row span{ display:flex; align-items:center; gap:4px; max-width:50%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
 .m-foot{ display:flex; gap:6px; align-items:center; flex-wrap:wrap; }

 /* FIXED ACTION BUTTONS - SMALL AND NICE */
 .m-actions{
   display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:4px;
   border-top:1px solid #f8fafc; padding-top:8px;
 }
 .m-actions button{
   height:38px; border-radius:10px; border:1px solid #f1f5f9;
   font-size:16px; font-weight:600; cursor:pointer;
   display:flex; align-items:center; justify-content:center;
   transition:all .15s;
 }
 .m-actions .view{ background:#eff6ff; color:#2563eb; border-color:#dbeafe; }
 .m-actions .edit{ background:#fffbeb; color:#d97706; border-color:#fde68a; }
 .m-actions .minutes{ background:#f0fdf4; color:#16a34a; border-color:#bbf7d0; }
 .m-actions .delete{ background:#fef2f2; color:#ef4444; border-color:#fecaca; }
 .m-actions button:active{ transform:scale(.96); }
}
</style>