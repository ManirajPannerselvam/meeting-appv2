<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { supabaseChat } from '$lib/supabase/client';
    import { addMeeting } from "$lib/stores/meetings";
    import { authStore, initSecureAuth, getTemplateOwner } from '$lib/stores/auth';
    import { get } from 'svelte/store';
    
    const supabase = supabaseChat;
    let title=""; let type=""; let department="Production"; let priority="Medium";
    let date=""; let start_time=""; let end_time=""; let location=""; let organizer="";
    let participants=""; let agenda=""; let meetingObjective=""; let referenceNo="";
    let meetingMode="Offline"; let meetingLink=""; let reminder="15";
    let loading=false;

    const meetingTypes=["Daily","Production","Quality","Engineering","Maintenance","Customer","Audit","Management","Project","Review"];
    const departments=["Production","Quality","Engineering","Maintenance","Warehouse","Planning","HR","Admin","Finance"];
    const priorities=["Low","Medium","High","Critical"];

    $: progress = Math.round([title,type,date,start_time,end_time,location,organizer,agenda].filter(v=>String(v).trim()).length/8*100);

    function genRef(){ const r = Math.random().toString(36).toUpperCase().slice(2,6); referenceNo=`MTG-${Date.now().toString().slice(-5)}-${r}`; }
    function clearForm(){ title=""; type=""; date=""; start_time=""; end_time=""; location=""; organizer=""; participants=""; agenda=""; meetingObjective=""; meetingMode="Offline"; meetingLink=""; genRef(); }
    function sanitize(s:string){ return s.trim().slice(0,120).replace(/[<>]/g,''); }

        async function saveMeeting(){
        if(loading) return;
        if(!title.trim()||!type||!date||!start_time||!end_time||!location.trim()||!organizer.trim()||!agenda.trim()) return alert("Fill * fields");
        if(start_time>=end_time) return alert("End after Start");
        if(meetingMode!=="Offline" && meetingLink.trim()){
          try{ const u=new URL(meetingLink.trim()); if(!['https:','http:'].includes(u.protocol)) throw 0; }catch{ return alert("Invalid link"); }
        }
        loading=true;
        try{
          let st = get(authStore);
          if(!st.user){
            await initSecureAuth(supabase);
            st = get(authStore);
          }
          const uid = st.user?.id || st.session?.user?.id || null;

          // ✅ ONLY COLUMNS THAT EXIST IN YOUR TABLE
          const payload:any={
            title:sanitize(title), 
            type:sanitize(type), 
            department, 
            priority,
            meeting_date:date, 
            start_time, 
            end_time, 
            location:sanitize(location),
            organizer: organizer ? sanitize(organizer) : (st.user?.user_metadata?.full_name || 'User').slice(0,60),
            participants:participants.split(",").map(p=>p.trim().slice(0,60)).filter(Boolean).slice(0,20),
            agenda:sanitize(agenda).slice(0,800),
            meeting_objective:sanitize(meetingObjective).slice(0,400),
            reference_no:referenceNo.slice(0,20),
            meeting_mode:meetingMode,
            meeting_link:meetingMode==="Offline"?null:meetingLink.trim().slice(0,300),
            reminder_minutes:Number(reminder),
            status:"scheduled"
          };
          if(uid) payload.created_by = uid;

          console.log("Saving:", payload);
          const res=await addMeeting(payload);
          if(!res) throw new Error("Save failed");
          goto("/meeting-list");
        }catch(e:any){ alert(e.message||e); console.error(e); } finally{ loading=false; }
    }
</script>

