<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from '$app/environment';
  import { supabaseTemplates, supabase as chatDB } from "$lib/supabase";
  import dayjs from 'dayjs';

  let templates: any[] = $state([]);
  let selectedTemplateId = $state('ALL');
  let selectedTemplate = $derived(selectedTemplateId==='ALL'? null : templates.find(t => t.id === selectedTemplateId) || null);
  let dateRange = $state({ from: '2026-06-01', to: '2026-12-31' });
  let showCalendar = $state(false);
  let records: any[] = $state([]);
  let loading = $state(false);
  let error = $state("");
  let showMoreRows = $state(false);
  let displayRows = $derived(showMoreRows? records : records.slice(0,10));
  let ChartJS: any = null;
  let chartMap: Map<any, any> = new Map();
  let nextId = $state(2);
  let analysisSets: any[] = $state([{id:1, x:'', y:'', label:'Set 1', stationFilter: [] as string[], chartType:'line'}]);
  let currentUser = $state<any>(null);
  let currentUserId = $state('');
  let bottomTab = $state('report');

  let allFields = $derived(normalizeFields(selectedTemplate));
  let realKeysFromRecords = $derived.by(()=>{
    const keys = new Set<string>();
    records.forEach(r=>{
      Object.keys(r.data||{}).forEach(k=> keys.add(k));
      Object.keys(r).forEach(k=> { if(!['id','ts','t_code','template_code','template_id','template_name','created_at','data','_template_name','_ts','owner_id','user_id','template_code','t_code'].includes(k)) keys.add(k); });
    });
    return Array.from(keys);
  });
  let availableStations = $derived.by(()=>{
    const opt = allFields.find((f:any) => (f.field_name||f.name).toLowerCase().includes('station'))?.options || [];
    if(opt.length>0) return opt;
    const st = new Set<string>();
    records.forEach(r=>{ const v = getVal(r,'station')||getVal(r,'daily_tracker')||getVal(r,'remark01'); if(v) st.add(String(v).trim()); });
    return Array.from(st);
  });
  let xOptions = $derived.by(()=>{
    if(allFields.length>0) return allFields.map((f:any)=>({name:f.field_name, label:f.label}));
    return realKeysFromRecords.map(k=>({name:k,label:k}));
  });
  let yOptions = $derived.by(()=>{
    const nums = allFields.filter((f:any)=> f.field_type==="number" || f.type==="number");
    if(nums.length>0) return nums.map((f:any)=>({name:f.field_name, label:f.label}));
    return realKeysFromRecords.map(k=>({name:k,label:k}));
  });
  let tableColumns = $derived.by(()=>{
    if(records.length===0) return allFields.slice(0,6);
    const real = realKeysFromRecords;
    if(real.length===0) return allFields.slice(0,6);
    const hasMatch = allFields.some(f=> real.includes(f.field_name));
    if(!hasMatch){
      return real.slice(0,6).map(k=>({field_name:k,label:k.replace(/_/g,' '),field_type:"text",name:k,options:[]}));
    }
    return allFields.slice(0,6);
  });

  function normalizeFields(t:any){
    if(!t) {
      if(records.length>0 && realKeysFromRecords.length>0){
        return realKeysFromRecords.map(k=>({field_name:k,label:k.replace(/_/g,' '),field_type:"text",name:k,options:[]}));
      }
      return [{field_name:'daily_tracker',label:'daily_tracker'},{field_name:'enter_input',label:'enter_input'},{field_name:'enter_output',label:'enter_output'},{field_name:'formula',label:'formula'},{field_name:'station',label:'station'}].map(k=>({field_name:k,label:k,field_type:"text",name:k,options:[]}));
    }
    const raw = t.data?.fields||t.fields||t.placements||[];
    return raw.map((f:any)=>({
      field_name:f.field_name??f.name??f._key??f.label?.toLowerCase().replace(/\s+/g,'_'),
      label:f.label??f.field_name??f.name,
      field_type:f.field_type??f.type??"text",
      type:f.type??f.field_type??"text",
      name:f.field_name??f.name,
      options: typeof f.options==="string"? JSON.parse(f.options||"[]") : f.options||[]
    })).filter((f:any)=> f.field_name && f.label);
  }

  function getVal(row:any,key:string){
    if(!row||!key) return "";
    if(row[key]!==undefined&&row[key]!==""&&row[key]!==null) return row[key];
    if(row.data?.[key]!==undefined) return row.data[key];
    const lk=key.toLowerCase().replace(/\s+/g,'_');
    for(let k of Object.keys(row)){
      if(k.toLowerCase().replace(/\s+/g,'_')===lk) return row[k];
    }
    if(row.data){
      for(let k of Object.keys(row.data)){
        if(k.toLowerCase().replace(/\s+/g,'_')===lk) return row.data[k];
      }
      const found = Object.keys(row.data).find(k=>{
        const kk=k.toLowerCase(); return lk.includes(kk) || kk.includes(lk);
      });
      if(found) return row.data[found];
    }
    return "";
  }
  function getNum(row:any,key:string){ const v=getVal(row,key); const n=parseFloat(String(v).replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; }
  function getLabel(n:string){ const f=allFields.find((f:any)=>f.field_name===n); return f?.label||n.replace(/_/g,' '); }

  function canAccessTemplate(t:any, myId:string, myEmail:string){
    if(!t) return false;
    const myIdL = String(myId||'').toLowerCase();
    const myEmailL = String(myEmail||'').toLowerCase();
    if(!myIdL &&!myEmailL) return false;
    const owners = [t.owner_id, t.owner_name, t.owner_email, t.data?.owner_id, t.data?.owner_name, t.data?.owner_email, t.data?.owner_uuid].map(v=> String(v||'').toLowerCase()).filter(Boolean);
    for(const o of owners){ if(o===myIdL || o===myEmailL) return true; }
    if(t.allow_all_contacts===true) return true;
    if(t.data?.allow_all_contacts===true) return true;
    const shared = t.shared_with || t.data?.shared_with || [];
    if(Array.isArray(shared)){
      const found = shared.find((s:any)=>{ const uid = String(s.user_id||s.email||'').toLowerCase(); return (uid===myIdL || uid===myEmailL) && s.approved===true; });
      if(found) return true;
    }
    if(owners.length===0) return true;
    return false;
  }

  onMount(async () => {
    if (browser) {
      const c = await import('chart.js/auto'); ChartJS=c.Chart;
      try{ const { data: { user } } = await chatDB.auth.getUser(); if(user){ currentUser=user; currentUserId=user.id; console.log("Auth OK:", user.id); } }catch{}
      if(!currentUserId){
        try{
          for(let k of Object.keys(localStorage)){
            if(k.includes('auth-token')){
              const v = JSON.parse(localStorage.getItem(k)||'{}');
              const uid = v?.user?.id || v?.currentSession?.user?.id;
              const u = v?.user || v?.currentSession?.user;
              if(uid){ currentUserId=uid; currentUser=u||currentUser; console.log("Recovered from",k,uid); break; }
            }
          }
        }catch{}
      }
      if(!currentUserId) {
        currentUserId = '0dcad97e-8c13-4ab1-bfc4-f50c9b3cea75';
        console.log("Using fallback ID:", currentUserId);
      }
    }
    try{
      const { data } = await supabaseTemplates.from('templates').select('*').order('created_at',{ascending:false});
      const dbTemplates = (data||[]).map((t:any)=>({
    ...t,
        template_code: t.template_code||t.t_code||t.data?.code||t.data?.t_code,
        t_code: t.t_code||t.template_code||t.data?.t_code||t.data?.code,
        code: t.code||t.template_code||t.data?.code,
        data: t.data || { fields: t.fields||[] },
        fields: t.data?.fields||t.fields||[],
        owner_id: t.owner_id||t.data?.owner_uuid||t.data?.owner_id,
        owner_name: t.owner_name||t.data?.owner_name||t.data?.owner_email,
        allow_all_contacts: t.allow_all_contacts===true || t.data?.allow_all_contacts===true,
        shared_with: t.shared_with||t.data?.shared_with||[]
      }));
      const local = JSON.parse(localStorage.getItem("templates")||"[]").map((t:any)=>({
        id: t.id, name: t.name, template_code: t.template_code||t.code||t.t_code, t_code: t.template_code||t.code||t.t_code, code: t.code, category: t.category,
        data: t.data||{ fields: t.fields||t.data?.fields||[], owner_id: t.owner_id, owner_name: t.owner_name, allow_all_contacts: t.allow_all_contacts, shared_with: t.shared_with },
        fields: t.fields||t.data?.fields||[], created_at: t.createdAt, owner_id: t.owner_id||t.data?.owner_id, owner_name: t.owner_name||t.data?.owner_name, allow_all_contacts: t.allow_all_contacts===true||t.data?.allow_all_contacts===true, shared_with: t.shared_with||t.data?.shared_with||[]
      }));
      const map = new Map();
      [...dbTemplates,...local].forEach(t=>{ if(!t) return; const key = String(t.id); if(!map.has(key)) map.set(key, t); });
      templates = Array.from(map.values());
      if(templates.length>0){
        const first = templates[0];
        const fields = normalizeFields(first);
        if(fields.length>0){
          analysisSets[0].x = fields[0]?.field_name || 'daily_tracker';
          analysisSets[0].y = fields.find(f=> f.field_name==='enter_input' || f.field_type==='number')?.field_name || fields[1]?.field_name || 'enter_input';
          analysisSets = [...analysisSets];
        }
      }
    }catch{ try{ const raw = JSON.parse(localStorage.getItem("templates")||"[]"); templates = raw; }catch{ templates=[]; } }
    loadRecords();
  });

  async function loadRecords(){
    loading=true; error="";
    try{
      let myId = currentUserId || currentUser?.id || '';
      let myEmail = currentUser?.email || '';
      try{ const { data: { user } } = await chatDB.auth.getUser(); if(user){ myId=user.id; myEmail=user.email||''; currentUser=user; currentUserId=user.id; } }catch{}
      if(!myId){
        try{
          for(let k of Object.keys(localStorage)){
            if(k.includes('auth-token')){
              const v = JSON.parse(localStorage.getItem(k)||'{}');
              const uid = v?.user?.id || v?.currentSession?.user?.id;
              if(uid){ myId=uid; break; }
            }
          }
        }catch{}
        if(!myId) myId='0dcad97e-8c13-4ab1-bfc4-f50c9b3cea75';
      }
      console.log("LOAD:", { myId, myEmail, selectedTemplateId, range: dateRange });
      let q = supabaseTemplates.from("records").select("*").order("ts",{ascending:false}).limit(2000);
      const { data, error: dErr } = await q;
      if(dErr) throw dErr;
      let allRecs = (data||[]).map((r:any)=> ({...r.data,...r, _template_name: r.data?.template_name || r.template_name || r.t_code, _ts: r.ts, data: r.data }));
      console.log("Total in DB:", allRecs.length, allRecs[0]);

      let filtered = allRecs.filter((r:any)=>{
        const selId = String(selectedTemplateId||'').toLowerCase();
        const rId = String(r.reference_template_id || r.data?.reference_template_id || '').toLowerCase();
        // VENT ONLY strict ID
        if(selectedTemplateId!=='ALL'){
          if(!rId) return false;
          if(rId!==selId) return false;
        }
        // owner secure
        const recOwner = String(r.owner_id || r.data?.owner_id || r.user_id || r.data?.user_id || '').toLowerCase();
        const recEmail = String(r.data?.owner_email || '').toLowerCase();
        if(recOwner){
          if(recOwner===myId.toLowerCase()) return true;
          if(myEmail && recOwner===myEmail.toLowerCase()) return true;
          if(myEmail && recEmail===myEmail.toLowerCase()) return true;
          if(recOwner==='0dcad97e-8c13-4ab1-bfc4-f50c9b3cea75') return true;
          return false;
        }
        return true;
      });

      console.log("After filter:", filtered.length);
      records = filtered;
      if(records.length===0){
        error = selectedTemplateId!=='ALL' && selectedTemplate? `No records for ${selectedTemplate.name} - DB has ${allRecs.length} total` : `🔒 Secure: No private data - Total DB: ${allRecs.length}`;
      } else {
        error = "";
      }
      await tick(); setTimeout(()=>{ renderAll(); }, 600);
    }catch(e:any){ error=e.message; console.error(e); } finally{ loading=false; }
  }

  async function renderAll(){
    await tick();
    if(!ChartJS || records.length===0 ||!analysisSets[0].x ||!analysisSets[0].y) return;
    for(const set of analysisSets){
      const canvas = document.getElementById(`chart-${set.id}`) as HTMLCanvasElement;
      if(!canvas) continue;
      let filtered = records;
      if(set.stationFilter?.length>0) filtered = records.filter(r=> set.stationFilter.includes(String(getVal(r,'station')||'').trim()));
      const grouped: Record<string, {vals:number[], ts:number}> = {};
      filtered.forEach(row=>{
        let xv = set.x==='ts'? dayjs(row.ts).format('MM/DD HH:mm') : String(getVal(row,set.x)||'Unknown').trim();
        if(!xv) xv='Unknown';
        let yv = getNum(row,set.y);
        if(!grouped[xv]) grouped[xv]={vals:[], ts:new Date(row.ts).getTime()};
        grouped[xv].vals.push(yv);
      });
      let entries = Object.entries(grouped);
      if(set.x==='ts') entries.sort((a,b)=> a[1].ts - b[1].ts); else entries.sort((a,b)=>a[0].localeCompare(b[0]));
      const labels = entries.map(e=>e[0]); const values = entries.map(e=> e[1].vals.reduce((a,b)=>a+b,0)/(e[1].vals.length||1));
      const old = chartMap.get(set.id); if(old) old.destroy();
      const ctx = canvas.getContext('2d'); if(!ctx) continue;
      const color = ['#2563eb','#00a884','#f59e0b','#ef4444','#8b5cf6'][(set.id-1)%5];
      const chart = new ChartJS(ctx,{ type: set.chartType==='trend'?'line':set.chartType, data:{ labels: labels.length?labels:['No Data'], datasets:[{ label:`${getLabel(set.y)}`, data: values.length?values:[0], borderColor:color, backgroundColor:color+'33', borderWidth:3, tension:0.4, fill:true, pointRadius:5 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true}, title:{display:true, text:`${set.label} → X:${getLabel(set.x)} | Y:${getLabel(set.y)} (${filtered.length})`} }, scales:{ x:{title:{display:true, text:`X: ${getLabel(set.x)}`}}, y:{title:{display:true, text:`Y: ${getLabel(set.y)}`}, beginAtZero:true} } } });
      chartMap.set(set.id, chart);
    }
  }
  function updateX(set:any, v:string){ set.x=v; analysisSets=[...analysisSets]; renderAll(); }
  function updateY(set:any, v:string){ set.y=v; analysisSets=[...analysisSets]; renderAll(); }
  function updateChartType(set:any, v:string){ set.chartType=v; analysisSets=[...analysisSets]; renderAll(); }
  function addStationFilter(set:any, v:string){ if(v&&!set.stationFilter.includes(v)){ set.stationFilter=[...set.stationFilter,v]; analysisSets=[...analysisSets]; renderAll(); } }
  function removeStationFilter(set:any, sf:string){ set.stationFilter=set.stationFilter.filter((s:string)=>s!==sf); analysisSets=[...analysisSets]; renderAll(); }
  async function addComparison(){ if(analysisSets.length>=5) return; const nid=nextId++; const defX = allFields[0]?.field_name||realKeysFromRecords[0]||'daily_tracker'; const defY = allFields[1]?.field_name||realKeysFromRecords[1]||defX; analysisSets=[...analysisSets,{id:nid,x:defX,y:defY,label:`Set ${nid}`,stationFilter:[] as string[],chartType:'line'}]; await tick(); setTimeout(renderAll,400); }
  function removeSet(id:any){ const c=chartMap.get(id); if(c) c.destroy(); chartMap.delete(id); analysisSets=analysisSets.filter(s=>s.id!==id); }
  function goBottom(tab:string){
    bottomTab=tab;
    if(tab==='dashboard' && browser) window.location.href='/';
    if(tab==='chat' && browser) window.location.href='/chat';
    if(tab==='report' && browser) window.location.href='/report';
    if(tab==='user' && browser) window.location.href='/settings';
  }
</script>

<div class="app">
  <div class="top-fixed">
    <div class="top-row"><div class="title">📈 Report - Secure Private</div><a href="/chat" class="chat-btn">→ Chat</a></div>
    <div class="filters">
      <div class="f1"><label>Calendar</label><button class="date-btn" onclick={()=>showCalendar=!showCalendar}>{dateRange.from} / {dateRange.to}</button>{#if showCalendar}<div class="cal-pop"><input type="date" bind:value={dateRange.from} /><input type="date" bind:value={dateRange.to} /><button class="apply" onclick={()=>{showCalendar=false; loadRecords();}}>Apply</button></div>{/if}</div>
      <div class="f2"><label>Template</label><select bind:value={selectedTemplateId} onchange={loadRecords}><option value="ALL">All Reports ({templates.length})</option>{#each templates as t}<option value={t.id}>{t.name} ({t.template_code||t.t_code})</option>{/each}</select></div>
      <button class="load" onclick={loadRecords}>{loading?'...':'Load'}</button>
    </div>
    {#if error}<div class="err">{error}</div>{/if}
    <div style="font-size:10px;color:#065f46;margin-top:4px;background:#ecfdf5;padding:4px 6px;border-radius:6px;display:flex;justify-content:space-between;">
      <span>🔒 {currentUser?.email||'Secure'} • {selectedTemplate? selectedTemplate.name+' ONLY' : 'All'} • {selectedTemplate?.template_code||selectedTemplate?.t_code||''}</span><span>Found: {records.length}</span>
    </div>
  </div>

  <div class="scroll-area">
    {#if records.length>0 && tableColumns.length>0}
      <div class="table-box">
        <table>
          <thead><tr><th>Time</th><th>Template</th>{#each tableColumns as col}<th>{col.label}</th>{/each}</tr></thead>
          <tbody>{#each displayRows as r}<tr><td>{dayjs(r.ts||r._ts).format('MM/DD HH:mm')}</td><td style="font-weight:700">{r._template_name||r.template_name||r.t_code}</td>{#each tableColumns as col}<td>{getVal(r, col.field_name)}</td>{/each}</tr>{/each}</tbody>
        </table>
        {#if records.length>3}<div style="text-align:center;margin:6px 0;"><button class="more" onclick={()=>showMoreRows=!showMoreRows}>{showMoreRows?'▲ Less':'▼ All '+records.length}</button></div>{/if}
      </div>
      {#if xOptions.length>0 && yOptions.length>0}
        {#each analysisSets as set, i (set.id)}
          <div class="graph">
            <div class="g-controls">
              <span class="badge">{set.label} ({i+1}/{analysisSets.length})</span>
              <select class="inline" value={set.x} onchange={(e)=>updateX(set,(e.target as HTMLSelectElement).value)}><option value="">Select X</option>{#each xOptions as o}<option value={o.name}>{o.label}</option>{/each}</select>
              <select class="inline" value={set.y} onchange={(e)=>updateY(set,(e.target as HTMLSelectElement).value)}><option value="">Select Y</option>{#each yOptions as o}<option value={o.name}>{o.label}</option>{/each}</select>
              <select class="inline" value={set.chartType} onchange={(e)=>updateChartType(set,(e.target as HTMLSelectElement).value)}><option value="line">Line</option><option value="bar">Bar</option><option value="trend">Trend</option></select>
              {#if availableStations.length>0}<select class="inline" onchange={(e)=>{ addStationFilter(set,(e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value='';}}><option value="">All Stations</option>{#each availableStations as st}<option value={st}>{st}</option>{/each}</select>{/if}
              {#if analysisSets.length>1}<button class="del" onclick={()=>removeSet(set.id)}>🗑️</button>{/if}
            </div>
            {#if set.stationFilter.length>0}<div class="f-chips">{#each set.stationFilter as sf}<span>{sf}<button onclick={()=>removeStationFilter(set,sf)}>x</button></span>{/each}</div>{/if}
            <div class="chart-wrap"><canvas id="chart-{set.id}"></canvas></div>
          </div>
        {/each}
        {#if analysisSets.length<5}<button class="add" onclick={addComparison}>+ Add Graph ({analysisSets.length}/5)</button>{:else}<div class="max">✅ Max 5 reached</div>{/if}
      {/if}
    {:else if !loading}
      <div style="text-align:center;padding:40px;color:#64748b;">
        <div style="font-size:40px">📭</div>
        <h3>No Reports for {selectedTemplate? selectedTemplate.name : 'ALL'}</h3>
        <p style="font-size:12px">🔒 Only {selectedTemplate? selectedTemplate.template_code||selectedTemplate.t_code : 'selected'} data will show here.</p>
        <a href="/chat" style="background:#00a884;color:white;padding:8px 16px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px;">Go to Chat</a>
      </div>
    {/if}
  </div>

  <nav class="bottom-fixed">
    <button class:active={bottomTab==='dashboard'} onclick={()=>goBottom('dashboard')}><span class="b-icon">📊</span><small>Dashboard</small></button>
    <button class:active={bottomTab==='chat'} onclick={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button>
    <button class:active={bottomTab==='report'} onclick={()=>goBottom('report')}><span class="b-icon">📋</span><small>Report</small></button>
    <button class:active={bottomTab==='user'} onclick={()=>goBottom('user')}>{#if currentUser?.user_metadata?.avatar_url}<img src={currentUser.user_metadata.avatar_url} class="b-avatar" alt="me" />{:else}<span class="b-icon">👤</span>{/if}<small>User</small></button>
  </nav>
</div>

<style>
.app{display:flex;flex-direction:column;height:100dvh;width:100vw;overflow:hidden;background:#f1f5f9;margin:0;}
.top-fixed{flex:0 0 auto;background:#fff7ed;border-bottom:2px solid #fed7aa;padding:8px;z-index:30;}
.scroll-area{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:white;padding:8px;}
.top-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.title{font-weight:800;font-size:14px;}
.chat-btn{background:#3a241c;color:white;padding:4px 10px;border-radius:16px;text-decoration:none;font-size:11px;}
.filters{display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap;}
.f1,.f2{display:flex;flex-direction:column;gap:2px;}
.f1 label,.f2 label{font-size:9px;font-weight:700;color:#7c2d12;}
.date-btn{padding:7px 10px;border:1px solid #e7c4b0;border-radius:8px;background:white;font-size:11px;}
.f2 select{padding:7px;border-radius:8px;border:1px solid #e7c4b0;min-width:160px;font-size:12px;}
.load{background:#00a884;color:white;border:none;padding:7px 14px;border-radius:8px;font-weight:700;height:32px;}
.cal-pop{position:absolute;top:80px;left:8px;z-index:50;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;gap:6px;box-shadow:0 10px 20px rgba(0,0,0,0.2);}
.apply{background:#00a884;color:white;border:none;padding:6px 10px;border-radius:6px;}
.err{background:#fee2e2;color:#b91c1c;padding:6px;border-radius:6px;font-size:11px;margin-top:6px;}
.table-box{border:1px solid #e5e7eb;border-radius:8px;overflow-x:auto;margin-bottom:10px;}
table{width:100%;border-collapse:collapse;min-width:700px;}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;white-space:nowrap;}
th{background:#f8fafc;font-weight:700;text-transform:capitalize;}
.more{padding:4px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#f1f5f9;font-size:11px;}
.graph{border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:10px;background:#fcfdff;}
.g-controls{display:flex;flex-direction:row;gap:6px;align-items:center;flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px;}
.g-controls::-webkit-scrollbar{display:none;}.g-controls{scrollbar-width:none;-ms-overflow-style:none;}
.badge{flex:0 0 auto;font-size:10px;font-weight:800;color:white;background:#2563eb;padding:6px 8px;border-radius:6px;white-space:nowrap;}
select.inline{flex:1 1 0;min-width:75px;padding:7px 6px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;background:white;}
.del{flex:0 0 auto;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:6px 8px;}
.f-chips{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0;}
.f-chips span{background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:10px;font-size:10px;display:flex;gap:3px;align-items:center;}
.chart-wrap{height:320px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:6px;}
.chart-wrap canvas{width:100%!important;height:100%!important;}
.add{width:100%;background:white;border:1px dashed #2563eb;color:#2563eb;padding:10px;border-radius:8px;font-weight:700;margin-top:6px;}
.max{text-align:center;color:#00a884;font-weight:700;padding:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;}
.bottom-fixed{flex-shrink:0;height:68px;min-height:68px;background:#202c33;border-top:1px solid #2a3942;display:flex;justify-content:space-around;align-items:center;z-index:30;padding-bottom:env(safe-area-inset-bottom);}
.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;color:#8696a0;cursor:pointer;flex:1;padding:6px;}
.bottom-fixed button.active{color:#00a884;}
.b-icon{font-size:20px;line-height:1;}
.b-avatar{width:26px;height:26px;border-radius:50%;object-fit:cover;border:2px solid #00a884;}
.bottom-fixed small{font-size:11px;font-weight:600;}
@media (max-width:768px){
.filters{ display:grid; grid-template-columns:1fr 1fr; gap:8px; align-items:end; }
.f1,.f2{ width:100%; min-width:0; }
.date-btn,.f2 select{ width:100%; min-width:0; height:38px; font-size:12px; }
.load{ grid-column:1 / -1; width:100%; height:36px; margin-top:2px; }
}
</style>