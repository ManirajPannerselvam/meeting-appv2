<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { getMeetingById } from "$lib/stores/meetings";
    import { supabaseChat } from "$lib/supabase/client";

    let meeting: any = null;
    let loading = true;
    $: id = $page.params.id;

    onMount(async () => {
        if(!browser) return;
        loading = true;
        try{
          let m:any = await getMeetingById(id);
          if(m) meeting = m;
          try{
            const { data } = await supabaseChat.from('meetings').select('*').eq('id', id).maybeSingle();
            if(data) meeting = data;
            if(!data && !isNaN(Number(id))){
              const { data:data2 } = await supabaseChat.from('meetings').select('*').eq('id', Number(id)).maybeSingle();
              if(data2) meeting = data2;
            }
          }catch{}
        }catch(e){ console.error(e); }
        finally{ loading=false; }
    });

    function formatDate(date: string) {
        if (!date) return "-";
        const d = new Date(date);
        return isNaN(d.getTime()) ? date : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    }
    function formatTime(t: any){ if(!t) return "--:--"; return String(t).substring(0,5); }
    function getStatus(m: any): string {
        if (!m?.meeting_date) return "Upcoming";
        if (m.completed || m.status === 'completed') return "Completed";
        const now = new Date();
        const mt = new Date(`${m.meeting_date}T${m.start_time || "00:00"}`);
        if(isNaN(mt.getTime())) return "Upcoming";
        const today = new Date(); today.setHours(0,0,0,0);
        const mDay = new Date(mt); mDay.setHours(0,0,0,0);
        if(mDay.getTime()===today.getTime()){
          if(mt>now) return "Today";
          const end = new Date(`${m.meeting_date}T${m.end_time || "23:59"}`);
          if(end < now) return "Completed";
          return "In Progress";
        }
        return mt > now ? "Upcoming" : "Overdue";
    }
    function goMinutes(){
      // safe navigation - if minutes folder not exist, show alert
      goto(`/minutes/${id}`).catch(()=>{ alert("Create src/routes/minutes/[id]/+page.svelte first"); });
    }
</script>

