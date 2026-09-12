<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
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
  let currentUserEmail = $state('');
  let bottomTab = $state('reports');

  // WHATSAPP SWIPE - ADDED ONLY
  let startX = 0; let startY = 0;
  function onTouchStart(e: TouchEvent){ startX = e.touches[0].clientX; startY = e.touches[0].clientY; }
  function onTouchEnd(e: TouchEvent){
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if(Math.abs(dy) > Math.abs(dx)) return;
    if(Math.abs(dx) < 80) return;
    if(dx < 0){
      // Swipe LEFT: Reports -> User
      goto('/settings');
    }else{
      // Swipe RIGHT: Reports -> Chat
      goto('/chat');
    }
  }

  function fmtTime(v:any){ if(!v) return '-'; try { return dayjs(v).format('DD/MM/YY hh:mm A'); } catch { return String(v).slice(0,16); } }

  let allFields = $derived(normalizeFields(selectedTemplate));
  let realKeysFromRecords = $derived.by(()=>{
    const keys = new Set<string>();
    records.forEach(r=>{
      Object.keys(r.data||{}).forEach(k=> keys.add(k));
      Object.keys(r).forEach(k=> { if(!['id','ts','t_code','template_code','template_id','template_name','created_at','data','_template_name','_ts','owner_id','user_id','owner_email','user_email'].includes(k)) keys.add(k); });
    });
    return Array.from(keys).filter(k=>{ const lk = k.toLowerCase(); if(lk.includes('owner_id') || lk.includes('user_id')) return false; return true; });
  });
  let availableStations = $derived.by(()=>{
    const opt = allFields.find((f:any) => (f.field_name||f.name).toLowerCase().includes('station'))?.options || [];
    if(opt.length>0) return opt;
    const st = new Set<string>();
    records.forEach(r=>{ const v = getVal(r,'station'); if(v) st.add(String(v).trim()); });
    return Array.from(st);
  });
  let xOptions = $derived.by(()=> allFields.length>0 ? allFields.map((f:any)=>({name:f.field_name, label:f.label})) : realKeysFromRecords.map(k=>({name:k,label:k})));
  let yOptions = $derived.by(()=>{ const nums = allFields.filter((f:any)=> f.field_type==="number"); return nums.length>0 ? nums.map((f:any)=>({name:f.field_name, label:f.label})) : realKeysFromRecords.map(k=>({name:k,label:k})); });
  let tableColumns = $derived.by(()=>{
    let cols: any[] = records.length===0 ? allFields.slice(0,6) : realKeysFromRecords.length===0 ? allFields.slice(0,6) : realKeysFromRecords.slice(0,6).map(k=>({field_name:k,label:k.replace(/_/g,' '),field_type:"text",name:k}));
    return cols.slice(0,6);
  });

  function normalizeFields(t:any){
    if(!t) return [{field_name:'daily_tracker',label:'daily_tracker'},{field_name:'enter_input',label:'enter_input'},{field_name:'station',label:'station'}].map(k=>({...k,field_type:"text",name:k.field_name,options:[]}));
    const raw = t.data?.fields||t.fields||[];
    return raw.map((f:any)=>({ field_name:f.field_name??f.name, label:f.label??f.field_name, field_type:f.field_type??f.type??"text", type:f.type??"text", name:f.field_name??f.name, options: typeof f.options==="string"? JSON.parse(f.options||"[]") : f.options||[] })).filter((f:any)=> f.field_name);
  }
  function getVal(row:any,key:string){ if(!row||!key) return ""; if(row[key]!==""&&row[key]!=null) return row[key]; if(row.data?.[key]!==undefined) return row.data[key]; const lk=key.toLowerCase(); for(let k of Object.keys(row)){ if(k.toLowerCase()===lk) return row[k]; } if(row.data){ for(let k of Object.keys(row.data)){ if(k.toLowerCase()===lk) return row.data[k]; } } return ""; }
  function getNum(row:any,key:string){ const v=getVal(row,key); const n=parseFloat(String(v).replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; }
  function getLabel(n:string){ const f=allFields.find((f:any)=>f.field_name===n); return f?.label||n; }

  onMount(async () => {
    if (browser) {
      const c = await import('chart.js/auto'); ChartJS=c.Chart;
      try{ const { data: { user } } = await chatDB.auth.getUser(); if(user){ currentUser=user; currentUserId=user.id; currentUserEmail=user.email||''; } }catch{}
    }
    try{
      const { data } = await supabaseTemplates.from('templates').select('*').order('created_at',{ascending:false});
      templates = (data||[]).map((t:any)=>({ ...t, template_code: t.template_code||t.t_code, t_code: t.t_code||t.template_code, data: t.data || { fields: t.fields||[] }, fields: t.data?.fields||t.fields||[] }));
      if(templates.length>0){ const fields = normalizeFields(templates[0]); if(fields.length>0){ analysisSets[0].x = fields[0].field_name; analysisSets[0].y = fields[1]?.field_name||fields[0].field_name; } }
    }catch{ templates=[]; }
    loadRecords();
  });

  async function loadRecords(){
    loading=true; error="";
    try{
      const { data } = await supabaseTemplates.from("records").select("*").order("ts",{ascending:false}).limit(2000);
      let allRecs = (data||[]).map((r:any)=> ({...r.data,...r, _template_name: r.data?.template_name || r.t_code, _ts: r.ts, data: r.data }));
      let filtered = allRecs.filter((r:any)=>{
        if(selectedTemplateId!=='ALL'){
          const selId = String(selectedTemplateId).toLowerCase();
          const selCode = String(selectedTemplate?.template_code||'').toLowerCase();
          const rId = String(r.reference_template_id || r.data?.template_id || '').toLowerCase();
          const rCode = String(r.t_code || r.data?.template_code || '').toLowerCase();
          if(rId===selId || rCode===selCode) return true;
          if(!rId && !rCode) return false;
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
      records = filtered;
      error = records.length===0 ? `No records - Total DB: ${allRecs.length}` : "";
      await tick(); setTimeout(()=>renderAll(), 300);
    }catch(e:any){ error=e.message; } finally{ loading=false; }
  }

  async function renderAll(){
    await tick();
    if(!ChartJS || records.length===0) return;
    for(const set of analysisSets){
      const canvas = document.getElementById(`chart-${set.id}`) as HTMLCanvasElement; if(!canvas) continue;
      let filtered = set.stationFilter?.length ? records.filter(r=> set.stationFilter.includes(String(getVal(r,'station')))) : records;
      const grouped: Record<string, {vals:number[], ts:number}> = {};
      filtered.forEach(row=>{ let xv = String(getVal(row,set.x)||'Unknown'); let yv = getNum(row,set.y); if(!grouped[xv]) grouped[xv]={vals:[], ts:new Date(row.ts).getTime()}; grouped[xv].vals.push(yv); });
      const entries = Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0]));
      const labels = entries.map(e=>e[0]); const values = entries.map(e=> e[1].vals.reduce((a,b)=>a+b,0)/(e[1].vals.length||1));
      const old = chartMap.get(set.id); if(old) old.destroy();
      const ctx = canvas.getContext('2d'); if(!ctx) continue;
      const color = ['#2563eb','#00a884','#f59e0b','#ef4444'][set.id%4];
      const chart = new ChartJS(ctx,{ type: set.chartType==='trend'?'line':set.chartType, data:{ labels: labels.length?labels:['No Data'], datasets:[{ label:getLabel(set.y), data: values.length?values:[0], borderColor:color, backgroundColor:color+'33', borderWidth:3, tension:0.4, fill:true }] }, options:{ responsive:true, maintainAspectRatio:false } });
      chartMap.set(set.id, chart);
    }
  }
  function updateX(set:any, v:string){ set.x=v; analysisSets=[...analysisSets]; renderAll(); }
  function updateY(set:any, v:string){ set.y=v; analysisSets=[...analysisSets]; renderAll(); }
  function updateChartType(set:any, v:string){ set.chartType=v; analysisSets=[...analysisSets]; renderAll(); }
  function addStationFilter(set:any, v:string){ if(v&&!set.stationFilter.includes(v)){ set.stationFilter=[...set.stationFilter,v]; analysisSets=[...analysisSets]; renderAll(); } }
  function removeStationFilter(set:any, sf:string){ set.stationFilter=set.stationFilter.filter((s:string)=>s!==sf); analysisSets=[...analysisSets]; renderAll(); }
  async function addComparison(){ if(analysisSets.length>=5) return; const nid=nextId++; analysisSets=[...analysisSets,{id:nid,x:allFields[0]?.field_name||'daily_tracker',y:allFields[1]?.field_name||'enter_input',label:`Set ${nid}`,stationFilter:[],chartType:'line'}]; await tick(); setTimeout(renderAll,300); }
  function removeSet(id:any){ const c=chartMap.get(id); if(c) c.destroy(); chartMap.delete(id); analysisSets=analysisSets.filter(s=>s.id!==id); }

  // FIXED - DASHBOARD HIDDEN - NO 404
  function goBottom(tab:string){
    bottomTab=tab;
    if(!browser) return;
    if(tab==='chat'){ goto('/chat'); return; }
    if(tab==='reports'){ goto('/reports'); return; }
    if(tab==='user'){ goto('/settings'); return; }
  }
</script>

<div class="app" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>  <div class="top-fixed">
    <div class="top-row"><div class="title">📈 Reports - Secure</div><a href="/chat" class="chat-btn">→ Chat</a></div>
    <div class="filters">
      <div class="f1"><label>Calendar</label><button class="date-btn" onclick={()=>showCalendar=!showCalendar}>{dateRange.from} / {dateRange.to}</button>{#if showCalendar}<div class="cal-pop"><input type="date" bind:value={dateRange.from} /><input type="date" bind:value={dateRange.to} /><button class="apply" onclick={()=>{showCalendar=false; loadRecords();}}>Apply</button></div>{/if}</div>
      <div class="f2"><label>Template</label><select bind:value={selectedTemplateId} onchange={loadRecords}><option value="ALL">All Reports ({templates.length})</option>{#each templates as t}<option value={t.id}>{t.name} ({t.template_code||t.t_code})</option>{/each}</select></div>
      <button class="load" onclick={loadRecords}>{loading?'...':'Load'}</button>
    </div>
    {#if error}<div class="err">{error}</div>{/if}
  </div>

  <div class="scroll-area">
    {#if records.length>0}
      <div class="table-box">
        <table>
          <thead><tr><th>Time</th><th>Template</th>{#each tableColumns as col}<th>{col.label}</th>{/each}</tr></thead>
          <tbody>{#each displayRows as r}<tr><td>{fmtTime(r.ts||r._ts)}</td><td style="font-weight:700">{r._template_name||r.t_code}</td>{#each tableColumns as col}<td>{getVal(r, col.field_name)}</td>{/each}</tr>{/each}</tbody>
        </table>
        {#if records.length>10}<div style="text-align:center;margin:6px 0;"><button class="more" onclick={()=>showMoreRows=!showMoreRows}>{showMoreRows?'▲ Less':'▼ All '+records.length}</button></div>{/if}
      </div>
      {#each analysisSets as set (set.id)}
        <div class="graph">
          <div class="g-controls">
            <span class="badge">{set.label}</span>
            <select class="inline" value={set.x} onchange={(e)=>updateX(set,(e.target as HTMLSelectElement).value)}><option value="">X</option>{#each xOptions as o}<option value={o.name}>{o.label}</option>{/each}</select>
            <select class="inline" value={set.y} onchange={(e)=>updateY(set,(e.target as HTMLSelectElement).value)}><option value="">Y</option>{#each yOptions as o}<option value={o.name}>{o.label}</option>{/each}</select>
            <select class="inline" value={set.chartType} onchange={(e)=>updateChartType(set,(e.target as HTMLSelectElement).value)}><option value="line">Line</option><option value="bar">Bar</option></select>
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

  <!-- DASHBOARD HIDDEN - 3 TABS ONLY - CHAT DEFAULT -->
  <nav class="bottom-fixed">
    <button class:active={bottomTab==='chat'} onclick={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button>
    <button class:active={bottomTab==='reports'} onclick={()=>goBottom('reports')}><span class="b-icon">📋</span><small>Report</small></button>
    <button class:active={bottomTab==='user'} onclick={()=>goBottom('user')}><span class="b-icon">👤</span><small>User</small></button>
  </nav>
</div>

<style>
.app{display:flex;flex-direction:column;height:100dvh;width:100vw;overflow:hidden;background:#f1f5f9;touch-action:pan-y;}
.top-fixed{flex:0 0 auto;background:#fff7ed;border-bottom:2px solid #fed7aa;padding:8px;z-index:30;}
.scroll-area{flex:1 1 auto;overflow-y:auto;background:white;padding:8px;}
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
table{width:100%;border-collapse:collapse;min-width:600px;}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;white-space:nowrap;}
th{background:#f8fafc;font-weight:700;}
.more{padding:4px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#f1f5f9;font-size:11px;}
.graph{border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:10px;background:#fcfdff;}
.g-controls{display:flex;gap:6px;align-items:center;overflow-x:auto;}
.badge{font-size:10px;font-weight:800;color:white;background:#2563eb;padding:6px 8px;border-radius:6px;white-space:nowrap;}
select.inline{flex:1;min-width:75px;padding:7px 6px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;background:white;}
.del{background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:6px 8px;}
.chart-wrap{height:300px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:6px;margin-top:6px;}
.chart-wrap canvas{width:100%!important;height:100%!important;}
.add{width:100%;background:white;border:1px dashed #2563eb;color:#2563eb;padding:10px;border-radius:8px;font-weight:700;margin-top:6px;}
/* HIDE DASHBOARD = 3 COLUMNS */
.bottom-fixed{flex-shrink:0;height:68px;background:#202c33;border-top:1px solid #2a3942;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;z-index:30;}
.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;color:#8696a0;cursor:pointer;flex:1;padding:6px;}
.bottom-fixed button.active{color:#00a884;}
.b-icon{font-size:20px;}
.bottom-fixed small{font-size:11px;font-weight:600;}
</style>