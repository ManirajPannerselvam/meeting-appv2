<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { authUserName, authUserId, getTemplateOwner } from "$lib/stores/auth";
  import { supabaseTemplates } from "$lib/supabase";

  function uuid(){ return Math.random().toString(36).substring(2,9); }
  function sanitizeText(v:string){ return v.replace(/[<>"'`;]/g,"").trim().slice(0,60); }
  function sanitizeCode(v:string){ return v.toUpperCase().replace(/[^A-Z0-9-_]/g,"").slice(0,20); }
  function sanitizeFieldName(v:string){ return v.toLowerCase().replace(/[^a-z0-9_]+/g,"_").slice(0,40); }
  function isValidUUID(u:string){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u); }

  type FieldType = "text" | "number" | "dropdown" | "time" | "formula";
  type FieldDef = { id:string, label:string, icon:string, type:FieldType, color:string, border:string, required?:boolean, metric?:string, options?:string[] };

  let allFields: FieldDef[] = [
    { id:uuid(), label:"time", icon:"⏰", type:"time", color:"#10b981", border:"#10b981" },
    { id:uuid(), label:"text", icon:"📝", type:"text", color:"#3b82f6", border:"#3b82f6" },
    { id:uuid(), label:"Drop-down", icon:"▼", type:"dropdown", color:"#f59e0b", border:"#111827", options:["A","B","C"] },
    { id:uuid(), label:"number", icon:"#️⃣", type:"number", color:"#2563eb", border:"#2563eb" },
    { id:uuid(), label:"Shift", icon:"🌙", type:"dropdown", color:"#f59e0b", border:"#f59e0b", required:true, options:["A","B","C"], metric:"shift" },
    { id:uuid(), label:"Station", icon:"🏭", type:"dropdown", color:"#92400e", border:"#92400e", required:true, options:["RAT","AotA"], metric:"station" },
    { id:uuid(), label:"Input", icon:"📥", type:"number", color:"#2563eb", border:"#2563eb", metric:"input" },
    { id:uuid(), label:"Output", icon:"📤", type:"number", color:"#2563eb", border:"#2563eb", metric:"output" },
    { id:uuid(), label:"RetestQty", icon:"🔁", type:"number", color:"#2563eb", border:"#f59e0b", metric:"retest" },
    { id:uuid(), label:"Formula", icon:"⚡", type:"formula", color:"#16a34a", border:"#16a34a" },
  ];

  const themes = [
    { id:"emerald", name:"Emerald Pro", color:"#10b981", light:"#ecfdf5", dark:"#065f46" },
    { id:"ocean", name:"Ocean Blue", color:"#0ea5e9", light:"#e0f2fe", dark:"#0c4a6e" },
    { id:"sunset", name:"Sunset Amber", color:"#f59e0b", light:"#fffbeb", dark:"#78350f" },
    { id:"slate", name:"Slate Corporate", color:"#334155", light:"#f1f5f9", dark:"#0f172a" },
    { id:"royal", name:"Royal Purple", color:"#8b5cf6", light:"#ede9fe", dark:"#4c1d95" },
    { id:"ruby", name:"Ruby Red", color:"#ef4444", light:"#fef2f2", dark:"#7f1d1d" },
    { id:"teal", name:"Teal Medical", color:"#14b8a6", light:"#ccfbf1", dark:"#134e4a" },
    { id:"indigo", name:"Indigo Night", color:"#6366f1", light:"#e0e7ff", dark:"#312e81" },
    { id:"forest", name:"Forest Dark", color:"#16a34a", light:"#dcfce7", dark:"#052e16" },
    { id:"charcoal", name:"Charcoal Elite", color:"#111827", light:"#ffffff", dark:"#000000" },
  ];
  let selectedTheme = themes[1];
  let creatingTime = new Date();

  let templateName=""; let templateCode=""; let category="Production";
  let cols=38; let rows=22; let gap=14;
  type Placed = { id:string, defId:string, label:string, field_name:string, type:FieldType, metric?:string, options:string[], formula:string, x:number, y:number, w:number, h:number, color:string, border:string, required?:boolean };
  let placed: Placed[] = [
    { id:uuid(), defId:"", label:"Daily Tracker", field_name:"daily_tracker", type:"text", options:[], formula:"", x:1, y:0, w:4.5, h:2.2, color:"#3b82f6", border:"#3b82f6" },
    { id:uuid(), defId:"", label:"Enter input", field_name:"enter_input", type:"number", metric:"input", options:[], formula:"", x:1, y:3, w:4.5, h:2.2, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Enter Output", field_name:"enter_output", type:"number", metric:"output", options:[], formula:"", x:1, y:6, w:4.5, h:2.2, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Formula", field_name:"formula", type:"formula", options:[], formula:"{enter_output} ÷ {enter_input} × 100", x:1, y:9, w:4.5, h:2.2, color:"#16a34a", border:"#f59e0b" },
    { id:uuid(), defId:"", label:"number", field_name:"number_a4v", type:"number", options:[], formula:"", x:7, y:0, w:4.5, h:2.2, color:"#111827", border:"#111827" },
  ];
  let drag:Placed|null=null; let dragOff={x:0,y:0}; let selectedId=placed[3].id;
  let isDragging=false; let startPt={x:0,y:0};
  $: selected = placed.find(p=>p.id===selectedId);
  $: numberFields = placed.filter(p=>p.metric || p.type==='number' || p.type==='dropdown');
  $: isValid = templateName.trim().length >=2 && templateCode.trim().length >=2;
  let editFormula = "{enter_output} ÷ {enter_input} × 100";
  let savedCount = 0; let isDirty = true; let toast = ""; let showSavedPopup = false; let savedTemplates: any[] = [];
  let newOptionText = "";

  onMount(async ()=>{
    creatingTime = new Date(); setInterval(()=> creatingTime = new Date(), 1000);
    try{ const s=localStorage.getItem("template_theme_id"); if(s && /^[a-z]+$/.test(s)){ const f=themes.find(t=>t.id===s); if(f) selectedTheme=f; } }catch{}
    loadSaved();
  });
  function loadSaved(){ try{ let t=JSON.parse(localStorage.getItem("templates")||"[]"); savedTemplates = Array.isArray(t)? t.slice(0,100):[]; savedCount=t.length; }catch{ savedCount=0; } }

  function quickAdd(def:FieldDef){
    const w=4.5; const h=2.2;
    const x=(placed.length*5)%(cols-w); const y=(placed.length*3)%(rows-h);
    placed=[...placed, { id:uuid(), defId:def.id, label:sanitizeText(def.label), field_name:sanitizeFieldName(def.label)+"_"+uuid().slice(0,3), type:def.type, metric:def.metric, options:[...(def.options||[])].map(s=>sanitizeText(s)), formula:def.type==='formula'? "{enter_output} ÷ {enter_input} × 100" : "", x, y, w, h, color:def.color, border:def.border, required:def.required }];
    selectedId=placed[placed.length-1].id; if(placed[placed.length-1].type==='formula') editFormula=placed[placed.length-1].formula; isDirty=true;
  }

  let boardEl: HTMLDivElement;
  
  function startDrag(e: PointerEvent, p:Placed){
    if((e.target as HTMLElement).closest('.x')) return;
    e.stopPropagation();
    selectedId=p.id; editFormula=p.formula||"";
    const b=boardEl.getBoundingClientRect();
    startPt={x:e.clientX, y:e.clientY};
    dragOff.x=e.clientX-b.left-p.x*gap;
    dragOff.y=e.clientY-b.top-p.y*gap;
    drag=p; isDragging=false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent){
    if(!drag) return;
    const dx=Math.abs(e.clientX-startPt.x);
    const dy=Math.abs(e.clientY-startPt.y);
    if(!isDragging && dx<4 && dy<4) return;
    isDragging=true;
    const b=boardEl.getBoundingClientRect();
    let nx=Math.round((e.clientX-b.left-dragOff.x)/gap);
    let ny=Math.round((e.clientY-b.top-dragOff.y)/gap);
    nx=Math.max(0,Math.min(cols-drag.w,nx));
    ny=Math.max(0,Math.min(rows-drag.h,ny));
    placed=placed.map(pl=> pl.id===drag!.id? {...pl, x:nx, y:ny}:pl);
    isDirty=true;
  }
  function onPointerUp(e: PointerEvent){
    try{ (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); }catch{}
    setTimeout(()=>{ isDragging=false; }, 80);
    drag=null;
  }
  function onTouchStart(e: TouchEvent, p:Placed){
    if((e.target as HTMLElement).closest('.x')) return;
    const t=e.touches[0];
    startPt={x:t.clientX, y:t.clientY};
    const b=boardEl.getBoundingClientRect();
    dragOff.x=t.clientX-b.left-p.x*gap;
    dragOff.y=t.clientY-b.top-p.y*gap;
    drag=p; isDragging=false; selectedId=p.id;
  }
  function onTouchMove(e: TouchEvent){
    if(!drag) return;
    const t=e.touches[0];
    const dx=Math.abs(t.clientX-startPt.x);
    const dy=Math.abs(t.clientY-startPt.y);
    if(!isDragging && dx<10 && dy<10) return;
    isDragging=true;
    e.preventDefault();
    const b=boardEl.getBoundingClientRect();
    let nx=Math.round((t.clientX-b.left-dragOff.x)/gap);
    let ny=Math.round((t.clientY-b.top-dragOff.y)/gap);
    nx=Math.max(0,Math.min(cols-drag.w,nx));
    ny=Math.max(0,Math.min(rows-drag.h,ny));
    placed=placed.map(pl=> pl.id===drag!.id? {...pl, x:nx, y:ny}:pl);
    isDirty=true;
  }
  function onTouchEnd(){ drag=null; setTimeout(()=>{isDragging=false;},80); }

  function insertOp(t:string){ if(!/^[\(\)\+\-×÷%0-9\s]+$/.test(t)) return; editFormula+= (editFormula?" ":"") + t + " "; saveFormula(); }
  function insertField(fn:string){ let safe=sanitizeFieldName(fn); editFormula+= `{${safe}} `; if(selected){ selected.formula=editFormula.slice(0,200); placed=[...placed]; } isDirty=true; }
  function saveFormula(){ if(selected){ selected.formula=editFormula.replace(/[^a-z0-9_{}\s\+\-\*\/\(\)÷×%\.\s]/gi,"").slice(0,200); placed=[...placed]; } isDirty=true; }
  function updateSelectedLabel(val:string){ if(!selected) return; let s=sanitizeText(val); if(!s) return; selected.label=s; selected.field_name=sanitizeFieldName(s); placed=[...placed]; isDirty=true; }
  function updateOption(idx:number, val:string){ if(!selected) return; let s=sanitizeText(val); selected.options[idx]=s; placed=[...placed]; isDirty=true; }
  function addOption(){ if(!selected) return; let v=sanitizeText(newOptionText); if(!v) return; selected.options=[...(selected.options||[]), v]; placed=[...placed]; newOptionText=""; isDirty=true; }
  function removeOption(idx:number){ if(!selected) return; selected.options=(selected.options||[]).filter((_,i)=>i!==idx); placed=[...placed]; isDirty=true; }
  function deleteField(id:string){ placed=placed.filter(x=>x.id!==id); isDirty=true; }

  async function saveTemplate(){
    let cleanName=sanitizeText(templateName);
    let cleanCode=sanitizeCode(templateCode);
    if(!cleanName || cleanName.length < 2){ toast="❌ Enter Template Name *"; setTimeout(()=>toast="",2500); return; }
    if(!cleanCode || cleanCode.length < 2){ toast="❌ Enter Template Code *"; setTimeout(()=>toast="",2500); return; }
    templateName=cleanName; templateCode=cleanCode;
    let all:any[]=[]; try{ all=JSON.parse(localStorage.getItem("templates")||"[]"); }catch{ all=[]; }
    let owner=getTemplateOwner(); let realIdStr=owner.owner_id; let realEmail=sanitizeText(owner.owner_name||owner.owner_email||"user"); let realUUID:string|null=null;
    try{ const { data:{user} }=await supabaseTemplates.auth.getUser(); if(user){ realEmail=sanitizeText(user.email||user.id); realIdStr=user.email||user.id; if(isValidUUID(user.id)) realUUID=user.id; } }catch{}
    const newId=crypto.randomUUID();
    const normalized=placed.map(p=>({ ...p, label:sanitizeText(p.label), field_name:sanitizeFieldName(p.field_name||p.label), name:sanitizeFieldName(p.field_name||p.label), formula:(p.formula||"").slice(0,200) }));
    let obj={ id:newId, name:cleanName, code:cleanCode, template_code:cleanCode, t_code:cleanCode, category:sanitizeText(category), theme:selectedTheme.id, theme_color:selectedTheme.color, fields:normalized, data:{fields:normalized}, owner_id:realIdStr, owner_name:realEmail, createdAt:new Date().toISOString() };
    all=[obj,...all].slice(0,100); localStorage.setItem("templates",JSON.stringify(all)); localStorage.setItem("template_theme_id",selectedTheme.id);
    savedTemplates=all; savedCount=all.length; isDirty=false;
    try{ const baseData={ fields:normalized, department:sanitizeText(category), owner_id:realIdStr, owner_name:realEmail, theme:selectedTheme.id, theme_color:selectedTheme.color, code:cleanCode, t_code:cleanCode };
      let payload:any={ id:newId, name:cleanName, template_code:cleanCode, data:baseData }; if(realUUID) payload.owner_id=realUUID;
      let {error}=await supabaseTemplates.from('templates').insert(payload); if(error){ delete payload.owner_id; await supabaseTemplates.from('templates').insert(payload); }
      toast=`✅ Saved ${cleanCode} 🔒`;
    }catch(e:any){ toast=`Saved locally`; }
    setTimeout(()=>toast="",2500); showSavedPopup=true;
  }
  function handleBack(){ if(isDirty && !confirm("Not Saved! Leave?")) return; history.back(); }
  function pickTheme(t:any){ if(!t||!/^[a-z]+$/.test(t.id)) return; selectedTheme=t; localStorage.setItem("template_theme_id",t.id); isDirty=true; }
</script>

<div class="top-fixed two-line">
  <div class="top-line line1">
    <div class="tl1">
      <button class="back" on:click={handleBack}>←</button>
      {#if isDirty}<span class="dirty">● Not Saved</span>{:else}<span class="saved">✓ Saved</span>{/if}
    </div>
    <div class="tr1">
      <span class="count-badge">Saved: {savedCount} ▼</span>
      <button class="preview-btn">💬 Chat</button>
      <button class="save" style="background:{selectedTheme.color}; opacity:{isValid?1:0.5}" disabled={!isValid} on:click={saveTemplate}>{isValid? 'Save to DB' : 'Enter Name/Code *'}</button>
    </div>
  </div>
  <div class="top-line line2">
    <div class="t-inputs-2">
      <div class="t-field"><label class="required">Template</label><input bind:value={templateName} maxlength="20" placeholder="Enter Name" class:invalid={!templateName.trim()} /></div>
      <div class="t-field"><label class="required">Code</label><input bind:value={templateCode} maxlength="20" class="code-in" placeholder="PROD-01" class:invalid={!templateCode.trim()} /></div>
      <div class="t-field"><label>Category</label><select bind:value={category}><option>Production</option><option>Quality</option><option>Maintenance</option></select></div>
      <div class="t-field">
        <label>Theme</label>
        <select value={selectedTheme.id} on:change={(e)=>{ const v=(e.target as HTMLSelectElement).value; const th=themes.find(t=>t.id===v); if(th) pickTheme(th); }}>
          {#each themes as th}<option value={th.id}>{th.name}</option>{/each}
        </select>
      </div>
    </div>
  </div>
  {#if toast}<div class="toast">{toast}</div>{/if}
</div>

<div class="layout two-top">
  <div class="left">
    <div class="search-box"><span>🔍</span><input placeholder="Search" maxlength="30" /></div>
    <div class="field-grid single-col">
      {#each allFields as f}
        <button class="field-row vertical" style="border-left:3px solid {f.border};" on:click={()=>quickAdd(f)}>
          <span class="f-icon">{f.icon}</span>
          <span class="f-label-down">{f.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="center">
    <div class="board-wrap" style="border-color:{selectedTheme.color}">
      <div class="board-scroll">
        <div bind:this={boardEl} id="board" class="board" style="height:{rows*gap+16}px; width:{cols*gap+24}px;">
          {#each Array(rows) as _,r}{#each Array(cols) as _,c}<div class="dot" style="left:{c*gap+12}px; top:{r*gap+12}px;"></div>{/each}{/each}
          {#each placed as p}
            <div class="mod reduced" class:active={selectedId===p.id}
              style="left:{p.x*gap+8}px; top:{p.y*gap+8}px; width:{p.w*gap}px; height:{p.h*gap}px; border-color:{p.border}; color:{p.color};"
              on:pointerdown={(e)=>startDrag(e,p)}
              on:pointermove={onPointerMove}
              on:pointerup={onPointerUp}
              on:touchstart|nonpassive={(e)=>onTouchStart(e,p)}
              on:touchmove|nonpassive={onTouchMove}
              on:touchend={onTouchEnd}
              on:click={()=>{ if(!isDragging){selectedId=p.id; editFormula=p.formula;}}}>
              <span class="mod-label">{p.label}</span>
              <button class="x" on:click|stopPropagation={()=>deleteField(p.id)}>✕</button>
            </div>
          {/each}
        </div>
      </div>
      <div class="creating-info" style="background:{selectedTheme.light}; border-top:1px solid {selectedTheme.color}"><b>📅 {creatingTime.toLocaleString()}</b><span style="color:{selectedTheme.color}; font-weight:800;">{selectedTheme.color}</span></div>
    </div>

    <div class="preview-wrap linked onebyone" style="border-color:{selectedTheme.color}">
      <div class="preview-head">◉ Preview - {selectedTheme.name}</div>
      <div class="preview-white">
        {#each placed as p (p.id)}
          <div class="p-preview-item" style="border-left:3px solid {p.border}">
            <b class="p-l">{p.label}</b>
            {#if p.type==='dropdown'}
              <select class="p-input"><option>Select {p.label}</option>{#each p.options as opt}<option>{opt}</option>{/each}</select>
            {:else if p.type!=='formula'}
              <input class="p-input" placeholder="Enter {p.label}" value={p.type==='number'?'0':''} maxlength="20" />
            {:else}
              <div class="p-formula" style="background:{selectedTheme.light}; border:1px solid {selectedTheme.color};">{p.formula || "⚡ Auto Calculated"}</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="right">
    {#if selected}
      <div class="edit-box" style="border-color:{selectedTheme.color}">
        <div class="edit-head"><b>✏️ {selected.label}</b><small>{selected.type} {selected.metric?`• ${selected.metric}`:''}</small></div>
        <label>Label</label><input class="edit-in" value={selected.label} on:input={(e)=>updateSelectedLabel(e.currentTarget.value)} maxlength="60" />
        {#if selected.type==='dropdown'}
          <label style="margin-top:8px;">Options - Drop-down Values</label>
          <div class="options-list">
            {#each selected.options as opt, i}
              <div class="opt-row">
                <span class="opt-index">{i+1}.</span>
                <input class="opt-in" value={opt} on:input={(e)=>updateOption(i, (e.target as HTMLInputElement).value)} maxlength="20" placeholder="A,B,C" />
                <button class="opt-del" on:click={()=>removeOption(i)}>✕</button>
              </div>
            {/each}
            {#if !selected.options || selected.options.length===0}
              <div class="no-opt">No options - add below (sample A,B,C)</div>
            {/if}
          </div>
          <div class="opt-add-row">
            <input class="opt-add-in" bind:value={newOptionText} maxlength="20" placeholder="New option e.g. Night" on:keydown={(e)=>{ if(e.key==='Enter') addOption(); }} />
            <button class="opt-add-btn" style="background:{selectedTheme.color}" on:click={addOption}>+ Add Option</button>
          </div>
          <div class="opt-hint">User can add unlimited options. Press Enter to add quickly.</div>
        {/if}
        {#if selected.metric}
          <label style="margin-top:6px;">Metric</label>
          <input class="edit-in" value={selected.metric} disabled />
        {/if}
      </div>
    {/if}
    <div class="formula-builder" style="border-color:{selectedTheme.color}; background:{selectedTheme.light}">
      <div class="fb-head"><b>Formula - {selectedTheme.name}</b></div>
      <textarea bind:value={editFormula} on:input={saveFormula} rows="4" class="fb-ta" maxlength="200" placeholder="Select fields"></textarea>
      <div class="fb-ops all-sym three-rows">
        <button on:click={()=>insertOp("(")}>(</button>
        <button on:click={()=>insertOp(")")}>)</button>
        <button on:click={()=>insertOp("+")}>+</button>
        <button on:click={()=>insertOp("-")}>−</button>
        <button on:click={()=>insertOp("×")}>×</button>
        <button on:click={()=>insertOp("÷")}>÷</button>
        <button on:click={()=>insertOp("%")}>%</button>
        <button class="span-2" on:click={()=>insertOp("100")}>100</button>
      </div>
      <div class="fb-sec"><b>Available Fields</b>{#each numberFields as bf}<button class="fb-field" on:click={()=>insertField(bf.field_name)}>📥 {bf.label} → {'{'+bf.field_name+'}'}</button>{/each}</div>
      <button class="savef" style="background:{selectedTheme.color}" on:click={saveFormula}>💾 Save Formula</button>
    </div>
  </div>
</div>

<style>
  :global(body){margin:0; font-family:system-ui; background:var(--bg, #f8fafc) !important; color:var(--text, #111827) !important;}
  :global(html){background:var(--bg, #f8fafc) !important;}
  .top-fixed.two-line{position:fixed; top:0; left:0; right:0; z-index:1000; background:var(--card, white); border-bottom:1px solid var(--border, #e5e7eb); display:flex; flex-direction:column; gap:0;}
  .top-line{display:flex; justify-content:space-between; align-items:center; padding:5px 8px;}
  .line1{background:var(--bg, #f8fafc); border-bottom:1px solid var(--border, #f1f5f9); height:36px;}
  .line2{background:var(--card, white); min-height:52px; height:auto; padding:8px 10px; overflow:visible; display:flex; align-items:center;}
  .tl1{display:flex; gap:6px; align-items:center;} .tr1{display:flex; gap:4px; align-items:center;}
  .back{width:26px; height:26px; border:none; background:var(--bg, #f1f5f9); border-radius:6px; color:var(--text); cursor:pointer; font-weight:800;}
  .dirty{font-size:9px; color:#ef4444; font-weight:700;} .saved{font-size:9px; color:#16a34a;}
  .count-badge{background:#111827; color:white; padding:0 8px; height:24px; border-radius:10px; font-size:9px; font-weight:700; display:flex; align-items:center;}
  .preview-btn{height:24px; border:1px solid var(--border, #e5e7eb); background:var(--card, white); color:var(--text); border-radius:6px; font-size:9px; padding:0 8px; cursor:pointer; font-weight:700;}
  .save{height:26px; border:none; border-radius:6px; color:white; font-weight:800; font-size:9px; padding:0 10px; cursor:pointer; transition:opacity 0.2s;}
  .save:disabled{cursor:not-allowed;}
  .t-inputs-2{display:grid; grid-template-columns: 1.4fr 0.9fr 1fr 1fr; gap:10px; align-items:end; width:100%;}
  .t-field{display:flex; flex-direction:column; gap:4px; min-width:0;}
  .t-field label{font-size:10px; font-weight:800; color:#111827; text-transform:uppercase; white-space:nowrap; line-height:1; letter-spacing:0.3px;}
  .t-field label.required::after{content:' *'; color:#ef4444; font-weight:900;}
  .t-field input, .t-field select{height:30px; border:1.5px solid #cbd5e1; border-radius:6px; padding:0 10px; font-size:12px; width:100%; min-width:0; box-sizing:border-box; background:#ffffff !important; color:#111827 !important; font-weight:700 !important;}
  .t-field input.invalid{border-color:#ef4444 !important; background:#fef2f2 !important;}
  .toast{position:fixed; top:80px; right:8px; background:#111827; color:white; padding:8px 12px; border-radius:8px; font-size:11px; z-index:2000;}
  .layout.two-top{display:grid; grid-template-columns: 14% 50% 36%; gap:2px; margin-top:90px; height:calc(100vh - 90px); overflow:hidden; background:var(--bg);}
  .left{overflow-y:auto; background:var(--card, white); border-right:1px solid var(--border, #e5e7eb); padding:4px; display:flex; flex-direction:column; gap:4px;}
  .center{overflow-y:auto; background:var(--bg, #fcfcfc); padding:4px; display:flex; flex-direction:column; gap:4px;}
  .right{overflow-y:auto; background:var(--card, #f0fdf4); padding:4px; display:flex; flex-direction:column; gap:4px;}
  .search-box{display:flex; gap:4px; align-items:center; border:1.5px solid var(--border, #e5e7eb); border-radius:6px; padding:0 6px; background:#ffffff; height:28px; font-size:10px;}
  .search-box input{border:none; outline:none; font-size:10px; width:100%; background:#ffffff !important; color:#111827 !important; font-weight:700;}
  .field-grid.single-col{display:flex; flex-direction:column; gap:4px;}
  .field-row.vertical{height:36px !important; min-height:36px !important; width:100% !important; border:1px solid #f1f5f9; border-left-width:3px !important; background:white; border-radius:6px; display:flex; flex-direction:row; align-items:center; gap:8px; padding:0 8px !important; cursor:pointer; color:#111827; font-weight:700;}
  .field-row.vertical .f-icon{font-size:14px !important; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0;}
  .field-row.vertical .f-label-down{font-size:9px !important; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#111827;}
  .board-wrap{width:100%; background:white; border:1.5px solid #0ea5e9; border-radius:6px; height:52%; min-height:220px; overflow:hidden; display:flex; flex-direction:column;}
  .board-scroll{flex:1; overflow:auto; touch-action:pan-x pan-y; -webkit-overflow-scrolling:touch; overscroll-behavior:contain;}
  .board{position:relative; touch-action:pan-x pan-y;}
  .dot{position:absolute; width:1.5px; height:1.5px; background:#cbd5e1; border-radius:50%; opacity:.4;}
  .mod.reduced{position:absolute; background:white; border:1.5px solid; border-radius:6px; display:flex; align-items:center; padding:0 24px 0 8px; font-weight:800; box-shadow:0 1px 3px rgba(0,0,0,.15); touch-action:none !important; user-select:none; cursor:grab; box-sizing:border-box; min-width:80px; overflow:hidden; color:#111827 !important;}
  .mod.reduced.active{border-width:2.2px; z-index:20; box-shadow:0 4px 12px rgba(0,0,0,.2);}
  .mod-label{flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px !important; line-height:1.1; color:#111827 !important; font-weight:800 !important;}
  .x{position:absolute !important; right:4px !important; top:50% !important; transform:translateY(-50%); width:18px !important; height:18px !important; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; font-size:11px !important; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:30;}
  .creating-info{padding:4px 6px; display:flex; justify-content:space-between; font-size:8px; flex-shrink:0; color:#111827; font-weight:700;}
  .preview-wrap.linked.onebyone{flex:1; overflow:auto; background:white; border:1.5px solid #0ea5e9; border-radius:6px; padding:4px;}
  .preview-head{font-size:9px; font-weight:800; margin-bottom:4px; color:#111827;}
  .preview-white{display:flex; flex-direction:column; gap:5px;}
  .p-preview-item{display:flex; flex-direction:column; gap:2px; background:#ffffff; border-radius:4px; padding:6px; border:1px solid #e2e8f0; border-left:3px solid #0ea5e9;}
  .p-l{font-size:9px; font-weight:800; color:#111827 !important;}
  .p-input{height:26px; font-size:10px; border:1.5px solid #94a3b8 !important; border-radius:4px; padding:0 8px; background:#ffffff !important; color:#111827 !important; font-weight:700 !important;}
  .p-input::placeholder{color:#64748b !important;}
  .p-formula{font-size:8px; padding:6px; border-radius:4px; font-weight:800; text-align:center; color:#111827 !important;}
  .edit-box{background:white; border:1px solid #e5e7eb; border-radius:6px; padding:8px; display:flex; flex-direction:column; gap:5px;}
  .edit-head{display:flex; justify-content:space-between; font-size:9px; color:#111827; font-weight:800;} .edit-box label{font-size:8px; font-weight:800; color:#111827;}
  .edit-in{height:26px; border:1.5px solid #94a3b8; border-radius:5px; padding:0 8px; font-size:10px; background:#ffffff !important; color:#111827 !important; font-weight:700 !important;}
  .options-list{display:flex; flex-direction:column; gap:4px; margin-top:4px; max-height:160px; overflow-y:auto; padding:2px;}
  .opt-row{display:flex; align-items:center; gap:4px; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:3px 4px;}
  .opt-index{font-size:9px; font-weight:800; color:#64748b; width:16px; text-align:center;}
  .opt-in{flex:1; height:22px; border:none; outline:none; font-size:9px; font-weight:700; background:#ffffff!important; color:#111827!important;}
  .opt-del{width:20px; height:20px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center;}
  .opt-add-row{display:flex; gap:4px; margin-top:6px;}
  .opt-add-in{flex:1; height:26px; border:1.5px solid #94a3b8; border-radius:6px; padding:0 6px; font-size:9px; background:#ffffff!important; color:#111827!important; font-weight:700;}
  .opt-add-btn{height:26px; padding:0 10px; border:none; border-radius:6px; color:white; font-weight:800; font-size:9px; cursor:pointer; white-space:nowrap;}
  .no-opt{font-size:8px; color:#64748b; text-align:center; padding:8px; border:1px dashed #cbd5e1; border-radius:5px; font-weight:700;}
  .opt-hint{font-size:7px; color:#64748b; font-weight:600; margin-top:2px;}
  .formula-builder{position:relative !important; left:auto !important; top:auto !important; transform:none !important; border:1px solid #bbf7d0; border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:5px; background:#f0fdf4; width:100%; box-sizing:border-box;}
  .fb-head{font-size:9px; font-weight:800; color:#111827;} 
  .fb-ta{width:100%; border:1.5px solid #86efac; border-radius:4px; padding:6px; font-size:10px; resize:none; box-sizing:border-box; background:#ffffff !important; color:#111827 !important; font-weight:700 !important;}
  .fb-ops.all-sym{position:static !important; display:grid !important; grid-template-columns:repeat(3,1fr); gap:6px; width:100% !important; background:transparent !important; border:none !important; box-shadow:none !important;}
  .fb-ops.all-sym button{position:static !important; height:36px !important; background:white; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:800; font-size:14px !important; cursor:pointer; touch-action:manipulation; color:#111827;}
  .fb-sec{display:flex; flex-direction:column; gap:3px; font-size:8px; font-weight:800; color:#111827;} 
  .fb-field{width:100%; min-height:26px; border:1px solid #e5e7eb; border-radius:10px; font-size:8px; background:white; padding:4px 6px; text-align:left; color:#111827; font-weight:700; cursor:pointer;}
  .savef{height:30px; border:none; border-radius:6px; color:white; font-weight:800; font-size:9px; cursor:pointer;}
  @media (max-width:768px){
    .t-inputs-2{grid-template-columns: 1fr 1fr; gap:8px;}
    .layout.two-top{grid-template-columns: 26% 42% 32%; margin-top:110px; height:calc(100vh - 110px);}
    .line2{min-height:80px;}
  }
  @media (max-width:480px){
    .t-inputs-2{grid-template-columns: 1fr 1fr;}
    .layout.two-top{grid-template-columns: 24% 40% 36%; margin-top:110px; height:calc(100vh - 110px);}
  }
</style>