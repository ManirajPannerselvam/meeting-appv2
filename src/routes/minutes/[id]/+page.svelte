<script lang="ts">
import { page } from '$app/stores';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { supabaseChat } from '$lib/supabase/client';

let meeting:any=null; let loading=true; let saving=false;
let minutesText=""; let attendance:any[]=[]; let actions:any[]=[];
const id = Number($page.params.id);
const CACHE_KEY = `mom_${id}`;
let showAnalysis:any=null; let templateType='5 Why';
let editAtt=false;

const TEMPLATES:any={
  '5 Why': { fields:['Why 1','Why 2','Why 3','Why 4','Why 5 - Root Cause'] },
  '7Q / 5W1H': { fields:['What','Where','When','Who','Why','How','How Many'] },
  'Fishbone 6M': { fields:['Man','Machine','Material','Method','Measurement','Mother Nature'] },
  '8D': { fields:['D1 Team','D2 Problem','D3 Containment','D4 Root Cause','D5 Corrective','D6 Verify','D7 Prevent','D8 Close'] },
  '4M + Why': { fields:['What happened','Why happened','How to detect','What system failed'] }
};

onMount(async()=>{
  try{
    try{
      const c=sessionStorage.getItem(CACHE_KEY);
      if(c){
        const {t,d}=JSON.parse(c);
        if(Date.now()-t<300000){
          meeting=d.meeting; minutesText=d.minutesText;
          attendance=d.attendance; actions=d.actions;
          loading=false;
        }
      }
    }catch{}

    const [mRes, attRes, actRes] = await Promise.all([
      supabaseChat.from('meetings').select('*').eq('id', id).single(),
      supabaseChat.from('meeting_attendance').select('*').eq('meeting_id', id),
      supabaseChat.from('meeting_actions').select('*').eq('meeting_id', id).order('created_at').limit(100)
    ]);

    if(mRes.data){ meeting=mRes.data; minutesText=mRes.data.minutes_text||minutesText||""; }
    attendance=attRes.data||attendance||[];

    actions=(actRes.data||[]).map((a:any)=>{
      let ad:any={};
      try{
        if(a.analysis_data){
          ad = typeof a.analysis_data==='string'? JSON.parse(a.analysis_data) : a.analysis_data;
        }
      }catch{ ad={}; }
      // support both old and new column names
      const analysisObj = ad.fields || ad || {};
      return {
       ...a,
        _analysis: analysisObj,
        root_cause: a.root_cause||ad.rc||'',
        corrective_action: a.corrective_action||ad.ca||'',
        _template: ad.template || a.template_type || '5 Why'
      };
    });

    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({t:Date.now(), d:{meeting, minutesText, attendance, actions}})); }catch{}
  }catch(e){ console.error('MOM load', e); }
  finally{ loading=false; }
});

function sColor(s:string){
  s=(s||'').toLowerCase();
  if(s.includes('comp')) return 'c-comp';
  if(s.includes('prog')||s.includes('ong')) return 'c-ongo';
  return 'c-pend';
}

async function togglePresent(a:any){
  const old=a.present; a.present=!old; attendance=[...attendance];
  const { error } = await supabaseChat.from('meeting_attendance').update({present:a.present}).eq('id', a.id);
  if(error){ a.present=old; attendance=[...attendance]; }
}

function addAction(){
  if(actions.length>=50) return;
  actions=[...actions,{action:'',owner:'Maniraj',due_date:new Date().toISOString().slice(0,10),status:'Pending',priority:'Medium', _analysis:{}, _template:'5 Why'}];
}

function openAnalysis(ac:any){
  ac._analysis = ac._analysis || {};
  templateType = ac._template || ac._analysis.template || '5 Why';
  ac._analysis.template = templateType;
  showAnalysis = ac;
}

