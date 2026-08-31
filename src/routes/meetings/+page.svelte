<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { supabaseChat } from '$lib/supabase/client';
    import { addMeeting } from "$lib/stores/meetings";
    const supabase = supabaseChat;
    let title=""; let type=""; let department="Production"; let priority="Medium";
    let date=""; let start_time=""; let end_time=""; let location=""; let organizer="";
    let participants=""; let agenda=""; let meetingObjective=""; let referenceNo="";
    let meetingMode="Offline"; let meetingLink=""; let reminder="15";
    let attachmentUrl=""; let loading=false;

    const meetingTypes=["Daily","Production","Quality","Engineering","Maintenance","Customer","Audit","Management","Project","Review"];
    const departments=["Production","Quality","Engineering","Maintenance","Warehouse","Planning","HR","Admin","Finance"];
    const priorities=["Low","Medium","High","Critical"];

    $: participantArray = participants.split(",").map(p=>p.trim()).filter(Boolean);
    $: progress = Math.round([title,type,date,start_time,end_time,location,organizer,agenda].filter(v=>String(v).trim()).length/8*100);

    function genRef(){ referenceNo=`MTG-${Date.now().toString().slice(-6)}`; }
    function clearForm(){ title=""; type=""; date=""; start_time=""; end_time=""; location=""; organizer=""; participants=""; agenda=""; meetingObjective=""; genRef(); window.scrollTo({top:0,behavior:'smooth'}); }

    async function saveMeeting(){
        if(!title || !type || !date || !start_time || !end_time || !location || !organizer || !agenda) return alert("Fill all * fields");
        if(start_time>=end_time) return alert("End after Start");
        loading=true;
        try{
          const payload={ title, type, department, priority, meeting_date:date, start_time, end_time, location, organizer, participants:participantArray, agenda, meeting_objective:meetingObjective, reference_no:referenceNo, meeting_mode:meetingMode, meeting_link:meetingMode==="Offline"?null:meetingLink, reminder_minutes:Number(reminder), attachment:attachmentUrl, created_by:"guest", status:"scheduled" };
          const res=await addMeeting(payload);
          if(!res) throw new Error("Save failed");
          alert("✅ Created"); goto("/meeting-list");
        }catch(e:any){ alert(e.message); } finally{ loading=false; }
    }
    onMount(genRef);
</script>

