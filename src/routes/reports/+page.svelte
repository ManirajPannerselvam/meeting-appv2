<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from '$app/environment';
  import { goto, preloadData } from '$app/navigation';
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
  let displayRows = $derived(showMoreRows? records.slice(0,100) : records.slice(0,10));
  let ChartJS: any = null;
  let chartMap: Map<any, any> = new Map();
  let nextId = $state(2);
  let analysisSets: any[] = $state([{id:1, x:'', y:'', label:'Set 1', stationFilter: [] as string[], chartType:'line'}]);
  let currentUser = $state<any>(null);
  let currentUserId = $state('');
  let currentUserEmail = $state('');
  let bottomTab = $state('reports');

  const MAX_ID_LEN=100;
  // ✅ 50k secure sanitize
  function sanitizeStr(s:any, max=80){
    if(typeof s!=='string') return '';
    return s.replace(/[<>`$&"'=]/g,'').trim().slice(0,max);
  }
  function isMineTemplate(t:any){
    const myId = String(currentUserId||'').toLowerCase().slice(0,100);
    const myEmail = String(currentUserEmail||'').toLowerCase().slice(0,100);
    const oid = String(t.owner_id||t.user_id||t.owner_email||'').toLowerCase().slice(0,100);
    const oname = String(t.owner_name||'').toLowerCase().slice(0,100);
    if(!myId && !myEmail) return true;
    if(oid && myId && oid===myId) return true;
    if(oid && myEmail && oid===myEmail) return true;
    if(oname && myEmail && oname===myEmail) return true;
    if(!oid && !oname) return true;
    if(t.allow_all_contacts) return true;
    if(Array.isArray(t.shared_with)){
      return t.shared_with.slice(0,50).some((s:any)=> {
        const su = String(s.user_id||'').toLowerCase().slice(0,100);
        return su===myId || su===myEmail;
      });
    }
    return false;
  }
  function isMineRecord(r:any){
    const myId = String(currentUserId||'').toLowerCase().slice(0,100);
    const myEmail = String(currentUserEmail||'').toLowerCase().slice(0,100);
    if(!myId && !myEmail) return true;
    const oid = String(r.owner_id||r.user_id||r.owner_email||r.data?.owner_id||'').toLowerCase().slice(0,100);
    if(!oid) return true;
    if(oid===myId || oid===myEmail) return true;
    const tid = String(r.template_id||r.reference_template_id||r.data?.template_id||'').toLowerCase().slice(0,100);
    const tcode = String(r.template_code||r.t_code||r.data?.template_code||'').toLowerCase().slice(0,50);
    const parent = templates.find(t=> String(t.id).toLowerCase()===tid || String(t.template_code||'').toLowerCase()===tcode );
    if(parent && isMineTemplate(parent)) return true;
    return false;
  }

  let startX = 0; let startY = 0;
  function onTouchStart(e: TouchEvent){ startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
  function onTouchEnd(e: TouchEvent){
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if(Math.abs(dy) > Math.abs(dx)) return;
    if(Math.abs(dx) < 80) return;
    if(dx < 0){ goto('/settings', {keepFocus:true}); }else{ goto('/chat', {keepFocus:true}); }
  }
  function fmtTime(v:any){ if(!v) return '-'; try { return dayjs(v).format('DD/MM/YY hh:mm A'); } catch { return String(v).slice(0,16).replace(/[<>]/g,''); } }

  // ✅ 50k FAST: memoize fields once
  let allFields = $derived(normalizeFields(selectedTemplate));

  // ✅ 50k FIX: only scan 30 records, not all 200, and cache
  let realKeysFromRecords = $derived.by(()=>{
    if(records.length===0) return [];
    const keys = new Set<string>();
    const limit = Math.min(records.length, 30);
    for(let i=0;i<limit;i++){
      const r = records[i];
      const dataKeys = r.data ? Object.keys(r.data) : [];
      for(let k of dataKeys){
        if(keys.size>=15) break;
        const sk = sanitizeStr(k,50);
        if(!sk) continue;
        if(sk.toLowerCase().includes('owner_id')) continue;
        keys.add(sk);
      }
    }
    return Array.from(keys);
  });

  let xOptions = $derived.by(()=> allFields.length>0 ? allFields.map((f:any)=>({name:f.field_name, label:f.label})) : realKeysFromRecords.map(k=>({name:k,label:k})));
  let yOptions = $derived.by(()=>{ const nums = allFields.filter((f:any)=> f.field_type==="number"); return nums.length>0 ? nums.map((f:any)=>({name:f.field_name, label:f.label})) : realKeysFromRecords.map(k=>({name:k,label:k})); });
  let tableColumns = $derived.by(()=>{
    let cols: any[] = records.length===0 ? allFields.slice(0,5) : realKeysFromRecords.length===0 ? allFields.slice(0,5) : realKeysFromRecords.slice(0,5).map(k=>({field_name:k,label:k.replace(/_/g,' '),field_type:"text",name:k}));
    return cols.slice(0,5);
  });

  function normalizeFields(t:any){
    if(!t) return [{field_name:'daily_tracker',label:'daily_tracker'},{field_name:'enter_input',label:'enter_input'},{field_name:'station',label:'station'}].map(k=>({...k,field_type:"text",name:k.field_name,options:[]}));
    const raw = (t.data?.fields||t.fields||[]).slice(0,100);
    return raw.map((f:any)=>({
      field_name:sanitizeStr(f.field_name??f.name,50),
      label:sanitizeStr(f.label??f.field_name,50),
      field_type:(f.field_type??f.type??"text").toString().slice(0,20),
      type:(f.type??"text").toString().slice(0,20),
      name:sanitizeStr(f.field_name??f.name,50),
      options: Array.isArray(f.options)? f.options.slice(0,50).map((o:any)=>sanitizeStr(o,50)) : typeof f.options==="string"? (()=>{try{const p=JSON.parse(f.options||"[]"); return Array.isArray(p)? p.slice(0,50).map((o:any)=>sanitizeStr(o,50)): []}catch{return []}})() : []
    })).filter((f:any)=> f.field_name);
  }

  function getVal(row:any,key:string){
    if(!row||!key) return "";
    const k=sanitizeStr(key,50);
    if(!k) return "";
    if(row[k]!==""&&row[k]!=null) return String(row[k]).slice(0,100).replace(/[<>]/g,'');
    if(row.data?.[k]!==undefined) return String(row.data[k]).slice(0,100).replace(/[<>]/g,'');
    const lk=k.toLowerCase();
    // fast path: only check direct, not full scan for 50k
    for(let kk of Object.keys(row).slice(0,30)){
      if(kk.toLowerCase()===lk) return String(row[kk]).slice(0,100).replace(/[<>]/g,'');
    }
    if(row.data){
      for(let kk of Object.keys(row.data).slice(0,30)){
        if(kk.toLowerCase()===lk) return String(row.data[kk]).slice(0,100).replace(/[<>]/g,'');
      }
    }
    return "";
  }
  function getNum(row:any,key:string){ const v=getVal(row,key); const n=parseFloat(String(v).replace(/[^0-9.\-]/g,'').slice(0,20)); return isNaN(n)||!isFinite(n)?0:Math.max(-1e9,Math.min(1e9,n)); }
  function getLabel(n:string){ const f=allFields.find((f:any)=>f.field_name===n); return sanitizeStr(f?.label||n,40); }

  onMount(async () => {
    if (browser) {
      try{ preloadData('/chat'); preloadData('/settings'); }catch{}
      try{
        const cachedT = localStorage.getItem('ems_templates_cache');
        if(cachedT && cachedT.length<200000) templates = JSON.parse(cachedT);
        const cachedR = localStorage.getItem('ems_records_cache');
        if(cachedR && cachedR.length<200000) records = JSON.parse(cachedR);
      }catch{}
      import('chart.js/auto').then(c=> ChartJS=c.Chart);
      try{ const { data: { user } } = await chatDB.auth.getUser(); if(user){ currentUser=user; currentUserId=user.id.slice(0,100); currentUserEmail=(user.email||'').slice(0,100); } }catch{}
    }
    try{
      const { data } = await supabaseTemplates.from('templates').select('*').order('created_at',{ascending:false}).limit(100);
      let all = (data||[]).map((t:any)=>({ ...t, template_code: sanitizeStr(t.template_code||t.t_code,30), t_code: sanitizeStr(t.t_code||t.template_code,30), data: t.data || { fields: t.fields||[] }, fields: t.data?.fields||t.fields||[] }));
      templates = all.filter(isMineTemplate).slice(0,100);
      if(browser) try{ localStorage.setItem('ems_templates_cache', JSON.stringify(templates.slice(0,50))); }catch{}
      if(templates.length>0){ const fields = normalizeFields(templates[0]); if(fields.length>0){ analysisSets[0].x = fields[0].field_name; analysisSets[0].y = fields[1]?.field_name||fields[0].field_name; } }
    }catch{ templates=[]; }
    loadRecords();
  });

  async function loadRecords(){
    if(loading) return;
    loading=true; error="";
    try{
      let data:any[]|null=null;
      try{
        const res = await supabaseTemplates.from("records").select("*").order("ts",{ascending:false}).limit(200);
        if(!res.error) data=res.data;
      }catch{}
      if(!data || data.length===0){
        try{
          const res2 = await supabaseTemplates.from("template_entries").select("*").order("created_at",{ascending:false}).limit(100);
          if(!res2.error) data=(res2.data||[]).map((r:any)=>({...r, ts:r.created_at, data:r.data, t_code:r.template_code }));
        }catch{}
      }
      let allRecs = (data||[]).map((r:any)=> ({...r.data,...r, _template_name: sanitizeStr(r.data?.template_name || r.t_code || r.template_code || 'Report',60), _ts: r.ts||r.created_at, data: r.data||{} }));
      allRecs = allRecs.filter(isMineRecord).slice(0,200);
      let filtered = allRecs.filter((r:any)=>{
        if(selectedTemplateId!=='ALL'){
          const selId = String(selectedTemplateId).toLowerCase().slice(0,MAX_ID_LEN);
          const selCode = String(selectedTemplate?.template_code||'').toLowerCase().slice(0,50);
          const rId = String(r.reference_template_id || r.data?.template_id || r.template_id || '').toLowerCase().slice(0,100);
          const rCode = String(r.t_code || r.data?.template_code || r.template_code || '').toLowerCase().slice(0,50);
          if(rId===selId || rCode===selCode) return true;
          return false;
        }
        return true;
      });
      try{
        if(dateRange.from && dateRange.to){
          const from = dayjs(dateRange.from).valueOf(); const to = dayjs(dateRange.to).valueOf() + 86400000;
          filtered = filtered.filter((r:any)=>{ const ts = dayjs(r.ts || r._ts).valueOf(); return ts >= from && ts <= to; });
        }
      }catch{}
      records = filtered.slice(0,200);
      if(browser) try{ localStorage.setItem('ems_records_cache', JSON.stringify(records.slice(0,30))); }catch{}
      error = records.length===0 ? `No records` : "";
      await tick(); setTimeout(()=>renderAll(), 200);
    }catch(e:any){ error=sanitizeStr(e.message,100); } finally{ loading=false; }
  }

  async function renderAll(){
    await tick();
    if(!ChartJS || records.length===0) return;
    for(const set of analysisSets){
      const canvas = document.getElementById(`chart-${set.id}`) as HTMLCanvasElement; if(!canvas) continue;
      let filtered = set.stationFilter?.length ? records.filter(r=> set.stationFilter.includes(String(getVal(r,'station')))) : records;
      const grouped: Record<string, {vals:number[]; sum:number}> = {};
      const slice = filtered.slice(0,100);
      for(let row of slice){
        let xv = String(getVal(row,set.x)||'Unknown').slice(0,30).replace(/[<>]/g,'');
        let yv = getNum(row,set.y);
        if(!grouped[xv]) grouped[xv]={vals:[], sum:0};
        if(grouped[xv].vals.length<200){
          grouped[xv].vals.push(yv);
          grouped[xv].sum+=yv;
        }
      }
      const entries = Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,20);
      const labels = entries.map(e=>e[0]); const values = entries.map(e=> e[1].sum/(e[1].vals.length||1));
      const old = chartMap.get(set.id); if(old) old.destroy();
      const ctx = canvas.getContext('2d'); if(!ctx) continue;
      const colors = ['#2563eb','#00a884','#f59e0b','#ef4444','#8b5cf6','#14b8a6'];
      const color = colors[set.id%colors.length];
      let type = sanitizeStr(set.chartType,20); if(type==='trend') type='line'; if(type==='box') type='bar';
      const isPie = ['pie','doughnut','polarArea'].includes(type);
      const chart = new ChartJS(ctx,{
        type: type as any,
        data:{ labels: labels.length?labels:['No Data'], datasets:[{ label:getLabel(set.y), data: values.length?values:[0], borderColor: isPie ? colors : color, backgroundColor: isPie ? colors.map(c=>c+'CC') : color+'33', borderWidth:2, tension:0.4, fill: type==='line' }]},
        options:{ responsive:true, maintainAspectRatio:false, animation:false, plugins:{ legend:{ display: isPie } } }
      });
      chartMap.set(set.id, chart);
      await new Promise(r=> setTimeout(r, 40));
    }
  }
  function updateX(set:any, v:string){ set.x=sanitizeStr(v,50); analysisSets=[...analysisSets]; renderAll(); }
  function updateY(set:any, v:string){ set.y=sanitizeStr(v,50); analysisSets=[...analysisSets]; renderAll(); }
  function updateChartType(set:any, v:string){ set.chartType=sanitizeStr(v,20); analysisSets=[...analysisSets]; renderAll(); }
  function addComparison(){ if(analysisSets.length>=5) return; const nid=nextId++; analysisSets=[...analysisSets,{id:nid,x:allFields[0]?.field_name||'daily_tracker',y:allFields[1]?.field_name||'enter_input',label:`Set ${nid}`,stationFilter:[],chartType:'line'}]; tick().then(()=>setTimeout(renderAll,200)); }
  function removeSet(id:any){ const c=chartMap.get(id); if(c) c.destroy(); chartMap.delete(id); analysisSets=analysisSets.filter(s=>s.id!==id); }
  function goBottom(tab:string){
    bottomTab=tab;
    if(!browser) return;
    const t = tab==='chat'? '/chat' : tab==='reports'? '/reports' : '/settings';
    goto(t, {keepFocus:true, noScroll:true});
  }
</script>

<div class="app" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
  <div class="top-fixed">
    <div class="top-row"><div class="title">📈 Reports ({sanitizeStr(currentUserEmail||'you',30)})</div><a href="/chat" class="chat-btn">→ Chat</a></div>
    <div class="filters">
      <div class="f1"><label>Calendar</label><button class="date-btn" onclick={()=>showCalendar=!showCalendar}>{sanitizeStr(dateRange.from,10)} / {sanitizeStr(dateRange.to,10)}</button>{#if showCalendar}<div class="cal-pop"><input type="date" bind:value={dateRange.from} /><input type="date" bind:value={dateRange.to} /><button class="apply" onclick={()=>{showCalendar=false; loadRecords();}}>Apply</button></div>{/if}</div>
      <div class="f2"><label>Template</label><select bind:value={selectedTemplateId} onchange={loadRecords}><option value="ALL">All Mine ({templates.length})</option>{#each templates as t}<option value={t.id}>{sanitizeStr(t.name,40)} ({sanitizeStr(t.template_code||t.t_code,20)})</option>{/each}</select></div>
      <button class="load" onclick={loadRecords} disabled={loading}>{loading?'...':'Load'}</button>
    </div>
    {#if error}<div class="err">{error}</div>{/if}
  </div>

  <div class="scroll-area">
    {#if records.length>0}
      <div class="table-box">
        <table>
          <thead><tr><th>Time</th><th>Template</th>{#each tableColumns as col}<th>{sanitizeStr(col.label,30)}</th>{/each}</tr></thead>
          <tbody>{#each displayRows as r}<tr><td>{fmtTime(r.ts||r._ts)}</td><td style="font-weight:700">{r._template_name||r.t_code}</td>{#each tableColumns as col}<td>{getVal(r, col.field_name)}</td>{/each}</tr>{/each}</tbody>
        </table>
        {#if records.length>10}<div style="text-align:center;margin:6px 0;"><button class="more" onclick={()=>showMoreRows=!showMoreRows}>{showMoreRows?'▲ Less':'▼ All '+records.length}</button></div>{/if}
      </div>
      {#each analysisSets as set (set.id)}
        <div class="graph">
          <div class="g-controls">
            <span class="badge">{sanitizeStr(set.label,20)}</span>
            <select class="inline" value={set.x} onchange={(e)=>updateX(set,(e.target as HTMLSelectElement).value)}><option value="">X</option>{#each xOptions as o}<option value={o.name}>{sanitizeStr(o.label,30)}</option>{/each}</select>
            <select class="inline" value={set.y} onchange={(e)=>updateY(set,(e.target as HTMLSelectElement).value)}><option value="">Y</option>{#each yOptions as o}<option value={o.name}>{sanitizeStr(o.label,30)}</option>{/each}</select>
            <select class="inline" value={set.chartType} onchange={(e)=>updateChartType(set,(e.target as HTMLSelectElement).value)}><option value="line">Line</option><option value="bar">Bar</option><option value="pie">Pie</option><option value="doughnut">Doughnut</option><option value="polarArea">Polar</option><option value="radar">Radar</option><option value="scatter">Scatter</option><option value="trend">Trend</option></select>
            {#if analysisSets.length>1}<button class="del" onclick={()=>removeSet(set.id)}>🗑️</button>{/if}
          </div>
          <div class="chart-wrap"><canvas id="chart-{set.id}"></canvas></div>
        </div>
      {/each}
      {#if analysisSets.length<5}<button class="add" onclick={addComparison}>+ Add Graph</button>{/if}
    {:else if !loading}
      <div style="text-align:center;padding:40px;color:#64748b;">📭 No Reports<br/><a href="/chat" style="background:#00a884;color:white;padding:8px 16px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px;">Go to Chat</a></div>
    {/if}
  </div>

  <nav class="bottom-fixed">
    <button class:active={bottomTab==='chat'} onmouseenter={()=>preloadData('/chat')} ontouchstart={()=>preloadData('/chat')} onclick={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button>
    <button class:active={bottomTab==='reports'} onmouseenter={()=>preloadData('/reports')} ontouchstart={()=>preloadData('/reports')} onclick={()=>goBottom('reports')}><span class="b-icon">📋</span><small>Report</small></button>
    <button class:active={bottomTab==='user'} onmouseenter={()=>preloadData('/settings')} ontouchstart={()=>preloadData('/settings')} onclick={()=>goBottom('user')}><span class="b-icon">👤</span><small>User</small></button>
  </nav>
</div>

<style>
.app{display:flex;flex-direction:column;height:100dvh;width:100vw;overflow:hidden;background:#f1f5f9;touch-action:pan-y;}
.top-fixed{flex:0 0 auto;background:#fff7ed;border-bottom:2px solid #fed7aa;padding:8px;z-index:30;}
.scroll-area{flex:1 1 auto;overflow-y:auto;background:white;padding:8px; contain: content;}
.top-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.title{font-weight:800;font-size:14px;}
.chat-btn{background:#3a241c;color:white;padding:4px 10px;border-radius:16px;text-decoration:none;font-size:11px;}
.filters{display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap;}
.f1,.f2{display:flex;flex-direction:column;gap:2px;}
.f1 label,.f2 label{font-size:9px;font-weight:700;}
.date-btn{padding:7px 10px;border:1px solid #e7c4b0;border-radius:8px;background:white;font-size:11px;}
.f2 select{padding:7px;border-radius:8px;border:1px solid #e7c4b0;min-width:160px;font-size:12px;}
.load{background:#00a884;color:white;border:none;padding:7px 14px;border-radius:8px;font-weight:700;height:32px;}
.cal-pop{position:absolute;top:80px;left:8px;z-index:50;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;gap:6px;}
.apply{background:#00a884;color:white;border:none;padding:6px 10px;border-radius:6px;}
.err{background:#fee2e2;color:#b91c1c;padding:6px;border-radius:6px;font-size:11px;margin-top:6px;}
.table-box{border:1px solid #e5e7eb;border-radius:8px;overflow-x:auto;margin-bottom:10px;}
table{width:100%;border-collapse:collapse;min-width:500px;}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;white-space:nowrap;}
th{background:#f8fafc;font-weight:700;}
.more{padding:4px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#f1f5f9;font-size:11px;}
.graph{border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:10px;background:#fcfdff;}
.g-controls{display:flex;gap:6px;align-items:center;overflow-x:auto;}
.badge{font-size:10px;font-weight:800;color:white;background:#2563eb;padding:6px 8px;border-radius:6px;white-space:nowrap;}
select.inline{flex:1;min-width:75px;padding:7px 6px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;background:white;}
.del{background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:6px 8px;}
.chart-wrap{height:260px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:6px;margin-top:6px;}
.chart-wrap canvas{width:100%!important;height:100%!important;}
.add{width:100%;background:white;border:1px dashed #2563eb;color:#2563eb;padding:10px;border-radius:8px;font-weight:700;margin-top:6px;}
.bottom-fixed{flex-shrink:0;height:68px;background:#202c33;border-top:1px solid #2a3942;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;z-index:30;}
.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;color:#8696a0;cursor:pointer;flex:1;padding:6px;}
.bottom-fixed button.active{color:#00a884;}
.b-icon{font-size:20px;}
.bottom-fixed small{font-size:11px;font-weight:600;}
</style>