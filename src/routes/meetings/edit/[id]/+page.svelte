<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { supabaseChat } from "$lib/supabase/client";
  import { getMeetingById, updateMeeting } from "$lib/stores/meetings";

  const supabase = supabaseChat;
  $: id = Number($page.params.id);

  let loadingPage = true;
  let saving = false;
  let original: any = null;

  let title=""; let type=""; let department="Production"; let priority="Medium";
  let date=""; let start_time=""; let end_time=""; let location=""; let organizer="";
  let participants=""; let agenda=""; let meetingObjective=""; let referenceNo="";
  let meetingMode="Offline"; let meetingLink=""; let reminder="15"; let attachmentUrl="";

  const meetingTypes=["Daily","Production","Quality","Engineering","Maintenance","Customer","Audit","Management","Project","Review"];
  const departments=["Production","Quality","Engineering","Maintenance","Warehouse","Planning","HR","Admin","Finance"];
  const priorities=["Low","Medium","High","Critical"];

  $: participantArray = participants.split(",").map(p=>p.trim()).filter(Boolean);
  $: progress = Math.round([title,type,date,start_time,end_time,location,organizer,agenda].filter(v=>String(v).trim()).length/8*100);

  async function loadMeeting(){
    loadingPage=true;
    try{
      const m = await getMeetingById(id);
      if(!m){
        alert("Meeting not found"); goto("/meeting-list"); return;
      }
      original=m;
      title=m.title||""; type=m.type||""; department=m.department||"Production"; priority=m.priority||"Medium";
      date=m.meeting_date||m.date||""; start_time=m.start_time||""; end_time=m.end_time||"";
      location=m.location||""; organizer=m.organizer||""; 
      participants=Array.isArray(m.participants)?m.participants.join(", "):(m.participants||"");
      agenda=m.agenda||""; meetingObjective=m.meeting_objective||m.meetingObjective||"";
      referenceNo=m.reference_no||m.referenceNo||""; meetingMode=m.meeting_mode||m.meetingMode||"Offline";
      meetingLink=m.meeting_link||m.meetingLink||""; reminder=String(m.reminder_minutes||m.reminder||"15");
      attachmentUrl=m.attachment||"";
    }catch(e){ console.error(e); alert("Load failed"); }
    finally{ loadingPage=false; }
  }

  async function saveEdit(){
    if(!title.trim()) return alert("Title required");
    if(!type) return alert("Type required");
    if(!date) return alert("Date required");
    if(!start_time || !end_time) return alert("Time required");
    if(start_time>=end_time) return alert("End must be after start");
    if(!location.trim()) return alert("Location required");
    if(!organizer.trim()) return alert("Organizer required");

    saving=true;
    try{
      const payload={
        title, type, department, priority, meeting_date:date, start_time, end_time,
        location, organizer, participants:participantArray, agenda,
        meeting_objective:meetingObjective, reference_no:referenceNo,
        meeting_mode:meetingMode, meeting_link: meetingMode==="Offline"?null:meetingLink,
        reminder_minutes:Number(reminder), attachment:attachmentUrl,
        updated_at:new Date().toISOString()
      };
      const res = await updateMeeting(id, payload);
      if(!res) throw new Error("Update failed");

      // also update via supabase direct if store doesn't
      await supabase.from("meetings").update(payload).eq("id", id);

      window.dispatchEvent(new CustomEvent("meetings:updated"));
      localStorage.setItem("meetings_updated", Date.now().toString());
      alert("✅ Meeting Updated");
      goto(`/meetings/${id}`);
    }catch(err:any){ alert("Failed: "+err.message); console.error(err); }
    finally{ saving=false; }
  }

  onMount(loadMeeting);
</script>