<svelte:head>
<style>
  html,body{ overflow:auto!important; height:auto!important; }
  body{ background:#f6f8fb; -webkit-overflow-scrolling:touch; }
</style>
</svelte:head>

<div class="app">
  <div class="topbar">
    <button class="icon-btn" on:click={()=>goto("/meeting-list")}>‹</button>
    <div class="crumbs"><span class="c" on:click={()=>goto("/meeting-list")}>Meetings</span><span>/</span><b>#{id}</b></div>
    <div class="acts">
      <button class="btn light" on:click={()=>goto(`/meetings/edit/${id}`)}>Edit</button>
      <button class="btn dark" on:click={goMinutes}>Minutes</button>
    </div>
  </div>

  <div class="wrap">
    {#if loading}
      <div class="card"><div class="sk h"></div><div class="sk w60"></div><div class="sk card"></div></div>
    {:else if !meeting}
      <div class="card center"><h3>Meeting #{id} not found</h3><button class="btn dark" on:click={()=>goto("/meeting-list")}>Back to list</button></div>
    {:else}
      <div class="hero">
        <div class="meta">
          <span class="pill black">#M-{meeting.id}</span>
          <span class="pill">{meeting.type || "Meeting"}</span>
          <span class="pill pri-{meeting.priority?.toLowerCase()}">{meeting.priority || 'Low'}</span>
          <span class="st s-{getStatus(meeting).toLowerCase().replace(' ','-')}">{getStatus(meeting)}</span>
        </div>
        <h1>{meeting.title}</h1>
        <div class="sub">By <b>{meeting.organizer || "-"}</b> • {meeting.department || "General"} • 📅 {formatDate(meeting.meeting_date)} • ⏰ {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}</div>
      </div>

      <div class="grid">
        <div class="left">
          <div class="card"><h4>Overview</h4>
            <div class="tbl">
              <div><label>Location</label><span>📍 {meeting.location || "-"}</span></div>
              <div><label>Mode</label><span>{meeting.meeting_mode || "-"}</span></div>
              <div><label>Department</label><span>{meeting.department || "-"}</span></div>
              <div><label>Reminder</label><span>{meeting.reminder_minutes || 15} min</span></div>
              {#if meeting.reference_no}<div><label>Ref</label><span class="mono">{meeting.reference_no}</span></div>{/if}
              {#if meeting.meeting_link}<div><label>Link</label><a href={meeting.meeting_link} target="_blank">{meeting.meeting_link}</a></div>{/if}
            </div>
          </div>
          {#if meeting.meeting_objective}<div class="card"><h4>Objective</h4><div class="prose">{meeting.meeting_objective}</div></div>{/if}
          {#if meeting.agenda}<div class="card"><h4>Agenda</h4><div class="prose">{meeting.agenda}</div></div>{/if}
        </div>

        <div class="right">
          <div class="card sticky">
            <h4>Participants • {meeting.participants?.length || 0}</h4>
            {#if meeting.participants?.length}
              <div class="peeps">{#each meeting.participants as p,i}<div class="p"><div class="av" style="background:hsl({(i*47)%360} 70% 92%)">{p[0]?.toUpperCase()}</div><span>{p}</span></div>{/each}</div>
            {:else}<p class="muted">No participants</p>{/if}
            <div class="stack">
              <button class="btn dark full" on:click={()=>goto(`/meetings/edit/${id}`)}>✏️ Edit</button>
              <button class="btn light full" on:click={goMinutes}>📝 Minutes</button>
              <button class="btn ghost full" on:click={()=>goto("/meeting-list")}>Back</button>
            </div>
          </div>
        </div>
      </div>
    {/if}
    <div class="spacer"></div>
  </div>

  <div class="mob">
    <button class="btn light" on:click={()=>goto("/meeting-list")}>List</button>
    <button class="btn light" on:click={()=>goto(`/meetings/edit/${id}`)}>Edit</button>
    <button class="btn dark" on:click={goMinutes}>Minutes</button>
  </div>
</div>

<style>
.app{ min-height:100dvh; display:flex; flex-direction:column; background:#f6f8fb; font-family:Inter,system-ui; }
.topbar{ position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; background:rgba(255,255,255,.92); backdrop-filter:blur(12px); border-bottom:1px solid #eef2f7; }
.icon-btn{ width:36px; height:36px; border-radius:10px; border:1px solid #e2e8f0; background:white; cursor:pointer; }
.crumbs{ display:flex; gap:6px; align-items:center; font-size:13px; flex:1; } .c{ color:#64748b; cursor:pointer; }
.btn{ padding:9px 14px; border-radius:10px; font-weight:600; font-size:12px; cursor:pointer; border:1px solid #e2e8f0; background:white; }.btn.dark{ background:#0f172a; color:white; border-color:#0f172a; }.btn.light{ background:white; }.btn.ghost{ background:#f8fafc; }.full{ width:100%; }
.acts{ display:flex; gap:8px; }

.wrap{ max-width:1100px; width:100%; margin:0 auto; padding:14px; flex:1; }
.hero{ background:white; border:1px solid #eef2f7; border-radius:18px; padding:18px; } .hero h1{ margin:10px 0 6px; font-size:20px; font-weight:800; } .sub{ font-size:12px; color:#64748b; }
.meta{ display:flex; gap:6px; flex-wrap:wrap; } .pill{ padding:4px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; background:#f8fafc; border:1px solid #eef2f7; } .pill.black{ background:#0f172a; color:white; } .pill.pri-critical{ background:#fef2f2; color:#dc2626; } .pill.pri-high{ background:#fff7ed; color:#ea580c; } .st{ padding:4px 10px; border-radius:20px; font-size:10px; font-weight:800; text-transform:uppercase; } .s-today,.s-in-progress{ background:#dcfce7; color:#15803d; } .s-upcoming{ background:#dbeafe; color:#1d4ed8; } .s-completed{ background:#f1f5f9; color:#64748b; } .s-overdue{ background:#fee2e2; color:#b91c1c; }

.grid{ display:grid; grid-template-columns:1fr 320px; gap:14px; margin-top:14px; }
.card{ background:white; border:1px solid #eef2f7; border-radius:16px; padding:16px; } .card h4{ margin:0 0 12px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.4px; }
.tbl div{ display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid #f8fafc; font-size:13px; } .tbl label{ color:#64748b; font-size:12px; } .tbl span{ font-weight:600; text-align:right; max-width:60%; word-break:break-all; } .mono{ font-family:monospace; } a{ color:#2563eb; text-decoration:none; }
.prose{ background:#fbfdff; border:1px solid #f1f5f9; border-radius:12px; padding:12px; font-size:13px; line-height:1.6; white-space:pre-wrap; }
.peeps{ display:flex; flex-direction:column; gap:8px; } .p{ display:flex; gap:10px; align-items:center; font-size:13px; } .av{ width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font-weight:700; font-size:11px; }
.stack{ display:flex; flex-direction:column; gap:8px; margin-top:14px; }
.sticky{ position:sticky; top:66px; }
.center{ text-align:center; } .muted{ color:#94a3b8; font-size:12px; }
.sk{ background:#eef2f7; border-radius:10px; height:16px; margin:8px 0; animation:pulse 1.2s infinite; } .sk.h{ height:70px; } .sk.w60{ width:60%; } .sk.card{ height:120px; } @keyframes pulse{ 0%{ opacity:.6; } 50%{ opacity:1; } 100%{ opacity:.6; } }
.spacer{ height:80px; }
.mob{ display:none; }

@media(max-width:900px){
 .grid{ grid-template-columns:1fr; } .sticky{ position:static; } .acts{ display:none; }
 .mob{ display:flex; position:fixed; bottom:0; left:0; right:0; background:white; border-top:1px solid #e2e8f0; padding:10px; gap:8px; z-index:30; padding-bottom:calc(10px + env(safe-area-inset-bottom)); } .mob .btn{ flex:1; height:44px; }
 .wrap{ padding:10px; padding-bottom:90px; } .hero h1{ font-size:17px; }
}
</style>