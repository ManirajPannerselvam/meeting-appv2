<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from '$app/environment';
  import { goto, preloadData } from '$app/navigation';
  import { supabaseTemplates, supabase as chatDB } from "$lib/supabase/client";
  import dayjs from 'dayjs';

  let templates: any[] = $state([]);
  let selectedTemplateId = $state('ALL');
  let selectedTemplate = $derived(selectedTemplateId==='ALL'? null : templates.find(t => t.id === selectedTemplateId) || null);
  let dateRange = $state({ from: '2020-01-01', to: '2030-12-31' });
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
  let currentUserId = $state('');
  let bottomTab = $state('reports');
  let subTab = $state('reports');

  function sanitizeStr(s:any, max=80){ if(typeof s!=='string') return ''; return s.replace(/[<>`$&"'=;]/g,'').trim().slice(0,max); }
  function esc(v:any){ return String(v||'').replace(/[<>]/g,'').slice(0,100); }
  let startX=0,startY=0;
  function onTouchStart(e: TouchEvent){ startX=e.touches[0].clientX; startY=e.touches[0].clientY; }
  function onTouchEnd(e: TouchEvent){ const dx=e.changedTouches[0].clientX-startX, dy=e.changedTouches[0].clientY-startY; if(Math.abs(dy)>Math.abs(dx)) return; if(Math.abs(dx)<80) return; if(dx<0) goto('/settings',{keepFocus:true}); else goto('/chat',{keepFocus:true}); }
  function fmtTime(v:any){ if(!v) return '-'; try { return dayjs(v).format('DD/MM/YY hh:mm A'); } catch { return esc(v).slice(0,16); } }
  function normalizeFields(t:any){
    if(!t) return [{field_name:'daily_tracker',label:'daily_tracker',field_type:"text",name:'daily_tracker',options:[]}];
    const raw = (t.data?.fields||t.fields||[]).slice(0,50);
    return raw.map((f:any)=>({ field_name:sanitizeStr(f.field_name??f.name,40), label:sanitizeStr(f.label??f.field_name,40), field_type:(f.field_type??f.type??"text").toString().slice(0,20), name:sanitizeStr(f.field_name??f.name,40), options:[] })).filter((f:any)=> f.field_name);
  }
  function getVal(row:any,key:string){ if(!row||!key) return ""; const k=sanitizeStr(key,40); if(!k) return ""; if(row[k]!=""&&row[k]!=null) return esc(row[k]); if(row.data?.[k]!==undefined) return esc(row.data[k]); const lk=k.toLowerCase(); for(let kk of Object.keys(row).slice(0,20)){ if(kk.toLowerCase()===lk) return esc(row[kk]); } if(row.data){ for(let kk of Object.keys(row.data).slice(0,20)){ if(kk.toLowerCase()===lk) return esc(row.data[kk]); } } return ""; }
  function getNum(row:any,key:string){ const v=getVal(row,key); const n=parseFloat(String(v).replace(/[^0-9.\-]/g,'').slice(0,15)); return isNaN(n)||!isFinite(n)?0:n; }
  function getLabel(n:string){ const f=allFields.find((f:any)=>f.field_name===n); return sanitizeStr(f?.label||n,30); }

  let allFields = $derived(normalizeFields(selectedTemplate));
  let realKeysFromRecords = $derived.by(()=>{
    if(records.length===0) return [];
    const keys=new Set<string>();
    for(let i=0;i<Math.min(records.length,20);i++){
      const r=records[i]; const dk=r.data?Object.keys(r.data):[];
      for(let k of dk){ if(keys.size>=12) break; const sk=sanitizeStr(k,40); if(!sk||sk.toLowerCase().includes('owner')) continue; keys.add(sk); }
    }
    return Array.from(keys);
  });
  let xOptions = $derived.by(()=> allFields.length>0 ? allFields.map((f:any)=>({name:f.field_name,label:f.label})) : realKeysFromRecords.map(k=>({name:k,label:k})));
  let yOptions = $derived.by(()=>{
    const nums=allFields.filter((f:any)=>f.field_type==="number");
    return nums.length>0? nums.map((f:any)=>({name:f.field_name,label:f.label})) : realKeysFromRecords.map(k=>({name:k,label:k}));
  });
  let tableColumns = $derived.by(()=>{
    let cols:any[]= records.length===0? allFields.slice(0,5) : realKeysFromRecords.length===0? allFields.slice(0,5) : realKeysFromRecords.slice(0,5).map(k=>({field_name:k,label:k.replace(/_/g,' '),field_type:"text",name:k}));
    return cols.slice(0,5);
  });

  onMount(async () => {
    if (browser) {
      try{ preloadData('/chat'); preloadData('/settings'); }catch{}
      import('chart.js/auto').then(c=> ChartJS=c.Chart);
    }
    await loadTemplates(); await loadRecords();
  });

  async function getMyId(): Promise<string>{
    if(currentUserId) return currentUserId;
    try{ const { data:{ user } } = await chatDB.auth.getUser(); if(user?.id) return user.id; }catch{}
    try{ const { data:{ session } } = await chatDB.auth.getSession(); if(session?.user?.id) return session.user.id; }catch{}
    try{ const { data:{ user } } = await supabaseTemplates.auth.getUser(); if(user?.id) return user.id; }catch{}
    try{ const { data:{ session } } = await supabaseTemplates.auth.getSession(); if(session?.user?.id) return session.user.id; }catch{}
    return '';
  }

  async function loadTemplates(){
    try{
      const myId = await getMyId(); if(myId) currentUserId=myId;
      const client = supabaseTemplates;
      let q:any = client.from('templates').select('id,name,data,created_at,owner_id').limit(100);
      if(myId) q = q.eq('owner_id', myId);
      const { data } = await q;
      let all = (data||[]).map((t:any)=>({...t, name: t.name||'Template', data: t.data||{}, fields: t.data?.fields||[] }));
      templates=all;
      if(templates.length>0 &&!analysisSets[0].x){
        const f=normalizeFields(templates[0]);
        if(f.length>0){ analysisSets[0].x=f[0].field_name; analysisSets[0].y=f[1]?.field_name||f[0].field_name; }
      }
    }catch(e:any){ error=sanitizeStr(e.message,60); }
  }

  async function loadRecords(){
    if(loading) return; loading=true; error="Loading...";
    try{
      const myId = await getMyId(); if(myId) currentUserId=myId;
      const client = supabaseTemplates;
      let query:any = client.from("records").select("id,t_code,ts,created_at,data,owner_id").order("ts",{ascending:false}).limit(200);
      if(myId) query = query.eq('owner_id', myId);
      const { data, error: dbErr } = await query;
      if(dbErr) throw dbErr;
      let allRecs = (data||[]).map((r:any)=> ({...r.data,...r, _template_name: sanitizeStr(r.data?.template_name || r.t_code || 'Report',40), _ts: r.ts||r.created_at, data: r.data||{} }));
      const from = dayjs(dateRange.from).valueOf();
      const to = dayjs(dateRange.to).add(1,'day').valueOf();
      allRecs = allRecs.filter((r:any)=> { const t=dayjs(r._ts).valueOf(); return t>=from && t<=to; });
      if(selectedTemplateId!=='ALL'){
        allRecs = allRecs.filter((r:any)=> r.t_code===selectedTemplateId || r.data?.template_id===selectedTemplateId);
      }
      records=allRecs;
      if(!myId && records.length>0){ currentUserId = (data as any)[0]?.owner_id || ''; error = `Loaded ${records.length} reports (open) - re-login for secure`; }
      else { error = `Secure: Loaded ${records.length} reports`; }
      await tick(); setTimeout(()=>renderAll(),200);
    }catch(e:any){ error=`ERR: ${sanitizeStr(e.message,80)}`; records=[]; }
    finally{ loading=false; }
  }

  async function renderAll(){
    await tick();
    if(!ChartJS || records.length===0) return;
    for(const set of analysisSets){
      const canvas = document.getElementById(`chart-${set.id}`) as HTMLCanvasElement;
      if(!canvas) continue;
      const slice = records.slice(0,100);
      const grouped: Record<string, {vals:number[]; sum:number}> = {};
      for(let row of slice){
        let xv = String(getVal(row,set.x)||'Unknown').slice(0,20);
        let yv = getNum(row,set.y);
        if(!grouped[xv]) grouped[xv]={vals:[], sum:0};
        if(grouped[xv].vals.length<100){ grouped[xv].vals.push(yv); grouped[xv].sum+=yv; }
      }
      const entries = Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,15);
      const labels = entries.map(e=>e[0]);
      const values = entries.map(e=> e[1].sum/(e[1].vals.length||1));
      const old = chartMap.get(set.id); if(old) old.destroy();
      const ctx = canvas.getContext('2d'); if(!ctx) continue;
      const colors = ['#2563eb','#00a884','#f59e0b','#ef4444','#8b5cf6'];
      const color = colors[set.id%colors.length];
      let type = sanitizeStr(set.chartType,15); if(type==='trend') type='line'; if(type==='box') type='bar';
      const isPie = ['pie','doughnut','polarArea'].includes(type);
      const chart = new ChartJS(ctx,{ type: type as any, data:{ labels: labels.length?labels:['No Data'], datasets:[{ label:getLabel(set.y), data: values.length?values:[0], borderColor: isPie ? colors : color, backgroundColor: isPie ? colors.map(c=>c+'CC') : color+'33', borderWidth:2, tension:0.3, fill: type==='line' }]}, options:{ responsive:true, maintainAspectRatio:false, animation:false, plugins:{ legend:{ display: isPie } } } });
      chartMap.set(set.id, chart);
    }
  }
  function updateX(set:any, v:string){ set.x=sanitizeStr(v,40); analysisSets=[...analysisSets]; renderAll(); }
  function updateY(set:any, v:string){ set.y=sanitizeStr(v,40); analysisSets=[...analysisSets]; renderAll(); }
  function updateChartType(set:any, v:string){ set.chartType=sanitizeStr(v,15); analysisSets=[...analysisSets]; renderAll(); }
  function addComparison(){ if(analysisSets.length>=5) return; const nid=nextId++; analysisSets=[...analysisSets,{id:nid,x:allFields[0]?.field_name||'daily_tracker',y:allFields[1]?.field_name||'enter_input',label:`Set ${nid}`,stationFilter:[],chartType:'line'}]; tick().then(()=>setTimeout(renderAll,200)); }
  function removeSet(id:any){ const c=chartMap.get(id); if(c) c.destroy(); chartMap.delete(id); analysisSets=analysisSets.filter(s=>s.id!==id); }
  function goBottom(tab:string){ const map:any = { chat:'/chat', reports:'/reports', meeting:'/minutes-dashboard', user:'/settings' }; goto(map[tab]||'/chat', {keepFocus:true, noScroll:true}); }
  function goSub(tab:string){ subTab=tab; if(tab==='reports') goto('/reports',{keepFocus:true}); else goto('/minutes-dashboard',{keepFocus:true}); }
</script>

<div class="app" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
  <div class="top-fixed">
    <div class="top-row"><div class="title">Reports ({records.length})</div><div class="right-info">{templates.length} templates</div></div>
    <div class="filters"><div class="f1"><label>Calendar</label><button class="date-btn" onclick={()=>showCalendar=!showCalendar}>{sanitizeStr(dateRange.from,10)} / {sanitizeStr(dateRange.to,10)}</button>{#if showCalendar}<div class="cal-pop"><input type="date" bind:value={dateRange.from} /><input type="date" bind:value={dateRange.to} /><button class="apply" onclick={()=>{showCalendar=false; loadRecords();}}>Apply</button></div>{/if}</div><div class="f2"><label>Template</label><select bind:value={selectedTemplateId} onchange={()=>loadRecords()}><option value="ALL">All ({templates.length})</option>{#each templates as t}<option value={t.id}>{sanitizeStr(t.name,30)}</option>{/each}</select></div><button class="load" onclick={loadRecords} disabled={loading}>{loading?'...':'Load'}</button></div>
    {#if error}<div class="err">{error}</div>{/if}
  </div>

  <div class="scroll-area">
    {#if records.length>0}
      <div class="table-box"><table><thead><tr><th>Time</th><th>Template</th>{#each tableColumns as col}<th>{sanitizeStr(col.label,20)}</th>{/each}</tr></thead><tbody>{#each displayRows as r}<tr><td>{fmtTime(r.ts||r._ts)}</td><td style="font-weight:700">{r._template_name}</td>{#each tableColumns as col}<td>{getVal(r, col.field_name)}</td>{/each}</tr>{/each}</tbody></table>{#if records.length>10}<div style="text-align:center;margin:6px 0;"><button class="more" onclick={()=>showMoreRows=!showMoreRows}>{showMoreRows?'▲ Less':'▼ All '+records.length}</button></div>{/if}</div>
      {#each analysisSets as set (set.id)}<div class="graph"><div class="g-controls"><span class="badge">{sanitizeStr(set.label,15)}</span><select class="inline" value={set.x} onchange={(e)=>updateX(set,(e.target as HTMLSelectElement).value)}><option value="">X</option>{#each xOptions as o}<option value={o.name}>{sanitizeStr(o.label,20)}</option>{/each}</select><select class="inline" value={set.y} onchange={(e)=>updateY(set,(e.target as HTMLSelectElement).value)}><option value="">Y</option>{#each yOptions as o}<option value={o.name}>{sanitizeStr(o.label,20)}</option>{/each}</select><select class="inline" value={set.chartType} onchange={(e)=>updateChartType(set,(e.target as HTMLSelectElement).value)}><option value="line">Line</option><option value="bar">Bar</option><option value="pie">Pie</option><option value="doughnut">Doughnut</option></select>{#if analysisSets.length>1}<button class="del" onclick={()=>removeSet(set.id)}>🗑️</button>{/if}</div><div class="chart-wrap"><canvas id="chart-{set.id}"></canvas></div></div>{/each}
      {#if analysisSets.length<5}<button class="add" onclick={addComparison}>Add Graph</button>{/if}
    {:else if !loading}
      <div style="text-align:center;padding:40px;color:#64748b;">No Reports - tap Load</div>
    {/if}
  </div>

  <!-- MID TABS - KEEP COLOR -->
  <div class="mid-tabs">
    <button class:active={subTab==='reports'} onclick={()=>goSub('reports')}>Reports</button>
    <button class:active={subTab==='meeting'} onclick={()=>goSub('meeting')}>Meetings</button>
  </div>

  <!-- BOTTOM NAV - LIKE CHAT SCREENSHOT PILL -->
  <nav class="bottom-fixed" aria-label="Bottom navigation">
    <button class="nav-btn" onclick={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button>
    <button class="nav-btn report-active" onclick={()=>goBottom('reports')}><span class="b-icon">📋</span><small>Reports</small></button>
    <button class="nav-btn user-btn" onclick={()=>goBottom('user')}><span class="b-icon">👤</span><small>User</small></button>
  </nav>
</div>

<style>
.app{display:flex;flex-direction:column;height:100dvh;width:100vw;overflow:hidden;background:#f1f5f9;touch-action:pan-y;}
.top-fixed{flex:0 0 auto;background:#fff7ed;border-bottom:2px solid #fed7aa;padding:8px;z-index:30;}
.scroll-area{flex:1 1 auto;overflow-y:auto;background:white;padding:8px; contain: content; padding-bottom: 12px;}
.top-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.title{font-weight:800;font-size:15px;}
.right-info{font-size:10px;color:#64748b;background:#fff;padding:3px 8px;border-radius:12px;border:1px solid #e2e8f0;}
.filters{display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap;}
.f1,.f2{display:flex;flex-direction:column;gap:2px;}
.f1 label,.f2 label{font-size:9px;font-weight:700;}
.date-btn{padding:7px 10px;border:1px solid #e7c4b0;border-radius:8px;background:white;font-size:11px;}
.f2 select{padding:7px;border-radius:8px;border:1px solid #e7c4b0;min-width:140px;font-size:12px;}
.load{background:#00a884;color:white;border:none;padding:7px 14px;border-radius:8px;font-weight:700;height:32px;}
.cal-pop{position:absolute;top:80px;left:8px;z-index:50;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;display:flex;gap:6px;}
.apply{background:#00a884;color:white;border:none;padding:6px 10px;border-radius:6px;}
.err{background:#dcfce7;color:#166534;padding:6px;border-radius:6px;font-size:11px;margin-top:6px;border:1px solid #bbf7d0;}
.table-box{border:1px solid #e5e7eb;border-radius:8px;overflow-x:auto;margin-bottom:10px;}
table{width:100%;border-collapse:collapse;min-width:400px;}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;white-space:nowrap;}
th{background:#f8fafc;font-weight:700;}
.more{padding:4px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#f1f5f9;font-size:11px;}
.graph{border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:10px;background:#fcfdff;}
.g-controls{display:flex;gap:6px;align-items:center;overflow-x:auto;}
.badge{font-size:10px;font-weight:800;color:white;background:#2563eb;padding:6px 8px;border-radius:6px;white-space:nowrap;}
select.inline{flex:1;min-width:60px;padding:7px 6px;border-radius:6px;border:1px solid #cbd5e1;font-size:11px;background:white;}
.del{background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:6px 8px;}
.chart-wrap{height:240px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:6px;margin-top:6px;}
.chart-wrap canvas{width:100%!important;height:100%!important;}
.add{width:100%;background:white;border:1px dashed #2563eb;color:#2563eb;padding:10px;border-radius:8px;font-weight:700;margin-top:6px;}

/* KEEP REPORT COLOR - MID TABS */
.mid-tabs{flex:0 0 auto; display:flex; gap:8px; padding:8px 12px; background:#f8fafc; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; justify-content:center;}
.mid-tabs button{flex:1; max-width:160px; padding:8px 12px; border-radius:20px; border:1px solid #cbd5e1; background:white; font-size:12px; font-weight:700; color:#475569;}
.mid-tabs button.active{background:#0ea5e9; color:white; border-color:#0ea5e9;}

/* BOTTOM NAV - SAME AS CHAT SCREENSHOT PILL - REPORT ACTIVE BLUE */
.bottom-fixed{flex-shrink:0;height:64px;min-height:64px;background:#0a0f12;display:flex;align-items:center;justify-content:space-between;z-index:30;padding:6px 8px;gap:8px;border-top:3px solid #0ea5e9;}
.bottom-fixed .nav-btn{flex:1;height:50px;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:16px;transition:.18s;font-weight:800;background:transparent;color:#7a8a96;}
.bottom-fixed .nav-btn .b-icon{font-size:18px;line-height:1;}
.bottom-fixed .nav-btn small{font-size:10px;letter-spacing:.2px;font-weight:800;}
.bottom-fixed .nav-btn.report-active{background:#e3f2fd!important;color:#0284c7!important;flex:1.4;box-shadow:0 0 0 2px rgba(14,165,233,.15) inset;}
.bottom-fixed .nav-btn.user-btn{color:#6b5a8a;}
</style>