async function saveAnalysis(){
  if(!showAnalysis.root_cause?.trim() ||!showAnalysis.corrective_action?.trim()){
    alert('RC + Corrective mandatory for Completed'); return;
  }
  showAnalysis.status='Completed';
  showAnalysis._template = templateType;
  const analysisData = { template:templateType, fields:showAnalysis._analysis,...showAnalysis._analysis };

  if(showAnalysis.id){
    await supabaseChat.from('meeting_actions').update({
      status:'Completed',
      root_cause:showAnalysis.root_cause.slice(0,500),
      corrective_action:showAnalysis.corrective_action.slice(0,1000),
      analysis_data:analysisData
    }).eq('id', showAnalysis.id);
  }
  showAnalysis=null;
  await saveAll(false);
}

async function updateStatus(ac:any, v:string){
  const isComp = v.toLowerCase().includes('comp');
  if(isComp &&!ac.root_cause){
    openAnalysis(ac); return;
  }
  ac.status=v;
  if(ac.id) await supabaseChat.from('meeting_actions').update({status:v}).eq('id', ac.id);
}

async function saveAll(show=true){
  if(saving) return; saving=true;
  try{
    await supabaseChat.from('meetings').update({minutes_text:minutesText.slice(0,10000)}).eq('id', id);
    for(const ac of actions){
      if(!ac.action?.trim()) continue;
      if(ac.id){
        await supabaseChat.from('meeting_actions').update({
          action:ac.action.trim().slice(0,500),
          owner:ac.owner||'Maniraj',
          due_date:ac.due_date||null,
          status:ac.status,
          root_cause:ac.root_cause||null,
          corrective_action:ac.corrective_action||null
        }).eq('id', ac.id);
      }else{
        const {data}=await supabaseChat.from('meeting_actions').insert({
          meeting_id:id,
          action:ac.action.trim().slice(0,500),
          owner:ac.owner||'Maniraj',
          due_date:ac.due_date||null,
          status:ac.status||'Pending',
          priority:'Medium'
        }).select('id').single();
        if(data) ac.id=data.id;
      }
    }
    try{ sessionStorage.setItem(CACHE_KEY, JSON.stringify({t:Date.now(), d:{meeting, minutesText, attendance, actions}})); }catch{}
    if(show) alert('✅ Saved');
  }catch(e:any){ alert('Save failed: '+e.message); }
  finally{ saving=false; }
}
</script>

