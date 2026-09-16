<script lang="ts">
import { onMount } from 'svelte';
import { goto } from '$app/navigation';
import { supabaseTemplates, getTemplateClient, getMeetingsQueryBuilder } from '$lib/supabase/client';

let topNav:'reports'|'meetings' = 'meetings'; // meetings page = meetings active

let rows:any[]=[]; let loading=true; let search=""; let sd=""; let tab:'Active'|'History'='Active';
let currentUserId=''; let currentUserEmail=''; let cacheKey=''; let apiError='';
let t:any; $: { clearTimeout(t); t=setTimeout(()=>sd=search.toLowerCase().trim().slice(0,50),150); }

function sanitizeStr(s:any, max=80){ if(typeof s!=='string') return ''; return s.replace(/[<>`$&"'=]/g,'').trim().slice(0,max); }
function getClient() { try{ const c = getTemplateClient(); return c || supabaseTemplates; }catch{ return supabaseTemplates; } }
function isMineMeeting(m:any){
  const myEmail = currentUserEmail.toLowerCase().trim(); const myId = currentUserId.toLowerCase().trim();
  if(!myEmail && !myId) return false;
  const org = String(m.organizer||'').toLowerCase().trim(); const created = String(m.created_by||'').toLowerCase().trim();
  if(org && myEmail && org===myEmail) return true; if(created && myEmail && created===myEmail) return true;
  if(org && myId && org===myId) return true; if(created && myId && created===myId) return true;
  if(Array.isArray(m.participants)){ for(let p of m.participants.slice(0,100)){ const sp = String(p||'').toLowerCase().trim(); if(sp===myEmail || sp===myId) return true; } }
  if(m.attendees){ try{ const txt = JSON.stringify(m.attendees).toLowerCase(); if(myEmail && txt.includes(myEmail)) return true; }catch{} }
  return false;
}
function getSettingUser(){
  try{
    const email = localStorage.getItem('ems_user_email') || localStorage.getItem('ems_email') || '';
    const id = localStorage.getItem('ems_user_id') || localStorage.getItem('user_id') || email || '';
    if(email || id) return { id: (id||email).toLowerCase().trim(), email: (email||id).toLowerCase().trim() };
  }catch{} return { id:'', email:'' };
}

onMount(async()=>{
  try{
    const u = getSettingUser(); currentUserId = u.id; currentUserEmail = u.email;
    cacheKey = `mdash_${(currentUserEmail||currentUserId).slice(0,30)}_v11`;
    try{ const c=localStorage.getItem(cacheKey); if(c){ const parsed=JSON.parse(c); if(parsed.uid && (parsed.uid===currentUserId || parsed.uid===currentUserEmail) && Date.now()-parsed.ts<60000 && Array.isArray(parsed.d)){ rows=parsed.d; loading=false; } } }catch{}
    if(!currentUserEmail && !currentUserId){ rows=[]; loading=false; return; }
    const client = getClient(); if(!client){ apiError='Supabase client null'; loading=false; return; }
    let meetingsData:any[]=[];
    try{
      let q:any = null; try{ q = getMeetingsQueryBuilder(); }catch{}
      if(!q){ q = client.from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by,participants,attendees'); }
      q = q.order('meeting_date',{ascending:false}).limit(200);
      if(currentUserEmail){ q = q.or(`organizer.eq.${currentUserEmail},created_by.eq.${currentUserEmail}`); }
      const r = await q; if(!r.error && r.data) meetingsData = r.data; else { apiError = r.error?.message||''; const r2 = await client.from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by').order('meeting_date',{ascending:false}).limit(200); if(r2.data) meetingsData = r2.data; }
    }catch(e:any){ apiError = e.message; }
    if(meetingsData.length===0){ try{ const r3 = await client.from('meetings').select('id,title,meeting_date,organizer,start_time,end_time,priority,created_by,participants').order('meeting_date',{ascending:false}).limit(200); if(r3.data?.length) meetingsData = r3.data; }catch{} }
    const actionMap = new Map();
    try{ if(meetingsData.length){ const ids = meetingsData.map((m:any)=>m.id).slice(0,200); const act = await client.from('meeting_actions').select('meeting_id,status').in('meeting_id', ids).limit(2000); (act.data||[]).forEach((x:any)=>{ let o=actionMap.get(x.meeting_id)||{total_action:0,pending:0,ongoing:0,completed:0}; o.total_action++; const s=String(x.status||'').toLowerCase().slice(0,20); if(s==='pending') o.pending++; else if(s.includes('ong')||s.includes('prog')) o.ongoing++; else if(s==='completed') o.completed++; actionMap.set(x.meeting_id,o); }); } }catch{}
    let mapped = meetingsData.map((r:any)=>{ const am = actionMap.get(r.id)||{total_action:0,pending:0,ongoing:0,completed:0}; return { id: r.id, title: sanitizeStr(r.title,100), meeting_date: r.meeting_date, organizer: sanitizeStr(r.organizer||r.created_by,60), start_time: String(r.start_time||'').slice(0,10), end_time: String(r.end_time||'').slice(0,10), priority: sanitizeStr(r.priority,20), total_action: Math.min(10000, Number(am.total_action)||0), pending: Math.min(10000, Number(am.pending)||0), ongoing: Math.min(10000, Number(am.ongoing)||0), completed: Math.min(10000, Number(am.completed)||0), created_by: r.created_by, participants: r.participants, attendees: r.attendees, is_history: am.total_action>0 && am.total_action===am.completed }; });
    const filteredMine = mapped.filter(isMineMeeting); rows = filteredMine.length>0 ? filteredMine : mapped.slice(0,50);
    try{ localStorage.setItem(cacheKey, JSON.stringify({ts:Date.now(),d:rows,uid:currentUserEmail||currentUserId})); }catch{}
  }catch(e:any){ console.error(e); apiError = e.message; } finally{ loading=false; }
});

$: byTab = rows.filter(r=> tab==='Active' ? !r.is_history : r.is_history);
$: filtered = byTab.filter(r=> !sd || r.title?.toLowerCase().includes(sd) || r.organizer?.toLowerCase().includes(sd));
$: totals={t:filtered.reduce((s,m)=>s+(m.total_action||0),0), p:filtered.reduce((s,m)=>s+(m.pending||0),0), o:filtered.reduce((s,m)=>s+(m.ongoing||0),0), c:filtered.reduce((s,m)=>s+(m.completed||0),0)};
$: histCount = rows.filter(r=>r.is_history).length; $: activeCount = rows.filter(r=>!r.is_history).length;

function fmt(d:any){ if(!d) return '-'; try{ const dt=new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;}catch{return '-';} }
function fmtTime12(t:any){ if(!t) return ''; let [h,m]=String(t).split(':').map(Number); if(isNaN(h)) return String(t).slice(0,5); const ap=h>=12?'PM':'AM'; h=h%12||12; return `${h}:${String(m).padStart(2,'0')} ${ap}`; }
function meetingState(r:any){ if(r.is_history) return 'completed'; if(!r.meeting_date) return 'upcoming'; const today=new Date(); today.setHours(0,0,0,0); const md=new Date(r.meeting_date); md.setHours(0,0,0,0); if(md.getTime()<today.getTime()) return 'completed'; if(md.getTime()===today.getTime()) return 'ongoing'; return 'upcoming'; }
function go(id:number){ if(id) goto(`/minutes/${id}`); }
function goTop(t:'reports'|'meetings'){ topNav=t; if(t==='reports') goto('/reports'); else goto('/minutes-dashboard'); }
function goBottom(t:string){ const m:any={ chat:'/chat', reports:'/reports', user:'/settings' }; goto(m[t]); }
</script>

<div class="app">
  <!-- TOP 2 BUTTONS -->
 
  <div class="scrollMain">
    <div class="topCard">
     <div class="left">
  <h1 class="dashTitle">Meeting Dashboard 🔒 <span class="emailTag">{currentUserEmail? `(${sanitizeStr(currentUserEmail,25)})`:''}</span></h1>
  {#if apiError}<div style="color:#dc2626;font-size:10px;margin-top:4px;">{sanitizeStr(apiError,120)}</div>{/if}
</div>
      <div class="right">
        <div class="stat"><span>Total</span><b>{totals.t}</b></div>
        <div class="stat p"><span>Pending</span><b>{totals.p}</b></div>
        <div class="stat o"><span>Ongoing</span><b>{totals.o}</b></div>
        <div class="stat c"><span>Completed</span><b>{totals.c}</b></div>
      </div>
    </div>

    <div class="toolbar">
      <input bind:value={search} placeholder="🔍 Search my meetings..." maxlength="50" />
      <div class="histTabs">
        <button class="hBtn" class:active={tab==='Active'} on:click={()=>tab='Active'}>Active ({activeCount})</button>
        <button class="hBtn" class:active={tab==='History'} on:click={()=>tab='History'}>📦 History ({histCount})</button>
      </div>
      <button class="ref" on:click={()=>{ if(cacheKey) try{localStorage.removeItem(cacheKey);}catch{}; location.reload();}}>↻</button>
    </div>
    <div class="countLine">{filtered.length} {tab} meetings • 🔒 Mine only</div>

    {#if loading}
      <div class="card"><div class="sk"></div><div class="sk"></div></div>
    {:else}
    <div class="tableCard">
      <div class="tableScroll">
        <table>
          <thead><tr><th class="sn">S.No</th><th class="nameH">Meeting Name</th><th>Date • Start-End</th><th>organizer</th><th>Priority</th><th>Total</th><th>Pending</th><th>Ongoing</th><th>Completed</th></tr></thead>
          <tbody>
            {#each filtered as r,i (r.id)}
              <tr class:hist={r.is_history}>
                <td class="sn">{i+1}</td>
                <td class="name" on:click={()=>go(r.id)}><div class="clamp2 box {meetingState(r)}">{r.title || '-'}</div></td>
                <td class="dtCell"><div class="dateMainBox"><div class="dateLine1">{fmt(r.meeting_date)}</div><div class="dateLine2">{fmtTime12(r.start_time)} - {fmtTime12(r.end_time)}</div></div></td>
                <td class="org"><span>{r.organizer||'-'}</span></td>
                <td class="prio"><span class="prioBox {String(r.priority||'').toLowerCase()}">{r.priority||'-'}</span></td>
                <td><button class="pill total" on:click={()=>go(r.id)}>{r.total_action||0}</button></td>
                <td><button class="pill pend" class:zero={!r.pending} on:click={()=>go(r.id)}>{r.pending||0}</button></td>
                <td><button class="pill ongo" class:zero={!r.ongoing} on:click={()=>go(r.id)}>{r.ongoing||0}</button></td>
                <td><button class="pill comp" class:zero={!r.completed} on:click={()=>go(r.id)}>{r.completed||0}</button></td>
              </tr>
            {/each}
            {#if filtered.length===0}<tr><td colspan="9" class="empty">🔒 No meetings • {currentUserEmail||'login required'}</td></tr>{/if}
          </tbody>
        </table>
      </div>
    </div>
    {/if}
  </div>
<div class="topSegment">
    <button class="segBtn" class:active={topNav==='reports'} on:click={()=>goTop('reports')}>Reports</button>
    <button class="segBtn" class:active={topNav==='meetings'} on:click={()=>goTop('meetings')}>Meetings</button>
  </div>
  <!-- BOTTOM NAV -->
  <nav class="bottom-fixed">
    <button on:click={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button>
    <button class="active" on:click={()=>goBottom('reports')}><span class="b-icon">📋</span><small>Reports</small></button>
    <button on:click={()=>goBottom('user')}><span class="b-icon">👤</span><small>User</small></button>
  </nav>
</div>

<style>
.app{display:flex;flex-direction:column;height:100dvh;width:100vw;background:#f8fafc;overflow:hidden;}
.topSegment{flex:0 0 auto;display:flex;gap:12px;padding:10px 16px;background:#ffffff;border-bottom:1px solid #e5e7eb;justify-content:center;z-index:20;}
.segBtn{flex:1;max-width:50%;height:44px;border-radius:24px;border:1.5px solid #e2e8f0;background:#fff;color:#334155;font-size:14px;font-weight:700;cursor:pointer;transition:.2s;}
.segBtn.active{background:#2563eb;color:#fff;border-color:#2563eb;box-shadow:0 2px 8px rgba(37,99,235,.3);}
.scrollMain{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;padding:12px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch;}
.topCard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 16px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.05);}
.left{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:8px 14px;display:flex;align-items:center;}
.left h1{margin:0;font-size:16px;font-weight:800;color:#1e40af;letter-spacing:.2px;}
.left h1 span{color:#2563eb;font-size:12px;font-weight:600;}
.right{display:flex;gap:6px;flex-wrap:wrap;} .stat{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:5px 10px;min-width:58px;text-align:center;} .stat span{font-size:8px;font-weight:800;text-transform:uppercase;color:#64748b;display:block;} .stat b{font-size:14px;font-weight:900;display:block;}
.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;}
.toolbar input{flex:1;min-width:180px;padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;font-size:12px;outline:none;}
.histTabs{display:flex;gap:6px;} .hBtn{padding:7px 14px;border-radius:22px;border:1px solid #e2e8f0;background:#f8fafc;font-size:11px;font-weight:800;cursor:pointer;} .hBtn.active{background:#0f172a;color:#fff;border-color:#0f172a;}
.ref{padding:7px 12px;border-radius:10px;border:1px solid #e2e8f0;background:#0f172a;color:#fff;font-weight:800;font-size:11px;cursor:pointer;}
.countLine{font-size:11px;font-weight:600;color:#64748b;padding:2px 6px;}
.tableCard{background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.06);}
.tableScroll{overflow:auto;}
table{width:100%;border-collapse:collapse;table-layout:fixed;border:1px solid #e2e8f0;min-width:900px;}
thead{position:sticky;top:0;z-index:10;} th{background:#1e293b;color:#fff;font-size:11px;font-weight:800;padding:14px 10px;text-align:center;white-space:nowrap;text-transform:uppercase;border-right:1px solid #334155;}
th.sn{width:60px;} th.nameH{min-width:240px;text-align:left;padding-left:16px;}
td{padding:14px 10px;font-size:11.5px;text-align:center;vertical-align:middle;background:#fff;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;}
td.sn{font-weight:800;color:#475569!important;background:#f8fafc!important;width:60px;} td.name{text-align:left!important;padding:12px 12px;min-width:240px;}
.clamp2{font-size:11.5px;font-weight:700;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;}
.box{padding:10px 12px;border-radius:10px;font-weight:700;width:100%;min-height:48px;display:flex;align-items:center;font-size:11.5px;box-sizing:border-box;}
.box.upcoming{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;} .box.ongoing{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;} .box.completed{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;}
td.dtCell{padding:12px 12px;min-width:210px;} .dateMainBox{width:100%;min-height:52px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;}
.dateLine1{background:#0f172a;color:#fff;border-radius:20px;font-size:11.5px;font-weight:800;padding:4px 14px;min-width:62px;height:24px;display:flex;align-items:center;justify-content:center;} .dateLine2{font-size:9px;font-weight:700;color:#334155;}
td.org{padding:12px 14px;min-width:150px;} td.org span{background:#334155;color:#fff;padding:7px 16px;border-radius:20px;font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;min-height:32px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
td.prio{padding:12px 10px;min-width:120px;} td.prio .prioBox{padding:7px 18px;border-radius:20px;font-size:11px;font-weight:800;text-transform:uppercase;display:inline-flex;justify-content:center;align-items:center;min-width:80px;min-height:32px;}
.prioBox.medium{background:#fef3c7;color:#92400e;border:1px solid #fde68a;} .prioBox.low{background:#dcfce7;color:#166534;border:1px solid #bbf7d0;} .prioBox.high{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;} .prioBox.urgent,.prioBox.critical{background:#0f172a;color:#fff;border:1px solid #0f172a;}
.pill{min-width:34px;height:30px;border-radius:8px;border:1px solid #e2e8f0;font-weight:800;font-size:11.5px;cursor:pointer;padding:0 8px;background:#f8fafc;}
.pill.total{background:#eff6ff;color:#1e40af;border-color:#bfdbfe;} .pill.pend{background:#fee2e2;color:#dc2626;} .pill.ongo,.pill.comp{background:#f8fafc;color:#64748b;}
.empty{padding:20px;color:#94a3b8;font-weight:600;font-size:12px;text-align:center;} .sk{height:48px;margin:8px;background:linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);background-size:200% 100%;animation:sh 1s infinite;border-radius:10px;}@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
.bottom-fixed{flex:0 0 auto;height:70px;background:#202c33;border-top:1px solid #2a3942;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;justify-items:center;z-index:30;}
.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#94a3b8;width:100%;height:100%;cursor:pointer;}
.bottom-fixed button.active{color:#00a884;} .bottom-fixed button.active small{color:#00a884;} .b-icon{font-size:22px;} .bottom-fixed small{font-size:11px;font-weight:600;}
</style>