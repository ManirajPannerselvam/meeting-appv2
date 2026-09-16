<script lang="ts">
import { goto } from "$app/navigation";
import { onMount, onDestroy } from "svelte";
import { browser } from "$app/environment";
import { meetings, refreshMeetings, removeMeeting } from "$lib/stores/meetings";
import { supabaseChat } from "$lib/supabase/client";
import { initSecureAuth } from '$lib/stores/auth';

let search=""; let debouncedSearch=""; let selectedType="All"; let showHistory=false; let currentPage=1; let loading=true;
const pageSize=20;
const meetingTypes=["All","Internal","Customer","Management","Review","Production","Quality","PM","Safety"];
let realtimeChannel:any=null; let onFocus:any=null; let debounceTimer:any=null;
let selectedMeeting:any=null; let showPopup=false;
let activeKpi="upcoming"; // for button type

onMount(async()=>{
  if(!browser) return; loading=true;
  try{ await initSecureAuth(supabaseChat); await refreshMeetings();
    realtimeChannel=supabaseChat.channel('meetings-v6').on('postgres_changes',{event:'*',schema:'public',table:'meetings'},()=>{ clearTimeout(debounceTimer); debounceTimer=setTimeout(()=>refreshMeetings(),1000); }).subscribe();
    onFocus=()=>{ clearTimeout(debounceTimer); debounceTimer=setTimeout(()=>refreshMeetings(),600); }; window.addEventListener('focus',onFocus);
  }catch(e){ console.error(e); } finally{ loading=false; }
});
onDestroy(()=>{ if(!browser) return; if(realtimeChannel) supabaseChat.removeChannel(realtimeChannel); if(onFocus) window.removeEventListener('focus',onFocus); clearTimeout(debounceTimer); });