<div class="wrap">
  <div class="header">
    <button class="back" on:click={()=>goto('/meeting-list')}>←</button>
    <div class="htitle"><b>{meeting?.title||'Meeting'}</b><span>MOM #{id} • {meeting?.meeting_date||''}</span></div>
    <button class="save" on:click={()=>saveAll()} disabled={saving}>{saving?'...':'💾 Save'}</button>
  </div>

  {#if loading}
    <div class="skel"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
  {:else}
  <div class="kpi3">
    <div class="k"><span>ACTIONS</span><b>{actions.length}</b></div>
    <div class="k"><span>PRESENT</span><b>{attendance.filter(a=>a.present).length}/{attendance.length||0}</b></div>
    <div class="k active"><span>STATUS</span><b>{meeting?.type||'Production'}</b></div>
  </div>

  <div class="card info">
    <div class="info-top"><span class="id">#{id}</span><span class="badge">{meeting?.type||'Production'}</span><span class="date">{meeting?.meeting_date} {meeting?.start_time?.slice(0,5)}-{meeting?.end_time?.slice(0,5)}</span></div>
    <div class="mtitle">{meeting?.title}</div>
    <div class="meta">📍 {meeting?.location||'Shopfloor'} • 👤 {meeting?.organizer||'Maniraj'}</div>
    <div class="agenda">{meeting?.agenda||''}</div>
  </div>

  <div class="card">
    <div class="ch"><h3>👥 Attendance ({attendance.length})</h3><span class="count">{attendance.filter(a=>a.present).length} present</span><button class="edit" on:click={()=>editAtt=!editAtt}>{editAtt?'Done':'✏️ Edit'}</button></div>
    {#each attendance as a}
      <div class="att"><div class="av">{a.name?.[0]||'M'}</div><div class="aname"><b>{a.name}</b><small>{a.department} • {a.role}</small></div><button class="pbtn" class:on={a.present} on:click={()=>togglePresent(a)}>{a.present?'✓ Present':'○ Absent'}</button></div>
    {/each}
    {#if editAtt}
      <button class="addAtt" on:click={async()=>{ const n=prompt('Name?'); const d=prompt('Dept?')||'Production'; if(n){ const {data}=await supabaseChat.from('meeting_attendance').insert({meeting_id:id,name:n,department:d,present:true,role:'Member'}).select().single(); if(data) attendance=[...attendance,data]; } }}>+ Add Person</button>
    {/if}
  </div>

  <div class="card"><h3>📋 Minutes</h3><textarea bind:value={minutesText} placeholder="Write minutes..."></textarea></div>

  <div class="card">
    <div class="ch"><h3>✅ Action Tracker</h3><button class="add" on:click={addAction}>+ Add</button></div>

    <div class="table desk">
      <div class="thead"><span>#</span><span>Action</span><span>Owner</span><span>Due</span><span>Status</span></div>
      {#each actions as ac,i}
        <div class="trow">
          <span class="num">{i+1}</span>
          <input class="in" bind:value={ac.action} placeholder="Action"/>
          <input class="in sm" bind:value={ac.owner}/>
          <input class="in sm" type="date" bind:value={ac.due_date}/>
          <select class="in sm {sColor(ac.status)}" value={ac.status} on:change={(e)=>updateStatus(ac,e.currentTarget.value)}>
            <option>Pending</option><option>Ongoing</option><option>In Progress</option><option>Completed</option>
          </select>
        </div>
        {#if ac.status && ac.status.toLowerCase().includes('comp')}
          {#if !ac.root_cause}
            <div class="warn">⚠️ Completed → RC required <button class="link" on:click={()=>openAnalysis(ac)}>Add 7Q / 5Why Analysis</button></div>
          {:else}
            <div class="rcShow">✔ RC: {ac.root_cause} | CA: {ac.corrective_action} <button class="link" on:click={()=>openAnalysis(ac)}>View</button></div>
          {/if}
        {/if}
      {/each}
    </div>

    <div class="mlist mob">
      {#each actions as ac,i}
        <div class="mcard">
          <div class="mh"><span>#{i+1}</span><select bind:value={ac.status} class="st {sColor(ac.status)}" on:change={(e)=>updateStatus(ac,e.currentTarget.value)}><option>Pending</option><option>Ongoing</option><option>Completed</option></select></div>
          <input bind:value={ac.action} placeholder="Check F1 Line yield drop - RC" class="full"/>
          <div class="mfoot"><input bind:value={ac.owner} placeholder="Owner"/><input type="date" bind:value={ac.due_date}/></div>
          {#if ac.status==='Pending'}
            <div class="pend">Pending • work in progress</div>
          {:else if ac.status==='Completed' &&!ac.root_cause}
            <button class="analysisBtn" on:click={()=>openAnalysis(ac)}>🔍 Add RC Analysis - 7Q, 5 Why, Fishbone</button>
          {:else if ac.root_cause}
            <div class="rcShow">✔ {ac.root_cause}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  {/if}

  {#if showAnalysis}
    <div class="modalBg" on:click={()=>showAnalysis=null}>
      <div class="modal" on:click|stopPropagation>
        <div class="mHead"><h3>RC Analysis - #{showAnalysis.id||'New'}</h3><span class="mClose" on:click={()=>showAnalysis=null}>✕</span></div>
        <div class="tempTabs">{#each Object.keys(TEMPLATES) as t}<button class="tt" class:on={templateType===t} on:click={()=>{templateType=t; showAnalysis._analysis.template=t; showAnalysis._template=t;}}>{t}</button>{/each}</div>
        <label>Template: {templateType} - Fill all</label>
        {#each TEMPLATES[templateType].fields as f}
          <label>{f}</label><textarea bind:value={showAnalysis._analysis[f]} placeholder={f} rows="2"></textarea>
        {/each}
        <label>Root Cause *</label><input bind:value={showAnalysis.root_cause} placeholder="Ex: Alignment drift" />
        <label>Corrective + Preventive Action *</label><textarea bind:value={showAnalysis.corrective_action} placeholder="Corrective: Re-align / Preventive: Daily checklist" rows="3"></textarea>
        <div class="mBtns"><button on:click={()=>showAnalysis=null}>Cancel</button><button class="saveBtn" on:click={saveAnalysis}>Save & Mark Completed</button></div>
      </div>
    </div>
  {/if}
</div>

<style>
.wrap{max-width:900px;margin:0 auto;padding:8px;background:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;gap:8px;font-family:Inter,system-ui,sans-serif;}
.header{display:flex;align-items:center;gap:8px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;position:sticky;top:8px;z-index:10;box-shadow:0 1px 2px rgba(0,0,0,.05);}
.back{width:34px;height:34px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#0f172a;font-weight:800;cursor:pointer;}
.htitle{flex:1;min-width:0;display:flex;flex-direction:column;}.htitle b{font-size:14px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em;}.htitle span{font-size:10px;color:#475569;font-weight:700;}
.save{background:#0f172a;color:#fff;border:none;padding:7px 14px;border-radius:8px;font-weight:800;font-size:11px;cursor:pointer;}
.kpi3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;}.k{background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:8px;text-align:center;box-shadow:0 1px 1px rgba(0,0,0,.03);}
.k span{font-size:9px;color:#475569;font-weight:800;display:block;text-transform:uppercase;letter-spacing:.06em;}
.k b{font-size:16px;font-weight:900;color:#0f172a;display:block;margin-top:2px;}
.k.active{background:#eff6ff;border-color:#bfdbfe;}.k.active b{color:#1d4ed8;}
.card{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.04);}
.info-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.id{font-family:monospace;font-size:11px;font-weight:800;color:#334155;}
.badge{background:#e2e8f0;border:1px solid #cbd5e1;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;color:#0f172a;}
.date{margin-left:auto;font-size:11px;color:#334155;font-weight:700;}
.mtitle{font-size:16px;font-weight:900;color:#0f172a;margin:6px 0 2px;letter-spacing:-.02em;line-height:1.2;}
.meta{font-size:11px;color:#1e293b;font-weight:700;}
.agenda{margin-top:6px;background:#f8fafc;border:1px solid #e2e8f0;padding:7px 9px;border-radius:8px;font-size:12px;color:#334155;font-weight:500;line-height:1.4;}
.ch{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
h3{margin:0;font-size:13px;font-weight:900;color:#0f172a;letter-spacing:-.01em;}
.count{font-size:11px;color:#15803d;font-weight:800;background:#dcfce7;padding:2px 6px;border-radius:10px;}
.att{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9;}
.av{width:32px;height:32px;border-radius:50%;background:#0f172a;color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800;flex-shrink:0;}
.aname{flex:1;min-width:0;}.aname b{font-size:13.5px;display:block;color:#0f172a;font-weight:700;line-height:1.2;}.aname small{font-size:11px;color:#475569;font-weight:600;display:block;margin-top:1px;}
.pbtn{padding:6px 12px;border-radius:20px;border:1px solid #e2e8f0;background:#fff;font-size:11px;font-weight:800;cursor:pointer;color:#334155;}
.pbtn.on{background:#dcfce7;border-color:#86efac;color:#14532d;}
.edit{padding:5px 10px;border-radius:20px;border:1px solid #0f172a;background:#0f172a;color:#fff;font-size:10px;font-weight:800;cursor:pointer;}
.addAtt{width:100%;margin-top:8px;padding:8px;border:1px dashed #94a3b8;border-radius:8px;background:#f8fafc;font-weight:800;font-size:11px;cursor:pointer;color:#334155;}
textarea{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;background:#ffffff;color:#0f172a;border-radius:10px;padding:10px;font-size:13px;min-height:110px;font-weight:500;outline:none;}
textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12);}
textarea::placeholder{color:#94a3b8;}
.table{display:flex;flex-direction:column;gap:4px;}.thead,.trow{display:grid;grid-template-columns:28px 1fr 90px 120px 110px;gap:6px;align-items:center;}
.thead{font-size:10px;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 0;}
.num{text-align:center;font-family:monospace;font-size:11px;font-weight:800;color:#334155;}
.in{padding:7px 8px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;background:#fff;color:#0f172a;font-weight:500;}.in.sm{font-size:11px;font-weight:600;}
.c-pend{background:#7c3aed!important;color:#fff!important;border-color:#7c3aed!important;font-weight:900;}
.c-ongo{background:#d97706!important;color:#fff!important;border-color:#d97706!important;font-weight:900;}
.c-comp{background:#16a34a!important;color:#fff!important;border-color:#16a34a!important;font-weight:900;}
.warn{font-size:10px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:6px 8px;border-radius:8px;margin:4px 0 6px;font-weight:700;display:flex;justify-content:space-between;align-items:center;}
.rcShow{font-size:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#14532d;padding:6px 8px;border-radius:8px;margin:4px 0 6px;font-weight:700;display:flex;justify-content:space-between;}
.link{background:#0f172a;color:#fff;border:none;padding:4px 10px;border-radius:12px;font-size:9px;font-weight:800;cursor:pointer;}
.add{padding:6px 12px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;}
.mob{display:none;}
@media(max-width:700px){
 .desk{display:none;}.mob{display:flex;flex-direction:column;gap:8px;}
 .mcard{border:1px solid #e2e8f0;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.03);}
 .mh{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:800;color:#0f172a;}
 .st{padding:5px 12px;border-radius:20px;border:none;font-size:10px;font-weight:900;color:#fff;letter-spacing:.02em;}
 .full{padding:9px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;font-weight:600;background:#fff;}
 .mfoot{display:grid;grid-template-columns:1fr 1fr;gap:6px;}.mfoot input{padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#0f172a;font-weight:500;}
 .pend{font-size:10px;color:#475569;font-weight:700;}.analysisBtn{width:100%;padding:9px;background:#fffbeb;border:1px dashed #f59e0b;border-radius:10px;font-size:11px;font-weight:800;color:#92400e;cursor:pointer;}
}
.modalBg{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:99;padding:10px;}
.modal{background:#ffffff!important;color:#0f172a!important;border-radius:16px;padding:14px;width:100%;max-width:440px;max-height:92vh;overflow:auto;display:flex;flex-direction:column;gap:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);}
.mHead{display:flex;justify-content:space-between;align-items:center;}.mHead h3{font-size:14px;font-weight:900;color:#0f172a;}.mClose{cursor:pointer;font-weight:800;padding:5px 10px;background:#f1f5f9;border-radius:20px;color:#334155;}
.tempTabs{display:flex;gap:5px;flex-wrap:wrap;}.tt{padding:6px 10px;border-radius:20px;border:1px solid #e2e8f0;background:#f8fafc;font-size:10px;font-weight:800;cursor:pointer;color:#334155;}.tt.on{background:#0f172a;color:#fff;border-color:#0f172a;}
.modal label{color:#0f172a!important;font-size:11px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.04em!important;opacity:1!important;}
.modal input,.modal textarea,.modal select{background:#ffffff!important;color:#0f172a!important;border:1.5px solid #cbd5e1!important;font-size:12px!important;font-weight:600!important;}
.modal textarea::placeholder,.modal input::placeholder{color:#64748b!important;opacity:1!important;}
.mBtns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;}.mBtns button{padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-weight:800;font-size:11px;cursor:pointer;color:#334155;}.saveBtn{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important;}
.skel{display:flex;flex-direction:column;gap:8px;}.sk{height:70px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:sh 1.2s infinite;border-radius:12px;}@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
</style>