<div class="page">
  <div class="top">
    <button class="back" onclick={()=>goto("/meeting-list")}>←</button>
    <div class="thead"><h1>New Meeting</h1><span>{referenceNo}</span></div>
    <div class="pct-badge">{progress}%</div>
  </div>

  <div class="wrap">
    <div class="card">
      <div class="card-h"><h2>Meeting Info</h2><span class="green">{progress}%</span></div>
      <div class="grid2">
        <label><span>Title *</span><input bind:value={title} placeholder="Production Review" maxlength="80"/></label>
        <label><span>Type *</span><select bind:value={type}><option value="">Select</option>{#each meetingTypes as t}<option>{t}</option>{/each}</select></label>
        <label><span>Dept</span><select bind:value={department}>{#each departments as d}<option>{d}</option>{/each}</select></label>
        <label><span>Priority</span><select bind:value={priority}>{#each priorities as p}<option>{p}</option>{/each}</select></label>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h2>Schedule</h2></div>
      <div class="grid2">
        <label><span>Date *</span><input type="date" bind:value={date}/></label>
        <label><span>Reminder</span><select bind:value={reminder}><option value="15">15 min</option><option value="60">1 hr</option></select></label>
        <label><span>Start *</span><input type="time" bind:value={start_time}/></label>
        <label><span>End *</span><input type="time" bind:value={end_time}/></label>
        <label><span>Mode</span><select bind:value={meetingMode}><option>Offline</option><option>Online</option><option>Hybrid</option></select></label>
        <label><span>Location *</span><input bind:value={location} placeholder="Room A" maxlength="60"/></label>
        {#if meetingMode!=="Offline"}<label class="full"><span>Link *</span><input type="url" bind:value={meetingLink} placeholder="https://..." maxlength="300"/></label>{/if}
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h2>People & Agenda</h2></div>
      <div class="grid2">
        <label><span>Organizer *</span><input bind:value={organizer} placeholder="Name" maxlength="60"/></label>
        <label><span>Participants</span><input bind:value={participants} placeholder="a@b.com" maxlength="200"/></label>
        <label class="full"><span>Objective</span><textarea rows="2" bind:value={meetingObjective} maxlength="400" placeholder="Objective..."></textarea></label>
        <label class="full"><span>Agenda *</span><textarea rows="3" bind:value={agenda} maxlength="800" placeholder="Agenda..."></textarea></label>
      </div>
    </div>

    <div class="card preview">
      <div class="prev-h"><b>{title||'Untitled Meeting'}</b><span>{progress}%</span></div>
      <div class="prev-grid">
        <div class="prev-chip">📌 {type||'Type'}</div>
        <div class="prev-chip">🏢 {department}</div>
        <div class="prev-chip">📅 {date||'No date'}</div>
        <div class="prev-chip">⏰ {start_time||'--'} - {end_time||'--'}</div>
        <div class="prev-chip">📍 {location||'No loc'} • {meetingMode}</div>
        <div class="prev-chip">👤 {organizer||'No organizer'}</div>
      </div>
      {#if meetingObjective}<div class="prev-block"><small>Objective</small><p>{meetingObjective.slice(0,200)}</p></div>{/if}
      {#if agenda}<div class="prev-block"><small>Agenda</small><p>{agenda.slice(0,300)}</p></div>{/if}
      <div class="bar"><div style="width:{progress}%"></div></div>
      <div class="actions">
        <button class="btn ghost" onclick={clearForm}>Reset</button>
        <button class="btn save" onclick={saveMeeting} disabled={loading}>{loading?'Saving...':'Save Meeting'}</button>
      </div>
    </div>
  </div>
</div>

<style>
.page{min-height:100vh; background:#f1f5f9; overflow-x:hidden;}
.top{position:sticky; top:0; z-index:20; background:#ffffff; border-bottom:1px solid #e2e8f0; padding:10px 12px; display:flex; align-items:center; gap:10px;}
.back{width:32px; height:32px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; color:#0f172a; flex-shrink:0;}
.thead{flex:1; min-width:0;} .thead h1{margin:0; font-size:14px; font-weight:800; color:#0f172a;} .thead span{font-size:10px; font-family:monospace; color:#64748b; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.pct-badge{flex-shrink:0; background:#0f172a; color:#fff; font-size:10px; font-weight:800; padding:5px 12px; border-radius:20px;}
.wrap{max-width:720px; margin:0 auto; padding:12px; display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;}
.card{background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:12px; width:100%; box-sizing:border-box; overflow:hidden;}
.card-h{display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;}
.card-h h2{margin:0; font-size:11px; font-weight:800; text-transform:uppercase; color:#0f172a;}
.green{background:#dcfce7; color:#166534; font-size:10px; font-weight:800; padding:3px 8px; border-radius:20px; flex-shrink:0;}
.grid2{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; align-items:start; width:100%;}
label{display:flex; flex-direction:column; gap:4px; min-width:0; width:100%;}
label span{font-size:10px; font-weight:700; color:#334155;}
label.full{grid-column:1/-1;}
input,select,textarea{
  padding:9px 10px; border-radius:8px; border:1.5px solid #cbd5e1; background:#ffffff !important; 
  color:#0f172a !important; font-size:13px; width:100%; max-width:100%; min-width:0;
  box-sizing:border-box; height:38px; font-weight:500; display:block;
}
textarea{height:auto; min-height:60px; resize:none; font-family:inherit; line-height:1.4;}
input::placeholder, textarea::placeholder{color:#94a3b8 !important;}
input:focus,select:focus,textarea:focus{outline:none; border-color:#0f172a; box-shadow:0 0 0 3px rgba(15,23,42,.08);}
.preview{background:#ffffff; border:2px solid #0f172a; overflow:hidden;}
.prev-h{display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:8px;}
.prev-h b{font-size:13px; color:#0f172a; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.prev-h span{background:#0f172a; color:#fff; font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px; flex-shrink:0;}
.prev-grid{display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px; margin-bottom:10px; width:100%;}
.prev-chip{font-size:11px; background:#f8fafc; border:1px solid #e2e8f0; padding:6px 8px; border-radius:8px; color:#0f172a; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;}
.prev-block{margin-bottom:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px; overflow:hidden;}
.prev-block small{font-size:9px; font-weight:800; text-transform:uppercase; color:#64748b; display:block; margin-bottom:2px;}
.prev-block p{margin:0; font-size:12px; color:#0f172a; line-height:1.4; word-break:break-word; white-space:pre-wrap;}
.bar{height:6px; background:#e2e8f0; border-radius:10px; overflow:hidden; margin:10px 0;} .bar div{height:100%; background:#0f172a; transition:.3s;}
.actions{display:flex; gap:8px; margin-top:6px; width:100%;}
.btn{flex:1; min-width:0; padding:11px; border-radius:10px; font-weight:800; font-size:12px; border:1px solid #e2e8f0; cursor:pointer;}
.btn.ghost{background:#f8fafc; color:#0f172a;} .btn.save{background:#0f172a; color:#fff; border-color:#0f172a;}
.btn:disabled{opacity:.5;}
@media(max-width:480px){
  .wrap{padding:8px;} .card{padding:10px; border-radius:10px;}
  .grid2{gap:8px; grid-template-columns:minmax(0,1fr) minmax(0,1fr);}
  input,select{height:36px; font-size:12px; padding:7px 8px;}
}
</style>