<div class="page">
  <div class="topbar">
    <div class="left"><button class="back" on:click={()=>goto("/meeting-list")}>←</button><div><h1>New Meeting</h1><small>{referenceNo}</small></div></div>
    <div class="right desktop"><button class="btn ghost" on:click={clearForm}>Reset</button><button class="btn black" on:click={saveMeeting} disabled={loading}>Save</button></div>
  </div>

  <div class="content">
    <div class="maincol">
      <div class="card"><h2>Meeting Info • {progress}%</h2>
        <div class="grid">
          <label>Title *<input bind:value={title} placeholder="Production Review"/></label>
          <label>Type *<select bind:value={type}><option value="">Select</option>{#each meetingTypes as t}<option>{t}</option>{/each}</select></label>
          <label>Department<select bind:value={department}>{#each departments as d}<option>{d}</option>{/each}</select></label>
          <label>Priority<select bind:value={priority}>{#each priorities as p}<option>{p}</option>{/each}</select></label>
        </div>
      </div>

      <div class="card"><h2>Schedule</h2>
        <div class="grid">
          <label>Date *<input type="date" bind:value={date}/></label>
          <label>Reminder<select bind:value={reminder}><option value="15">15 min</option><option value="60">1 hour</option></select></label>
          <label>Start *<input type="time" bind:value={start_time}/></label>
          <label>End *<input type="time" bind:value={end_time}/></label>
          <label>Mode<select bind:value={meetingMode}><option>Offline</option><option>Online</option><option>Hybrid</option></select></label>
          <label>Location *<input bind:value={location} placeholder="Room A"/></label>
          {#if meetingMode!=="Offline"}<label class="full">Link *<input type="url" bind:value={meetingLink} placeholder="https://..."/></label>{/if}
        </div>
      </div>

      <div class="card"><h2>People & Agenda</h2>
        <div class="grid">
          <label>Organizer *<input bind:value={organizer} placeholder="Name"/></label>
          <label>Participants<input bind:value={participants} placeholder="a@b.com, c@d.com"/></label>
          <label class="full">Objective<textarea rows="2" bind:value={meetingObjective}></textarea></label>
          <label class="full">Agenda *<textarea rows="4" bind:value={agenda}></textarea></label>
        </div>
      </div>
      <div style="height:80px"></div>
    </div>

    <div class="sidecol">
      <div class="card sticky">
        <h2>Progress {progress}%</h2>
        <div class="bar"><div style="width:{progress}%"></div></div>
        <button class="btn black full" on:click={saveMeeting} disabled={loading}>💾 Save Meeting</button>
        <button class="btn ghost full mt" on:click={clearForm}>Reset</button>
      </div>
    </div>
  </div>

  <div class="bottombar">
    <button class="btn ghost" on:click={clearForm}>Reset</button>
    <button class="btn ghost" on:click={()=>goto("/meeting-list")}>Cancel</button>
    <button class="btn black" on:click={saveMeeting} disabled={loading}>Save</button>
  </div>
</div>

<style>
/* FORCE SCROLL - NO HIDDEN */
:global(html){ overflow-y:auto!important; height:auto!important; scroll-behavior:smooth; }
:global(body){ overflow-y:auto!important; height:auto!important; margin:0; background:#f5f7fb; -webkit-overflow-scrolling:touch; }

.page{ min-height:100vh; display:flex; flex-direction:column; }
.topbar{ position:sticky; top:0; z-index:10; background:rgba(255,255,255,.95); backdrop-filter:blur(10px); border-bottom:1px solid #e5e7eb; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; }
.left{ display:flex; gap:10px; align-items:center; } .left h1{ margin:0; font-size:15px; } .left small{ font-family:monospace; color:#64748b; }
.back{ width:38px; height:38px; border-radius:10px; border:1px solid #e2e8f0; background:white; cursor:pointer; }
.btn{ padding:10px 16px; border-radius:10px; font-weight:600; font-size:12px; border:1px solid #e2e8f0; background:white; cursor:pointer; } .btn.black{ background:#0f172a; color:white; border-color:#0f172a; } .btn:disabled{ opacity:.5; } .full{ width:100%; } .mt{ margin-top:8px; }

.content{ display:grid; grid-template-columns:1fr 320px; gap:16px; max-width:1200px; width:100%; margin:0 auto; padding:16px; flex:1; }
.maincol{ display:flex; flex-direction:column; gap:14px; }
.card{ background:white; border:1px solid #eef2f7; border-radius:16px; padding:16px; } .card h2{ margin:0 0 12px; font-size:12px; font-weight:800; text-transform:uppercase; }
.grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; } label{ display:flex; flex-direction:column; gap:6px; font-size:11px; font-weight:600; color:#475569; } label.full{ grid-column:1/-1; }
input,select,textarea{ padding:11px; border-radius:10px; border:1px solid #e2e8f0; background:#fbfdff; font-size:14px; width:100%; box-sizing:border-box; } textarea{ resize:vertical; }
.bar{ height:8px; background:#f1f5f9; border-radius:10px; overflow:hidden; margin:10px 0; } .bar div{ height:100%; background:#0f172a; transition:width .3s; }
.sticky{ position:sticky; top:70px; }
.bottombar{ display:none; }

@media(max-width:900px){
  .content{ grid-template-columns:1fr; padding:12px; padding-bottom:90px; }
  .sidecol{ order:-1; } .sticky{ position:static; }
  .grid{ grid-template-columns:1fr; }
  .desktop{ display:none; }
  .bottombar{ display:flex; position:fixed; bottom:0; left:0; right:0; background:white; border-top:1px solid #e2e8f0; padding:10px; gap:8px; z-index:20; padding-bottom:calc(10px + env(safe-area-inset-bottom)); }
  .bottombar .btn{ flex:1; height:44px; }
  input,select,textarea{ font-size:16px; }
}
</style>