function handleSearch(e:any){ search=e.target.value; clearTimeout(debounceTimer); debounceTimer=setTimeout(()=>{ debouncedSearch=search.toLowerCase().trim(); currentPage=1; },250); }
function formatDate(d:string){ if(!d) return "-"; const dt=new Date(d); if(isNaN(dt.getTime())) return "-"; return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function isPast(m:any){ if(m.completed||m.status==='completed') return true; if(!m.meeting_date) return false; const t=new Date(); t.setHours(0,0,0,0); const md=new Date(m.meeting_date); md.setHours(0,0,0,0); return md.getTime()<t.getTime(); }
function isToday(m:any){ if(!m.meeting_date) return false; const t=new Date(); t.setHours(0,0,0,0); const md=new Date(m.meeting_date); md.setHours(0,0,0,0); return md.getTime()===t.getTime(); }
function getStatus(m:any){ if(m.completed||m.status==='completed') return "Completed"; if(!m.meeting_date) return "Upcoming"; const t=new Date(); t.setHours(0,0,0,0); const md=new Date(m.meeting_date); md.setHours(0,0,0,0); if(md.getTime()<t.getTime()) return "Completed"; if(md.getTime()===t.getTime()) return "Today"; return "Upcoming"; }
function viewAgenda(id:number){ selectedMeeting=$meetings.find((x:any)=>x.id===id); if(selectedMeeting) showPopup=true; }
function goMinutes(id:number){ goto(`/minutes/${id}`); }
function closePopup(){ showPopup=false; }
async function handleDelete(id:number){ if(!confirm("Delete?")) return; try{ await removeMeeting(id); await refreshMeetings(); closePopup(); }catch(e:any){ alert(e.message); } }
function formatTime(t:string){ if(!t) return "--:--"; return t.slice(0,5); }

// 1. KPI AS BUTTON TYPE - FILTER
function setKpiFilter(type:string){
  activeKpi=type; currentPage=1;
  if(type==='total'){ showHistory=false; debouncedSearch=""; selectedType="All"; }
  else if(type==='today'){ showHistory=false; }
  else if(type==='upcoming'){ showHistory=false; }
  else if(type==='history'){ showHistory=true; }
}

$: filtered=(()=>{ 
  const s=debouncedSearch; const type=selectedType;
  return $meetings.filter((m:any)=>{
    if(type!=="All"&&(m.type||"")!==type) return false;
    if(s){ const txt=`${m.title} ${m.type||""} ${m.location||""} ${m.agenda||""}`.toLowerCase(); if(!txt.includes(s)) return false; }
    if(activeKpi==='today') return isToday(m) && !isPast(m);
    if(activeKpi==='upcoming') return !isPast(m);
    if(activeKpi==='history') return isPast(m);
    if(activeKpi==='total') return true;
    const past=isPast(m); return showHistory?past:!past;
  }); 
})();
$: total=$meetings.length; $: todayCount=$meetings.filter(m=>isToday(m)&&!isPast(m)).length; $: upcomingCount=$meetings.filter(m=>!isPast(m)).length; $: completedCount=$meetings.filter(m=>isPast(m)).length;
$: totalPages=Math.max(1,Math.ceil(filtered.length/pageSize)); $: paged=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
</script>

<div class="page">
  <div class="header"><div class="h-left"><h1>Meetings</h1><p>{activeKpi} • {filtered.length} records</p></div><button class="btn-new" onclick={()=>goto("/meetings")}>+ New Meeting</button></div>

  <!-- KPI NOW BUTTON TYPE -->
  <div class="kpi-grid">
    <button class="kpi" class:act={activeKpi==='total'} onclick={()=>setKpiFilter('total')}><div class="icon blue">📊</div><div class="kv"><span>TOTAL</span><b>{total}</b></div></button>
    <button class="kpi" class:act={activeKpi==='today'} onclick={()=>setKpiFilter('today')}><div class="icon green">📅</div><div class="kv"><span>TODAY</span><b>{todayCount}</b></div></button>
    <button class="kpi" class:act={activeKpi==='upcoming'} onclick={()=>setKpiFilter('upcoming')}><div class="icon amber">⏳</div><div class="kv"><span>UPCOMING</span><b>{upcomingCount}</b></div></button>
    <button class="kpi" class:act={activeKpi==='history'} onclick={()=>setKpiFilter('history')}><div class="icon gray">✅</div><div class="kv"><span>HISTORY</span><b>{completedCount}</b></div></button>
  </div>

  <div class="toolbar">
    <input class="search" type="text" value={search} oninput={handleSearch} placeholder="Search title, type, location..." />
    <select bind:value={selectedType} onchange={()=>currentPage=1}>{#each meetingTypes as t}<option>{t}</option>{/each}</select>
    <div class="tabs"><button class:active={!showHistory} onclick={()=>{showHistory=false;activeKpi='upcoming';currentPage=1;}}>Upcoming</button><button class:active={showHistory} onclick={()=>{showHistory=true;activeKpi='history';currentPage=1;}}>History</button></div>
  </div>

  <div class="card">
    {#if loading}<div class="loading"><div class="spin"></div>Loading...</div>
    {:else}
      <table class="desk">
        <thead><tr><th>ID</th><th>Title</th><th>Date</th><th>Agenda</th><th>Actions</th></tr></thead>
        <tbody>
          {#if paged.length===0}<tr><td colspan="5" class="empty">No meetings</td></tr>
          {:else}{#each paged as m (m.id)}
            <tr><td class="mono">#{m.id}</td><td><b class="dark">{m.title}</b></td><td class="dark">{formatDate(m.meeting_date)}</td><td class="agenda-cell">{m.agenda?.slice(0,60)||'-'}</td>
            <td><div class="act"><button class="a view" onclick={()=>viewAgenda(m.id)}>Agenda</button><button class="a min" onclick={()=>goMinutes(m.id)}>Minutes</button></div></td></tr>
          {/each}{/if}
        </tbody>
      </table>

      <!-- MOBILE REDUCED CARD -->
      <div class="mob">
        {#if paged.length===0}<div class="empty-card">No meetings</div>
        {:else}{#each paged as m (m.id)}
          <div class="mcard">
            <!-- TOP: ID DATE | UPCOMING MOVED HERE -->
            <div class="mhead">
              <span class="mono">#{m.id} • {formatDate(m.meeting_date)}</span>
              <span class="badge {getStatus(m).toLowerCase()}">{getStatus(m)}</span>
            </div>
            <div class="mtitle">{m.title}</div>
            <!-- TIME + LOCATION + MANIRAJ MOVED HERE -->
            <div class="mmeta">
              <span>{formatTime(m.start_time)} - {formatTime(m.end_time)}</span>
              <span>📍 {m.location||'-'}</span>
              <span class="maniraj">👤 {m.organizer||'Maniraj'}</span>
            </div>
            <!-- AGENDA FIRST LINE ONLY - NO BUTTON TYPE -->
            {#if m.agenda}<div class="agenda-line">📋 {m.agenda.slice(0,55)}{m.agenda.length>55?'...':''}</div>{/if}
            <!-- 3 OPTIONS MOVED TO UPCOMING PLACE - REDUCED SIZE -->
            <div class="mactions">
              <button class="btn ag" onclick={()=>viewAgenda(m.id)}>Agenda</button>
              <button class="btn mi" onclick={()=>goMinutes(m.id)}>Minutes</button>
              <button class="btn del" onclick={()=>handleDelete(m.id)}>🗑</button>
            </div>
          </div>
        {/each}{/if}
      </div>
    {/if}
  </div>

  <div class="pager"><button onclick={()=>{if(currentPage>1)currentPage--;}} disabled={currentPage===1}>Prev</button><span>Page {currentPage}/{totalPages}</span><button onclick={()=>{if(currentPage<totalPages)currentPage++;}} disabled={currentPage===totalPages}>Next</button></div>
</div>

{#if showPopup && selectedMeeting}
<div class="overlay" onclick={closePopup} role="presentation">
  <div class="popup" onclick={(e)=>e.stopPropagation()} role="dialog" aria-modal="true">
    <div class="phead"><div><small>#{selectedMeeting.id} • {selectedMeeting.type}</small><h2>{selectedMeeting.title}</h2></div><button class="close" onclick={closePopup}>✕</button></div>
    <div class="pbody">
      <div class="grid2"><div class="it"><label>Date</label><b>{formatDate(selectedMeeting.meeting_date)}</b></div><div class="it"><label>Time</label><b>{formatTime(selectedMeeting.start_time)} - {formatTime(selectedMeeting.end_time)}</b></div><div class="it"><label>Location</label><b>{selectedMeeting.location}</b></div><div class="it"><label>Organizer</label><b>{selectedMeeting.organizer}</b></div></div>
      <div class="box"><label>Agenda</label><p>{selectedMeeting.agenda||'-'}</p></div>
    </div>
    <div class="pfoot"><button class="b ghost" onclick={closePopup}>Close</button><button class="b dark" onclick={()=>goMinutes(selectedMeeting.id)}>Go to Minutes →</button></div>
  </div>
</div>
{/if}

<style>
.page{max-width:1200px;margin:0 auto;padding:10px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;min-height:100vh;}
.header{display:flex;justify-content:space-between;align-items:center;} .h-left h1{margin:0;font-size:20px;font-weight:800;color:#0f172a;} .h-left p{margin:0;font-size:11px;color:#334155;font-weight:600;text-transform:capitalize;} .btn-new{background:#0f172a;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;display:flex;align-items:center;gap:8px;height:52px;box-sizing:border-box;cursor:pointer;text-align:left;width:100%;transition:.15s;}
.kpi.act{border-color:#0f172a;background:#0f172a;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15);} .kpi.act .kv b,.kpi.act .kv span{color:#fff;}
.icon{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:12px;flex-shrink:0;} .icon.blue{background:#eff6ff;} .icon.green{background:#dcfce7;} .icon.amber{background:#fef3c7;} .icon.gray{background:#f1f5f9;}
.kv span{font-size:9px;color:#475569;font-weight:700;display:block;} .kv b{font-size:14px;color:#0f172a;font-weight:800;}
.toolbar{display:flex;gap:6px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:6px;}
.search{flex:1;min-width:0;height:34px;padding:0 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px;color:#0f172a;box-sizing:border-box;}
.toolbar select{height:34px;padding:0 8px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-weight:600;font-size:11px;color:#0f172a;flex-shrink:0;max-width:70px;}
.tabs{display:flex;background:#f1f5f9;border-radius:8px;padding:2px;gap:2px;flex-shrink:0;} .tabs button{height:30px;padding:0 10px;border:none;border-radius:6px;font-weight:700;font-size:11px;cursor:pointer;color:#475569;background:transparent;} .tabs button.active{background:#0f172a;color:#fff;}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;}
table{width:100%;border-collapse:collapse;min-width:800px;} th{padding:10px;text-align:left;font-size:10px;text-transform:uppercase;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0;} td{padding:10px;border-bottom:1px solid #f1f5f9;font-size:12px;}
.mono{font-family:monospace;font-size:11px;color:#475569;} .dark{color:#0f172a;font-weight:700;} .agenda-cell{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#334155;}
.badge{padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;} .badge.upcoming{background:#dbeafe;color:#1e40af;} .badge.today{background:#dcfce7;color:#166534;} .badge.completed{background:#f1f5f9;color:#475569;}
.act{display:flex;gap:5px;} .a{padding:5px 10px;border-radius:6px;border:1px solid #e2e8f0;font-size:11px;font-weight:700;cursor:pointer;} .a.view{background:#0f172a;color:#fff;} .a.min{background:#eff6ff;color:#2563eb;border-color:#dbeafe;}
.empty{text-align:center;padding:30px;color:#94a3b8;} .loading{display:flex;justify-content:center;align-items:center;gap:8px;padding:30px;color:#475569;} .spin{width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#0f172a;border-radius:50%;animation:sp .8s linear infinite;} @keyframes sp{to{transform:rotate(360deg);}}
.mob{display:none;}
.pager{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e2e8f0;padding:8px 12px;border-radius:10px;font-size:12px;color:#0f172a;font-weight:600;} .pager button{padding:6px 12px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;font-weight:700;cursor:pointer;color:#0f172a;} .pager button:disabled{opacity:.4;}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;}
.popup{background:#fff;width:100%;max-width:460px;border-radius:16px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column;animation:pop .2s ease;} @keyframes pop{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
.phead{padding:14px 16px;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid #e2e8f0;} .phead small{font-family:monospace;font-size:10px;color:#475569;font-weight:700;} .phead h2{margin:2px 0 0;font-size:15px;color:#0f172a;font-weight:800;}
.close{width:30px;height:30px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;cursor:pointer;color:#0f172a;}
.pbody{padding:14px 16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;} .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;} .it{background:#f8fafc;border:1px solid #f1f5f9;padding:8px 10px;border-radius:8px;} .it label{font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;display:block;} .it b{font-size:12px;color:#0f172a;}
.box{background:#fffbeb;border:1px solid #fde68a;padding:10px;border-radius:8px;} .box label{font-size:10px;font-weight:800;text-transform:uppercase;color:#92400e;display:block;margin-bottom:4px;} .box p{margin:0;font-size:12px;color:#0f172a;line-height:1.5;word-break:break-word;white-space:pre-wrap;}
.pfoot{padding:10px 16px;display:flex;gap:8px;border-top:1px solid #f1f5f9;} .b{flex:1;padding:10px;border-radius:8px;border:1px solid #e2e8f0;font-weight:700;font-size:12px;cursor:pointer;} .b.ghost{background:#fff;color:#0f172a;} .b.dark{background:#0f172a;color:#fff;}

@media(max-width:800px){
  .desk{display:none;} .mob{display:flex;flex-direction:column;gap:8px;padding:8px;} .card{background:transparent;border:none;}
  /* REDUCED CARD SIZE */
  .mcard{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:5px;}
  .mhead{display:flex;justify-content:space-between;align-items:center;} .mtitle{font-size:14px;font-weight:800;color:#0f172a;line-height:1.2;}
  .mmeta{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:#0f172a;font-weight:600;align-items:center;} .mmeta .maniraj{margin-left:auto;color:#475569;font-weight:700;}
  .agenda-line{background:#f8fafc;border:1px solid #f1f5f9;border-radius:6px;padding:6px 8px;font-size:11px;color:#334155;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .mactions{display:grid;grid-template-columns:1fr 1fr 36px;gap:6px;margin-top:2px;}
  .mactions .btn{height:32px;border-radius:7px;border:1px solid #e2e8f0;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;}
  .mactions .ag{background:#0f172a;color:#fff;border-color:#0f172a;} .mactions .mi{background:#eff6ff;color:#1e40af;border-color:#dbeafe;} .mactions .del{background:#fef2f2;color:#dc2626;border-color:#fecaca;}
  .overlay{align-items:flex-end;padding:0;} .popup{border-radius:16px 16px 0 0;max-width:100%;}
}
</style>