<script lang="ts">
  import { onMount, tick } from "svelte";
  import { browser } from '$app/environment';
  import { supabaseTemplates } from "$lib/supabase";
  import dayjs from 'dayjs';

  let templates: any[] = $state([]);
  let selectedTemplateId = $state('');
  let selectedTemplate = $derived(templates.find(t => t.id === selectedTemplateId) || null);
  let dateRange = $state({ from: '2026-07-28', to: '2026-08-27' });
  let showCalendar = $state(false);
  let records: any[] = $state([]);
  let loading = $state(false);
  let error = $state("");
  let showMoreRows = $state(false);
  let displayRows = $derived(showMoreRows? records : records.slice(0,3));
  let ChartJS: any = null;
  let chartMap: Map<any, any> = new Map();
  let nextId = $state(2);
  let analysisSets: any[] = $state([{id:1, x:'station', y:'input01', label:'Set 1', stationFilter: [] as string[], chartType:'line'}]);
  let currentUser = $state<any>(null);
  let bottomTab = $state('report');

  let allFields = $derived(normalizeFields(selectedTemplate));
  let availableStations = $derived(allFields.find((f:any) => (f.field_name||f.name).toLowerCase() === 'station')?.options || []);
  let numericFields = $derived(allFields.filter((f:any) => f.field_name.toLowerCase().includes('input') || f.field_name.toLowerCase().includes('output') || f.field_type==="number"));
  let xOptions = $derived([{name:'station', label:'Station'}, {name:'shift', label:'Shift'}, {name:'ts', label:'Time'},...allFields.map((f:any)=>({name:f.field_name, label:f.label}))]);
  let yOptions = $derived(numericFields.length>0? numericFields.map((f:any)=>({name:f.field_name, label:f.label})) : [{name:'input01', label:'input01'}, {name:'output01', label:'output01'}]);

  function normalizeFields(t:any){ if(!t) return []; return (t.data?.fields||[]).map((f:any)=>({field_name:f.field_name??f.name??f._key,label:f.label??f.field_name??f.name,field_type:f.field_type??f.type,name:f.field_name??f.name,options: typeof f.options==="string"? JSON.parse(f.options||"[]") : f.options||[]})) }
  function getLabel(n:string){ const f=allFields.find((f:any)=>f.field_name===n); return f?.label||n; }
  function getVal(row:any,key:string){ if(!row||!key) return ""; if(row[key]!==undefined&&row[key]!==""&&row[key]!==null) return row[key]; if(row.data?.[key]!==undefined) return row.data[key]; const lk=key.toLowerCase(); for(let k of Object.keys(row)){ if(k.toLowerCase()===lk) return row[k]; } if(row.data){ const found=Object.keys(row.data).find(k=>k.toLowerCase()===lk||k.toLowerCase().includes(lk)); if(found) return row.data[found]; } return ""; }
  function getNum(row:any,key:string){ const v=getVal(row,key); const n=parseFloat(String(v)); return isNaN(n)?0:n; }

  onMount(async () => {
    if (browser) {
      const c = await import('chart.js/auto'); ChartJS=c.Chart;
      try{ const { supabase } = await import('$lib/supabase'); const { data: { user } } = await supabase.auth.getUser(); if(user) currentUser=user; }catch{}
    }
    const { data } = await supabaseTemplates.from('templates').select('*').order('name');
    templates = data||[];
    if(templates.length>0){
      const prod = templates.find(t=>t.name.toLowerCase().includes('production')) || templates[0];
      selectedTemplateId=prod.id;
      const inp = normalizeFields(prod).find((f:any)=>f.field_name.toLowerCase().includes('input'));
      if(inp) analysisSets[0].y = inp.field_name;
    }
    loadRecords();
  });

  async function loadRecords(){
    if(!selectedTemplate) return;
    loading=true; error="";
    try{
      const t_code = selectedTemplate?.template_code?.trim();
      let q = supabaseTemplates.from("records").select("*").eq("t_code", t_code).gte("ts", dayjs(dateRange.from).startOf("day").toISOString()).lte("ts", dayjs(dateRange.to).endOf("day").toISOString()).order("ts",{ascending:true}).limit(2000);
      const { data, error: dErr } = await q;
      if(dErr) throw dErr;
      if(!data || data.length===0){ error=`No records`; records=[]; return; }
      records=data.map((r:any)=> ({...r,...(r.data||{})}));
      await tick(); setTimeout(()=>{ renderAll(); }, 600);
    }catch(e:any){ error=e.message; } finally{ loading=false; }
  }

  async function renderAll(){
    await tick();
    if(!ChartJS || records.length===0) return;
    for(const set of analysisSets){
      const canvas = document.getElementById(`chart-${set.id}`) as HTMLCanvasElement;
      if(!canvas) continue;
      let filtered = records;
      if(set.stationFilter?.length>0) filtered = records.filter(r=> set.stationFilter.includes(String(getVal(r,'station')||'').trim()));
      const grouped: Record<string, {vals:number[], ts:number}> = {};
      filtered.forEach(row=>{
        let xv = set.x==='ts'? dayjs(row.ts).format('MM/DD HH:mm') : String(getVal(row,set.x)||'Unknown').trim();
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
      const chart = new ChartJS(ctx,{ type: set.chartType==='trend'?'line':set.chartType, data:{ labels: labels.length?labels:['No Data'], datasets:[{ label:`${getLabel(set.y)}`, data: values.length?values:[0], borderColor:color, backgroundColor:color+'33', borderWidth:3, tension:0.4, fill:true, pointRadius:5 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true}, title:{display:true, text:`${set.label} → X:${getLabel(set.x)} | Y:${getLabel(set.y)} | [${set.stationFilter.join(',')||'All'}] (${filtered.length})`} }, scales:{ x:{title:{display:true, text:`X: ${getLabel(set.x)}`}}, y:{title:{display:true, text:`Y: ${getLabel(set.y)}`}, beginAtZero:true} } } });
      chartMap.set(set.id, chart);
    }
  }
  function updateX(set:any, v:string){ set.x=v; analysisSets=[...analysisSets]; renderAll(); }
  function updateY(set:any, v:string){ set.y=v; analysisSets=[...analysisSets]; renderAll(); }
  function updateChartType(set:any, v:string){ set.chartType=v; analysisSets=[...analysisSets]; renderAll(); }
  function addStationFilter(set:any, v:string){ if(v&&!set.stationFilter.includes(v)){ set.stationFilter=[...set.stationFilter,v]; analysisSets=[...analysisSets]; renderAll(); } }
  function removeStationFilter(set:any, sf:string){ set.stationFilter=set.stationFilter.filter((s:string)=>s!==sf); analysisSets=[...analysisSets]; renderAll(); }
  async function addComparison(){ if(analysisSets.length>=5) return; const nid=nextId++; analysisSets=[...analysisSets,{id:nid,x:'station',y:'input01',label:`Set ${nid}`,stationFilter:[] as string[],chartType:'line'}]; await tick(); setTimeout(renderAll,400); }
  function removeSet(id:any){ const c=chartMap.get(id); if(c) c.destroy(); chartMap.delete(id); analysisSets=analysisSets.filter(s=>s.id!==id); }
  function goBottom(tab:string){
    bottomTab=tab;
    if(tab==='dashboard' && browser) window.location.href='/';
    if(tab==='chat' && browser) window.location.href='/chat';
    if(tab==='report' && browser) window.location.href='/report';
    if(tab==='user' && browser) window.location.href='/profile';
  }
</script>

<div class="app">
  <div class="top-fixed">
    <div class="top-row"><div class="title">📈 Report</div><a href="/chat" class="chat-btn">→ Chat</a></div>
    <div class="filters">
      <div class="f1"><label>Calendar</label><button class="date-btn" onclick={()=>showCalendar=!showCalendar}>{dateRange.from} / {dateRange.to}</button>{#if showCalendar}<div class="cal-pop"><input type="date" bind:value={dateRange.from} /><input type="date" bind:value={dateRange.to} /><button class="apply" onclick={()=>{showCalendar=false; loadRecords();}}>Apply</button></div>{/if}</div>
      <div class="f2"><label>Template</label><select bind:value={selectedTemplateId} onchange={loadRecords}>{#each templates as t}<option value={t.id}>{t.name}</option>{/each}</select></div>
      <button class="load" onclick={loadRecords}>{loading?'...':'Load'}</button>
    </div>
    {#if error}<div class="err">{error}</div>{/if}
  </div>

  <div class="scroll-area">
    {#if records.length>0}
      <div class="table-box"><table><thead><tr><th>Time</th><th>Shift</th><th>Station</th><th>input01</th><th>output01</th><th>remark</th></tr></thead><tbody>{#each displayRows as r}<tr><td>{dayjs(r.ts).format('MM/DD HH:mm')}</td><td>{getVal(r,'shift')}</td><td>{getVal(r,'station')}</td><td style="color:#2563eb;font-weight:700;background:#eff6ff">{getVal(r,'input01')}</td><td style="color:#00a884;font-weight:700;background:#f0fdf4">{getVal(r,'output01')}</td><td>{getVal(r,'remark01')}</td></tr>{/each}</tbody></table>
        {#if records.length>3}<div style="text-align:center;margin:6px 0;"><button class="more" onclick={()=>showMoreRows=!showMoreRows}>{showMoreRows?'▲ Less':'▼ All '+records.length}</button></div>{/if}
      </div>
      {#each analysisSets as set, i (set.id)}
        <div class="graph">
          <div class="g-controls">
            <span class="badge">{set.label} ({i+1}/{analysisSets.length})</span>
            <select class="inline" value={set.x} onchange={(e)=>updateX(set,(e.target as HTMLSelectElement).value)}>{#each xOptions as o}<option value={o.name}>{o.label}</option>{/each}</select>
            <select class="inline" value={set.y} onchange={(e)=>updateY(set,(e.target as HTMLSelectElement).value)}>{#each yOptions as o}<option value={o.name}>{o.label}</option>{/each}</select>
            <select class="inline" value={set.chartType} onchange={(e)=>updateChartType(set,(e.target as HTMLSelectElement).value)}><option value="line">Line</option><option value="bar">Bar</option><option value="trend">Trend</option></select>
            <select class="inline" onchange={(e)=>{ addStationFilter(set,(e.target as HTMLSelectElement).value); (e.target as HTMLSelectElement).value='';}}><option value="">All</option>{#each availableStations as st}<option value={st}>{st}</option>{/each}</select>
            {#if analysisSets.length>1}<button class="del" onclick={()=>removeSet(set.id)}>🗑️</button>{/if}
          </div>
          {#if set.stationFilter.length>0}<div class="f-chips">{#each set.stationFilter as sf}<span>{sf}<button onclick={()=>removeStationFilter(set,sf)}>x</button></span>{/each}</div>{/if}
          <div class="chart-wrap"><canvas id="chart-{set.id}"></canvas></div>
        </div>
      {/each}
      {#if analysisSets.length<5}<button class="add" onclick={addComparison}>+ Add Graph ({analysisSets.length}/5)</button>{:else}<div class="max">✅ Max 5 reached</div>{/if}
    {/if}
  </div>

  <!-- SAME AS CHAT BOTTOM FIXED -->
  <nav class="bottom-fixed">
    <button class:active={bottomTab==='dashboard'} onclick={()=>goBottom('dashboard')}>
      <span class="b-icon">📊</span><small>Dashboard</small>
    </button>
    <button class:active={bottomTab==='chat'} onclick={()=>goBottom('chat')}>
      <span class="b-icon">💬</span><small>Chat</small>
    </button>
    <button class:active={bottomTab==='report'} onclick={()=>goBottom('report')}>
      <span class="b-icon">📋</span><small>Report</small>
    </button>
    <button class:active={bottomTab==='user'} onclick={()=>goBottom('user')}>
      {#if currentUser?.user_metadata?.avatar_url}<img src={currentUser.user_metadata.avatar_url} class="b-avatar" alt="me" />{:else}<span class="b-icon">👤</span>{/if}
      <small>User</small>
    </button>
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
table{width:100%;border-collapse:collapse;min-width:600px;}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px;white-space:nowrap;}
th{background:#f8fafc;font-weight:700;}
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

/* SAME AS CHAT - BOTTOM FIXED */
.bottom-fixed{flex-shrink:0;height:68px;min-height:68px;background:#202c33;border-top:1px solid #2a3942;display:flex;justify-content:space-around;align-items:center;z-index:30;padding-bottom:env(safe-area-inset-bottom);}
.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;color:#8696a0;cursor:pointer;flex:1;padding:6px;}
.bottom-fixed button.active{color:#00a884;}
.b-icon{font-size:20px;line-height:1;}
.b-avatar{width:26px;height:26px;border-radius:50%;object-fit:cover;border:2px solid #00a884;}
.bottom-fixed small{font-size:11px;font-weight:600;}

/* MOBILE ONLY - Calendar & Template same size + 26 size reduce */
@media (max-width:768px){
  .filters{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
    align-items:end;
  }
  .f1,.f2{
    width:100%;
    min-width:0;
  }
  .date-btn,.f2 select{
    width:100%;
    min-width:0;
    height:38px;
    font-size:12px;
  }
  .load{
    grid-column:1 / -1;
    width:100%;
    height:36px;
    margin-top:2px;
  }
  .more{
    padding:3px 10px !important;
    font-size:10px !important;
    height:26px !important;
    min-height:26px !important;
    line-height:1;
  }
  .g-controls{gap:4px;}
  .badge{font-size:9px !important;padding:4px 6px !important;height:28px;display:flex;align-items:center;}
  select.inline{height:28px !important;font-size:11px !important;padding:3px 4px !important;min-width:58px !important;}
  .del{height:28px !important;padding:3px 6px !important;font-size:11px !important;}
  .chart-wrap{height:260px;}
  .add{height:36px;padding:6px;font-size:12px;}
}
</style>