<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { getTemplateOwner } from "$lib/stores/auth";
  import { supabaseTemplates } from "$lib/supabase";

  function uuid(){ return Math.random().toString(36).substring(2,9); }
  function safeUUID(){ try{ return crypto.randomUUID(); }catch{ return Date.now().toString(36)+Math.random().toString(36).slice(2); } }
  function sanitizeText(v:string){ return v.replace(/[<>"'`;]/g,"").trim().slice(0,60); }
  function sanitizeCode(v:string){ return v.toUpperCase().replace(/[^A-Z0-9-_]/g,"").slice(0,20); }
  function sanitizeFieldName(v:string){ return v.toLowerCase().replace(/[^a-z0-9_]+/g,"_").slice(0,40); }
  function sanitizeOption(v:string){ return v.replace(/[<>"'`;]/g,"").trim().slice(0,30); }
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

  let templateName="Daily Tracker"; let templateCode="PROD-01"; let category="Production";
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
  let editFormula = "{enter_output} ÷ {enter_input} × 100";
  let savedCount = 0; let isDirty = true; let toast = ""; let showSavedPopup = false; let savedTemplates: any[] = [];
  let newOptionText = "";

  onMount(async ()=>{
    creatingTime = new Date();
    const iv = setInterval(()=> creatingTime = new Date(), 1000);
    if(browser){
      try{ const s=localStorage.getItem("template_theme_id"); if(s && /^[a-z]+$/.test(s)){ const f=themes.find(t=>t.id===s); if(f) selectedTheme=f; } }catch{}
      loadSaved();
    }
    return ()=> clearInterval(iv);
  });
  function loadSaved(){
    if(!browser) return;
    try{ let t=JSON.parse(localStorage.getItem("templates")||"[]"); savedTemplates = Array.isArray(t)? t.slice(0,100):[]; savedCount=t.length; }catch{ savedCount=0; }
  }

  function quickAdd(def:FieldDef){
    const w=4.5; const h=2.2;
    const x=(placed.length*5)%(cols-w); const y=(placed.length*3)%(rows-h);
    placed=[...placed, { id:uuid(), defId:def.id, label:sanitizeText(def.label), field_name:sanitizeFieldName(def.label)+"_"+uuid().slice(0,3), type:def.type, metric:def.metric, options:[...(def.options||[])].map(s=>sanitizeOption(s)), formula:def.type==='formula'? "{enter_output} ÷ {enter_input} × 100" : "", x, y, w, h, color:def.color, border:def.border, required:def.required }];
    selectedId=placed[placed.length-1].id; if(placed[placed.length-1].type==='formula') editFormula=placed[placed.length-1].formula; isDirty=true;
  }

  let boardEl: HTMLDivElement;

  function startDrag(e: PointerEvent, p:Placed){
    if((e.target as HTMLElement).closest('.x')) return;
    e.stopPropagation();
    selectedId=p.id; editFormula=p.formula||""; newOptionText="";
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
  function deleteField(id:string){ placed=placed.filter(x=>x.id!==id); isDirty=true; }

  function addOption(){
    if(!selected) return;
    const opt = sanitizeOption(newOptionText);
    if(!opt){ toast="Enter option"; setTimeout(()=>toast="",1500); return; }
    if(selected.options.includes(opt)){ toast="Already exists"; setTimeout(()=>toast="",1500); return; }
    if(selected.options.length>=20){ toast="Max 20 options"; setTimeout(()=>toast="",1500); return; }
    selected.options = [...selected.options, opt];
    placed=[...placed];
    newOptionText="";
    isDirty=true;
  }
  function removeOption(idx:number){
    if(!selected) return;
    selected.options = selected.options.filter((_,i)=>i!==idx);
    placed=[...placed];
    isDirty=true;
  }
  function updateOption(idx:number, val:string){
    if(!selected) return;
    const opt = sanitizeOption(val);
    if(!opt) return;
    selected.options[idx]=opt;
    placed=[...placed];
    isDirty=true;
  }

  async function saveTemplate(){
    if(!browser) return;
    let cleanName=sanitizeText(templateName); if(!cleanName){ toast="Enter valid Name"; setTimeout(()=>toast="",2000); return; }
    let cleanCode=sanitizeCode(templateCode)||`PROD-${Date.now().toString().slice(-4)}`; templateName=cleanName; templateCode=cleanCode;
    let all:any[]=[]; try{ all=JSON.parse(localStorage.getItem("templates")||"[]"); }catch{ all=[]; }
    let owner=getTemplateOwner(); let realIdStr=owner.owner_id; let realEmail=sanitizeText(owner.owner_name||owner.owner_email||"user"); let realUUID:string|null=null;
    try{ const { data:{user} }=await supabaseTemplates.auth.getUser(); if(user){ realEmail=sanitizeText(user.email||user.id); realIdStr=user.email||user.id; if(isValidUUID(user.id)) realUUID=user.id; } }catch{}
    const newId=safeUUID();
    const normalized=placed.map(p=>({...p, label:sanitizeText(p.label), field_name:sanitizeFieldName(p.field_name||p.label), name:sanitizeFieldName(p.field_name||p.label), formula:(p.formula||"").slice(0,200), options:(p.options||[]).map(o=>sanitizeOption(o)).slice(0,20) }));
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
  function handleBack(){ if(isDirty &&!confirm("Not Saved! Leave?")) return; history.back(); }
  function pickTheme(t:any){ if(!t||!/^[a-z]+$/.test(t.id)) return; selectedTheme=t; if(browser) localStorage.setItem("template_theme_id",t.id); isDirty=true; }
</script>

<div class="top-fixed two-line">
  <div class="top-line line1">
    <div class="tl1">
      <button class="back" onclick={handleBack}>←</button>
      {#if isDirty}<span class="dirty">● Not Saved</span>{:else}<span class="saved">✓ Saved</span>{/if}
    </div>
    <div class="tr1">
      <span class="count-badge">Saved: {savedCount} ▼</span>
      <button class="preview-btn">💬 Chat</button>
      <button class="save" style="background:{selectedTheme.color}" onclick={saveTemplate}>Save to DB</button>
    </div>
  </div>
  <div class="top-line line2">
    <div class="t-inputs-2">
      <div class="t-field"><label>Template</label><input bind:value={templateName} maxlength={20} placeholder="Daily Tracker" /></div>
      <div class="t-field small"><label>Code</label><input bind:value={templateCode} maxlength={20} class="code-in" /></div>
      <div class="t-field small"><label>Category</label><select bind:value={category}><option>Production</option><option>Quality</option><option>Maintenance</option></select></div>
      <div class="t-field small">
        <label>Theme</label>
        <select value={selectedTheme.id} onchange={(e)=>{ const v=(e.target as HTMLSelectElement).value; const th=themes.find(t=>t.id===v); if(th) pickTheme(th); }}>
          {#each themes as th}<option value={th.id}>{th.name}</option>{/each}
        </select>
      </div>
    </div>
  </div>
  {#if toast}<div class="toast">{toast}</div>{/if}
</div>

<div class="layout two-top">
  <div class="left">
    <div class="search-box"><span>🔍</span><input placeholder="Search" maxlength={30} /></div>
    <div class="field-grid single-col">
      {#each allFields as f}
        <button class="field-row vertical" style="border-left:3px solid {f.border};" onclick={()=>quickAdd(f)}>
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
              onpointerdown={(e)=>startDrag(e,p)}
              onpointermove={onPointerMove}
              onpointerup={onPointerUp}
              ontouchstart={(e)=>onTouchStart(e,p)}
              ontouchmove={onTouchMove}
              ontouchend={onTouchEnd}
              onclick={()=>{ if(!isDragging){selectedId=p.id; editFormula=p.formula;}}}>
              <span class="mod-label">{p.label}{p.type==='dropdown'?` (${p.options.length})`:''}</span>
              <button class="x" onclick={(e)=>{ e.stopPropagation(); deleteField(p.id); }}>✕</button>
            </div>
          {/each}
        </div>
      </div>
      <div class="creating-info" style="background:{selectedTheme.light}; border-top:1px solid {selectedTheme.color}"><b>📅 {creatingTime.toLocaleString()}</b><span style="color:{selectedTheme.color}; font-weight:800;">{selectedTheme.color}</span></div>
    </div>

    <div class="preview-wrap linked onebyone" style="border-color:{selectedTheme.color}">
      <div class="preview-head">◉ Preview - {selectedTheme.name} - Dropdown Fixed</div>
      <div class="preview-white">
        {#each placed as p (p.id)}
          <div class="p-preview-item" style="border-left:3px solid {p.border}">
            <b class="p-l">{p.label} [{p.type}]</b>
            {#if p.type==='dropdown'}
              <select class="p-input" style="background:#ffffff!important; border:2px solid {p.border}!important; color:#0f172a!important;"><option value="">-- Select {p.label} --</option>{#each p.options as opt}<option value={opt}>{opt}</option>{/each}</select>
            {:else if p.type!=='formula'}
              <input class="p-input" placeholder="Enter {p.label}" value={p.type==='number'?'0':''} maxlength={20} />
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
      <div class="edit-box" style="border-color:{selectedTheme.color}"><div class="edit-head"><b>✏️ {selected.label}</b><small>{selected.type}</small></div>
        <label>Label</label><input class="edit-in" value={selected.label} oninput={(e)=>updateSelectedLabel(e.currentTarget.value)} maxlength={60} />
        {#if selected.type==='dropdown'}
          <div style="display:flex; flex-direction:column; gap:6px; background:#fffbeb; border:1px solid #f59e0b; border-radius:8px; padding:8px; margin-top:6px;">
            <label style="font-weight:800; color:#0f172a; font-size:10px;">▼ Dropdown Options ({selected.options.length}/20)</label>
            <div style="display:flex; flex-direction:column; gap:4px; max-height:120px; overflow-y:auto;">
              {#each selected.options as opt, idx}
                <div style="display:flex; gap:4px; align-items:center;">
                  <input style="flex:1; height:28px; border:1px solid #cbd5e1; border-radius:6px; padding:0 8px; font-size:10px; background:#ffffff; color:#0f172a;" value={opt} oninput={(e)=>updateOption(idx, e.currentTarget.value)} maxlength={30} />
                  <button style="width:28px; height:28px; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; border-radius:6px; cursor:pointer; font-weight:800;" onclick={()=>removeOption(idx)}>✕</button>
                </div>
              {/each}
            </div>
            <div style="display:flex; gap:4px;">
              <input class="edit-in" bind:value={newOptionText} placeholder="New option" maxlength={30} onkeydown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addOption(); }}} />
              <button style="height:28px; border:0; border-radius:6px; color:#fff; font-weight:800; font-size:10px; padding:0 10px; cursor:pointer; background:{selectedTheme.color}" onclick={addOption}>+ Add</button>
            </div>
            <small style="color:#64748b; font-size:8px;">🔒 Secure: max 20, sanitized</small>
          </div>
        {/if}
      </div>
    {/if}
    <div class="formula-builder" style="border-color:{selectedTheme.color}; background:{selectedTheme.light}">
      <div class="fb-head"><b>Formula - {selectedTheme.name}</b></div>
      <textarea bind:value={editFormula} oninput={saveFormula} rows="4" class="fb-ta" maxlength={200} placeholder="Select fields"></textarea>
      <div class="fb-ops all-sym three-rows">
        <button onclick={()=>insertOp("(")}>(</button>
        <button onclick={()=>insertOp(")")}>)</button>
        <button onclick={()=>insertOp("+")}>+</button>
        <button onclick={()=>insertOp("-")}>−</button>
        <button onclick={()=>insertOp("×")}>×</button>
        <button onclick={()=>insertOp("÷")}>÷</button>
        <button onclick={()=>insertOp("%")}>%</button>
        <button class="span-2" onclick={()=>insertOp("100")}>100</button>
      </div>
      <div class="fb-sec"><b>Available Fields</b>{#each numberFields as bf}<button class="fb-field" onclick={()=>insertField(bf.field_name)}>📥 {bf.label} → {'{'+bf.field_name+'}'}</button>{/each}</div>
      <button class="savef" style="background:{selectedTheme.color}" onclick={saveFormula}>💾 Save Formula</button>
    </div>
  </div>
</div>

<style>
  :global(body){margin:0; font-family:system-ui; background:#ffffff; color:#0f172a;}
 .top-fixed.two-line{position:fixed; top:0; left:0; right:0; z-index:1000; background:#ffffff; border-bottom:2px solid #e2e8f0; display:flex; flex-direction:column; gap:0; color:#0f172a;}
 .top-line{display:flex; justify-content:space-between; align-items:center; padding:4px 6px;}
 .line1{background:#f8fafc; border-bottom:1px solid #e2e8f0; height:32px;}
 .line2{background:#ffffff; height:36px;}
 .tl1{display:flex; gap:6px; align-items:center;}.tr1{display:flex; gap:4px; align-items:center;}
 .back{width:24px; height:24px; border:1px solid #cbd5e1; background:#ffffff; border-radius:5px; color:#0f172a; cursor:pointer; font-weight:700;}
 .dirty{font-size:7px; color:#ef4444; font-weight:800; background:#fef2f2; padding:2px 6px; border-radius:10px; border:1px solid #fecaca;}
 .saved{font-size:7px; color:#16a34a; font-weight:800; background:#f0fdf4; padding:2px 6px; border-radius:10px; border:1px solid #bbf7d0;}
 .count-badge{background:#0f172a; color:#ffffff; padding:0 8px; height:22px; border-radius:10px; font-size:8px; font-weight:800; display:flex; align-items:center;}
 .preview-btn{height:22px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a; border-radius:5px; font-size:8px; font-weight:700; padding:0 8px; cursor:pointer;}
 .save{height:22px; border:none; border-radius:5px; color:#ffffff; font-weight:800; font-size:8px; padding:0 10px; cursor:pointer;}
 .t-inputs-2{display:flex; gap:6px; align-items:center; width:100%;}
 .t-field{display:flex; flex-direction:column; gap:1px; flex:1;}.t-field.small{flex:0 0 80px;}
 .t-field label{font-size:6px; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:0.5px;}
 .t-field input,.t-field select{height:22px; border:1px solid #cbd5e1; border-radius:4px; padding:0 6px; font-size:9px; width:100%; box-sizing:border-box; background:#ffffff; color:#0f172a;}
 .toast{position:fixed; top:70px; right:8px; background:#0f172a; color:#ffffff; padding:8px 12px; border-radius:8px; font-size:10px; font-weight:700; z-index:2000; border:1px solid #334155;}
 .layout.two-top{display:grid; grid-template-columns: 14% 50% 36%; gap:2px; margin-top:72px; height:calc(100vh - 72px); overflow:hidden; background:#f1f5f9;}
 .left{overflow-y:auto; background:#ffffff; border-right:1px solid #e2e8f0; padding:4px; display:flex; flex-direction:column; gap:4px;}
 .center{overflow-y:auto; background:#f8fafc; padding:4px; display:flex; flex-direction:column; gap:4px;}
 .right{overflow-y:auto; background:#ffffff; padding:4px; display:flex; flex-direction:column; gap:6px; border-left:1px solid #e2e8f0;}
 .search-box{display:flex; gap:6px; align-items:center; border:1px solid #cbd5e1; border-radius:8px; padding:0 8px; background:#ffffff; height:26px; font-size:9px; color:#0f172a;}
 .search-box input{border:none; outline:none; font-size:9px; width:100%; background:#ffffff; color:#0f172a;}
 .field-grid.single-col{display:flex; flex-direction:column; gap:4px;}
 .field-row.vertical{height:36px!important; min-height:36px!important; width:100%!important; border:1px solid #e2e8f0; border-left-width:4px!important; background:#ffffff; border-radius:8px; display:flex; flex-direction:row; align-items:center; gap:8px; padding:0 8px!important; color:#0f172a; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.04);}
 .field-row.vertical:hover{background:#f8fafc; border-color:#cbd5e1;}
 .field-row.vertical.f-icon{font-size:14px!important; width:22px; height:22px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#f1f5f9; border-radius:6px;}
 .field-row.vertical.f-label-down{font-size:8px!important; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#0f172a;}
 .board-wrap{width:100%; background:#ffffff; border:2px solid #0ea5e9; border-radius:8px; height:52%; min-height:200px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 2px 8px rgba(0,0,0,0.06);}
 .board-scroll{flex:1; overflow:auto; touch-action:pan-x pan-y; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; background:#ffffff; background-image: radial-gradient(#e2e8f0 1px, transparent 1px); background-size:14px 14px;}
 .board{position:relative; touch-action:pan-x pan-y; background:transparent;}
 .dot{display:none;}
 .mod.reduced{position:absolute; background:#ffffff; border:2px solid; border-radius:8px; display:flex; align-items:center; padding:0 26px 0 8px; font-weight:800; box-shadow:0 2px 6px rgba(0,0,0,.12); touch-action:none; user-select:none; cursor:grab; box-sizing:border-box; min-width:72px; overflow:hidden; color:#0f172a;}
 .mod.reduced.active{border-width:2.5px; z-index:20; box-shadow:0 6px 16px rgba(0,0,0,.18); background:#ffffff;}
 .mod-label{flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px!important; line-height:1.2; color:#0f172a!important; font-weight:800;}
 .x{position:absolute!important; right:4px!important; top:50%!important; transform:translateY(-50%); width:18px!important; height:18px!important; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:5px; font-size:11px!important; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:30; font-weight:800;}
 .creating-info{padding:6px 8px; display:flex; justify-content:space-between; font-size:8px; flex-shrink:0; background:#ffffff; color:#0f172a; font-weight:600; border-top:1px solid #e2e8f0;}
 .preview-wrap.linked.onebyone{flex:1; overflow:auto; background:#ffffff; border:2px solid #0ea5e9; border-radius:8px; padding:6px; box-shadow:0 2px 8px rgba(0,0,0,0.06);}
 .preview-head{font-size:8px; font-weight:800; margin-bottom:6px; color:#0f172a; background:#f0f9ff; padding:6px 8px; border-radius:6px; border:1px solid #bae6fd;}
 .preview-white{display:flex; flex-direction:column; gap:6px;}
 .p-preview-item{display:flex; flex-direction:column; gap:3px; background:#ffffff; border-radius:6px; padding:6px; border:1px solid #e2e8f0; border-left:3px solid #0ea5e9;}
 .p-l{font-size:9px; font-weight:800; color:#0f172a;}.p-input{height:24px; font-size:9px; border:1px solid #cbd5e1; background:#ffffff; color:#0f172a; border-radius:6px; padding:0 8px;}
 .p-formula{font-size:8px; padding:8px; border-radius:6px; font-weight:800; text-align:center; background:#f0fdf4; color:#065f46; border:1px solid #bbf7d0;}
 .edit-box{background:#ffffff; border:2px solid #e2e8f0; border-radius:8px; padding:8px; display:flex; flex-direction:column; gap:6px; box-shadow:0 1px 3px rgba(0,0,0,0.05);}
 .edit-head{display:flex; justify-content:space-between; font-size:9px; color:#0f172a; font-weight:800;}.edit-box label{font-size:8px; font-weight:800; color:#334155;}
 .edit-in{height:26px; border:1px solid #cbd5e1; border-radius:6px; padding:0 8px; font-size:9px; background:#ffffff; color:#0f172a;}
 .formula-builder{position:relative!important; left:auto!important; top:auto!important; transform:none!important; border:2px solid #bbf7d0; border-radius:8px; padding:8px; display:flex; flex-direction:column; gap:8px; background:#ffffff; width:100%; box-sizing:border-box; box-shadow:0 2px 8px rgba(0,0,0,0.06);}
 .fb-head{font-size:9px; font-weight:800; color:#065f46; background:#f0fdf4; padding:6px 8px; border-radius:6px; border:1px solid #bbf7d0;}
 .fb-ta{width:100%; border:1px solid #cbd5e1; border-radius:6px; padding:8px; font-size:10px; resize:none; box-sizing:border-box; background:#ffffff; color:#0f172a; font-weight:600;}
 .fb-ops.all-sym{position:static!important; display:grid!important; grid-template-columns:repeat(3,1fr); gap:6px; width:100%!important; background:transparent!important; border:none!important; box-shadow:none!important;}
 .fb-ops.all-sym button{position:static!important; height:36px!important; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; font-weight:800; font-size:14px!important; cursor:pointer; touch-action:manipulation; color:#0f172a; box-shadow:0 1px 2px rgba(0,0,0,0.04);}
 .fb-ops.all-sym button:hover{background:#f8fafc; border-color:#94a3b8;}
 .fb-sec{display:flex; flex-direction:column; gap:4px; font-size:8px; color:#0f172a; font-weight:700;}
 .fb-field{width:100%; min-height:26px; border:1px solid #e2e8f0; border-radius:8px; font-size:8px; background:#ffffff; color:#0f172a; padding:6px 8px; text-align:left; font-weight:600; cursor:pointer;}
 .fb-field:hover{background:#f8fafc;}
 .savef{height:32px; border:none; border-radius:8px; color:#ffffff; font-weight:800; font-size:9px; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);}
  @media (max-width:480px){
   .layout.two-top{grid-template-columns: 22% 40% 38%; margin-top:68px; height:calc(100vh - 68px);}
   .line2{height:auto; padding:3px 4px;}
   .t-inputs-2{gap:3px; flex-wrap:wrap;}
   .t-field.small{flex:1 0 60px;}
   .mod.reduced{min-width:80px!important;}
  }
</style>