<div class="page">
  <div class="topbar">
    <div class="left"><button class="back" on:click={()=>goto(`/meetings/${id}`)}>←</button><div><h1>Edit Meeting #{id}</h1><small>{referenceNo}</small></div></div>
    <div class="right desktop"><button class="btn ghost" on:click={()=>goto(`/meetings/${id}`)}>Cancel</button><button class="btn black" on:click={saveEdit} disabled={saving}>{saving?"Saving...":"Update"}</button></div>
  </div>

  {#if loadingPage}
    <div class="loading"><div class="spinner"></div><p>Loading meeting...</p></div>
  {:else}
  <div class="content">
    <div class="maincol">
      <div class="card"><h2>Meeting Info • {progress}%</h2>
        <div class="grid">
          <label>Title *<input bind:value={title}/></label>
          <label>Type *<select bind:value={type}><option value="">Select</option>{#each meetingTypes as t}<option>{t}</option>{/each}</select></label>
          <label>Department<select bind:value={department}>{#each departments as d}<option>{d}</option>{/each}</select></label>
          <label>Priority<select bind:value={priority}>{#each priorities as p}<option>{p}</option>{/each}</select></label>
        </div>
      </div>

      <div class="card"><h2>Schedule & Location</h2>
        <div class="grid">
          <label>Date *<input type="date" bind:value={date}/></label>
          <label>Reminder<select bind:value={reminder}><option value="15">15 min</option><option value="30">30 min</option><option value="60">1 hour</option><option value="1440">1 day</option></select></label>
          <label>Start *<input type="time" bind:value={start_time}/></label>
          <label>End *<input type="time" bind:value={end_time}/></label>
          <label>Mode<select bind:value={meetingMode}><option>Offline</option><option>Online</option><option>Hybrid</option></select></label>
          <label>Location *<input bind:value={location}/></label>
          {#if meetingMode!=="Offline"}<label class="full">Link *<input type="url" bind:value={meetingLink}/></label>{/if}
          <label>Ref No<input bind:value={referenceNo} readonly class="mono"/></label>
          <label>Attachment URL<input bind:value={attachmentUrl} placeholder="https://..."/></label>
        </div>
      </div>

      <div class="card"><h2>People & Agenda</h2>
        <div class="grid">
          <label>Organizer *<input bind:value={organizer}/></label>
          <label>Participants<input bind:value={participants} placeholder="a@b.com, b@c.com"/></label>
          <label class="full">Objective<textarea rows="2" bind:value={meetingObjective}></textarea></label>
          <label class="full">Agenda *<textarea rows="5" bind:value={agenda}></textarea></label>
        </div>
      </div>
      <div style="height:80px"></div>
    </div>

    <div class="sidecol">
      <div class="card sticky">
        <h2>Original</h2>
        <div class="rows">
          <div><span>ID</span><b>#{id}</b></div>
          <div><span>Created</span><b>{original?.created_at ? new Date(original.created_at).toLocaleDateString() : "-"}</b></div>
          <div><span>Status</span><b>{original?.status || "scheduled"}</b></div>
          <div><span>Progress</span><b>{progress}%</b></div>
        </div>
        <div class="bar"><div style="width:{progress}%"></div></div>
        <button class="btn black full" on:click={saveEdit} disabled={saving}>{saving?"Updating...":"💾 Update Meeting"}</button>
        <button class="btn ghost full mt" on:click={()=>goto(`/meetings/${id}`)}>View Meeting</button>
        <button class="btn ghost full mt" on:click={()=>goto("/meeting-list")}>Back to List</button>
      </div>
    </div>
  </div>
  {/if}

  <div class="bottombar">
    <button class="btn ghost" on:click={()=>goto(`/meetings/${id}`)}>Cancel</button>
    <button class="btn black" on:click={saveEdit} disabled={saving}>Update</button>
  </div>
</div>

<style>
:global(html){ overflow-y:auto!important; height:auto!important; }
:global(body){ overflow-y:auto!important; height:auto!important; margin:0; background:#f5f7fb; -webkit-overflow-scrolling:touch; }
.page{ min-height:100vh; display:flex; flex-direction:column; }
.topbar{ position:sticky; top:0; z-index:10; background:rgba(255,255,255,.96); backdrop-filter:blur(12px); border-bottom:1px solid #e5e7eb; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; }
.left{ display:flex; gap:10px; align-items:center; } .left h1{ margin:0; font-size:15px; } .left small{ font-family:monospace; color:#64748b; font-size:11px; }
.back{ width:38px; height:38px; border-radius:10px; border:1px solid #e2e8f0; background:white; cursor:pointer; }
.btn{ padding:10px 16px; border-radius:10px; font-weight:600; font-size:12px; border:1px solid #e2e8f0; background:white; cursor:pointer; } .btn.black{ background:#0f172a; color:white; border-color:#0f172a; } .btn:disabled{ opacity:.5; } .full{ width:100%; } .mt{ margin-top:8px; }
.loading{ display:grid; place-items:center; padding:80px 20px; color:#64748b; } .spinner{ width:32px; height:32px; border:3px solid #e2e8f0; border-top-color:#0f172a; border-radius:50%; animation:spin 1s linear infinite; } @keyframes spin{ to{ transform:rotate(360deg); } }

.content{ display:grid; grid-template-columns:1fr 320px; gap:16px; max-width:1200px; width:100%; margin:0 auto; padding:16px; flex:1; }
.maincol{ display:flex; flex-direction:column; gap:14px; }
.card{ background:white; border:1px solid #eef2f7; border-radius:16px; padding:16px; } .card h2{ margin:0 0 12px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.4px; }
.grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; } label{ display:flex; flex-direction:column; gap:6px; font-size:11px; font-weight:600; color:#475569; } label.full{ grid-column:1/-1; }
input,select,textarea{ padding:11px; border-radius:10px; border:1px solid #e2e8f0; background:#fbfdff; font-size:14px; width:100%; box-sizing:border-box; } .mono{ font-family:monospace; font-size:12px; }
.rows div{ display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f8fafc; font-size:12px; } .rows span{ color:#64748b; }
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