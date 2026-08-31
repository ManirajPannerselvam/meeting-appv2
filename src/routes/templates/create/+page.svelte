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
  $: timeLabel = creatingTime.toLocaleTimeString();

  let templateName="Daily Tracker"; let templateCode="PROD-01"; let category="Production";
  let cols=38; let rows=22; let gap=16;
  type Placed = { id:string, defId:string, label:string, field_name:string, type:FieldType, metric?:string, options:string[], formula:string, x:number, y:number, w:number, h:number, color:string, border:string, required?:boolean };
  let placed: Placed[] = [
    { id:uuid(), defId:"", label:"Daily Tracker", field_name:"daily_tracker", type:"text", options:[], formula:"", x:1, y:0, w:3.7, h:2.2, color:"#3b82f6", border:"#3b82f6" },
    { id:uuid(), defId:"", label:"Enter input", field_name:"enter_input", type:"number", metric:"input", options:[], formula:"", x:1, y:3, w:3.7, h:2.2, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Enter Output", field_name:"enter_output", type:"number", metric:"output", options:[], formula:"", x:1, y:6, w:3.7, h:2.2, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Formula", field_name:"formula", type:"formula", options:[], formula:"{enter_output} ÷ {enter_input} × 100", x:1, y:9, w:3.7, h:2.2, color:"#16a34a", border:"#f59e0b" },
    { id:uuid(), defId:"", label:"number", field_name:"number_a4v", type:"number", options:[], formula:"", x:7, y:0, w:3.7, h:2.2, color:"#111827", border:"#111827" },
  ];
  let drag:Placed|null=null; let dragOff={x:0,y:0}; let selectedId=placed[3].id;
  $: selected = placed.find(p=>p.id===selectedId);
  $: numberFields = placed.filter(p=>p.metric || p.type==='number' || p.type==='dropdown');
  let editFormula = "{enter_output} ÷ {enter_input} × 100";
  let savedCount = 0; let isDirty = true; let showChatPopup = false; let toast = ""; let showSavedPopup = false; let savedTemplates: any[] = []; let dropdownNewOption = ""; let currentUserName = ""; let currentUserId = ""; let chatValues: Record<string,any> = {};

  function evaluateChatFormula(formulaStr: string, vals: Record<string,any>): string {
    if(!formulaStr) return "0.00 %";
    try{
      let expr = formulaStr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/%/g,'');
      expr = expr.replace(/\{([^}]+)\}/g, (_, k)=>{
        let key = sanitizeFieldName(k.trim()); let v = vals[key];
        if(v===undefined || v==="" || v===null) return "0";
        let num = Number(String(v).replace(/[^0-9.\-]/g,"")); return isNaN(num)? "0" : String(Math.max(-1e9, Math.min(1e9, num)));
      });
      if(!/^[\d\s\.\+\-\*\/\(\)]+$/.test(expr)) return "0.00 %";
      let r = Function('"use strict"; return ('+expr+')')();
      if(typeof r!=='number' || isNaN(r) || !isFinite(r)) return "0.00 %";
      return Number(r).toFixed(2) + " %";
    }catch{ return "0.00 %"; }
  }
  function getChatFormula(p: Placed){ return evaluateChatFormula(p.formula, chatValues); }
  function onChatInput(fname: string, val: string){ chatValues[sanitizeFieldName(fname)]=String(val).replace(/[^0-9.\-]/g,"").slice(0,20); chatValues={...chatValues}; }

  onMount(async ()=>{
    try{ const { data: { user } } = await supabaseTemplates.auth.getUser(); if(user){ currentUserName=sanitizeText(user.email||user.id); currentUserId=user.id; } }catch{}
    creatingTime = new Date(); setInterval(()=> creatingTime = new Date(), 1000);
    try{ const s=localStorage.getItem("template_theme_id"); if(s && /^[a-z]+$/.test(s)){ const f=themes.find(t=>t.id===s); if(f) selectedTheme=f; } }catch{}
    loadSaved();
  });
  function loadSaved(){ try{ let t=JSON.parse(localStorage.getItem("templates")||"[]"); savedTemplates = Array.isArray(t)? t.slice(0,100):[]; savedCount=t.length; }catch{ savedCount=0; } }

  function quickAdd(def:FieldDef){
    const w=3.7; const h=2.2;
    const x=(placed.length*5)%(cols-w); const y=(placed.length*3)%(rows-h);
    placed=[...placed, { id:uuid(), defId:def.id, label:sanitizeText(def.label), field_name:sanitizeFieldName(def.label)+"_"+uuid().slice(0,3), type:def.type, metric:def.metric, options:[...(def.options||[])].map(s=>sanitizeText(s)), formula:def.type==='formula'? "{enter_output} ÷ {enter_input} × 100" : "", x, y, w, h, color:def.color, border:def.border, required:def.required }];
    selectedId=placed[placed.length-1].id; if(placed[placed.length-1].type==='formula') editFormula=placed[placed.length-1].formula; isDirty=true;
  }

  let boardEl: HTMLDivElement;
  function getPos(e: MouseEvent | TouchEvent | PointerEvent){
    const b=boardEl.getBoundingClientRect();
    const cx = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const cy = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    return {b,cx,cy};
  }
  function startDrag(e: PointerEvent | MouseEvent | TouchEvent, p:Placed){
    e.preventDefault(); drag=p; selectedId=p.id; editFormula=p.formula||"";
    const {b,cx,cy}=getPos(e); dragOff.x=cx-b.left-p.x*gap; dragOff.y=cy-b.top-p.y*gap;
    if((e as PointerEvent).pointerId!==undefined){ (e.target as Element).setPointerCapture((e as PointerEvent).pointerId); }
    window.addEventListener("pointermove", onPointerMove as any, {passive:false});
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("mousemove", onMove as any);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove as any, {passive:false});
    window.addEventListener("touchend", onTouchEnd);
  }
  function onPointerMove(e: PointerEvent){
    if(!drag) return; e.preventDefault();
    const {b,cx,cy}=getPos(e); let nx=Math.round((cx-b.left-dragOff.x)/gap); let ny=Math.round((cy-b.top-dragOff.y)/gap);
    nx=Math.max(0,Math.min(cols-drag.w,nx)); ny=Math.max(0,Math.min(rows-drag.h,ny));
    placed=placed.map(pl=> pl.id===drag!.id? {...pl, x:nx, y:ny}:pl); isDirty=true;
  }
  function onPointerUp(e: PointerEvent){ drag=null; window.removeEventListener("pointermove", onPointerMove as any); window.removeEventListener("pointerup", onPointerUp); onUp(); onTouchEnd(); }
  function onMove(e:MouseEvent){ if(!drag) return; const b=boardEl.getBoundingClientRect(); let nx=Math.round((e.clientX-b.left-dragOff.x)/gap); let ny=Math.round((e.clientY-b.top-dragOff.y)/gap); nx=Math.max(0,Math.min(cols-drag.w,nx)); ny=Math.max(0,Math.min(rows-drag.h,ny)); placed=placed.map(pl=> pl.id===drag!.id? {...pl, x:nx, y:ny}:pl); isDirty=true; }
  function onUp(){ drag=null; window.removeEventListener("mousemove",onMove as any); window.removeEventListener("mouseup",onUp); }
  function onTouchMove(ev:TouchEvent){ if(!drag) return; ev.preventDefault(); const t=ev.touches[0]; const b=boardEl.getBoundingClientRect(); let nx=Math.round((t.clientX-b.left-dragOff.x)/gap); let ny=Math.round((t.clientY-b.top-dragOff.y)/gap); nx=Math.max(0,Math.min(cols-drag.w,nx)); ny=Math.max(0,Math.min(rows-drag.h,ny)); placed=placed.map(pl=> pl.id===drag!.id? {...pl, x:nx, y:ny}:pl); isDirty=true; }
  function onTouchEnd(){ drag=null; window.removeEventListener("touchmove", onTouchMove as any); window.removeEventListener("touchend", onTouchEnd); window.removeEventListener("pointermove", onPointerMove as any); }

  function insertOp(t:string){ if(!/^[\(\)\+\-×÷%0-9\s]+$/.test(t)) return; editFormula+= (editFormula?" ":"") + t + " "; saveFormula(); }
  function insertField(fn:string){ let safe=sanitizeFieldName(fn); editFormula+= `{${safe}} `; if(selected){ selected.formula=editFormula.slice(0,200); placed=[...placed]; } isDirty=true; }
  function saveFormula(){ if(selected){ selected.formula=editFormula.replace(/[^a-z0-9_{}\s\+\-\*\/\(\)÷×%\.\s]/gi,"").slice(0,200); placed=[...placed]; } isDirty=true; }
  function updateSelectedLabel(val:string){ if(!selected) return; let s=sanitizeText(val); if(!s) return; selected.label=s; selected.field_name=sanitizeFieldName(s); placed=[...placed]; isDirty=true; }
  function addDropdownOption(){ if(!selected) return; let s=sanitizeText(dropdownNewOption); if(!s) return; selected.options=[...(selected.options||[]), s].slice(0,20); placed=[...placed]; dropdownNewOption=""; isDirty=true; }
  function removeOption(i:number){ if(!selected) return; selected.options.splice(i,1); selected.options=[...selected.options]; placed=[...placed]; isDirty=true; }

  async function saveTemplate(){
    let cleanName=sanitizeText(templateName); if(!cleanName){ toast="Enter valid Name"; setTimeout(()=>toast="",2000); return; }
    let cleanCode=sanitizeCode(templateCode)||`PROD-${Date.now().toString().slice(-4)}`; templateName=cleanName; templateCode=cleanCode;
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
  async function deleteSaved(id:string){ if(!confirm("Delete?")) return; savedTemplates=savedTemplates.filter(t=>t.id!==id); localStorage.setItem("templates",JSON.stringify(savedTemplates)); savedCount=savedTemplates.length; try{ if(isValidUUID(id)) await supabaseTemplates.from('templates').delete().eq('id',id); }catch{} }
  function pickTheme(t:any){ if(!t||!/^[a-z]+$/.test(t.id)) return; selectedTheme=t; localStorage.setItem("template_theme_id",t.id); isDirty=true; }
</script>

<div class="top-fixed">
  <div class="tl"><button class="back" on:click={handleBack}>←</button><b class="builder-title">{templateName}</b>
    <div class="top-inputs"><input bind:value={templateName} maxlength="60" placeholder="Name" /><input bind:value={templateCode} maxlength="20" class="code-in" /><select bind:value={category}><option>Production</option><option>Quality</option><option>Maintenance</option></select></div>
    {#if isDirty}<span class="dirty">● Not Saved</span>{:else}<span class="saved">✓ Saved</span>{/if}
  </div>
  <div class="tr"><span class="count-badge" on:click={()=>{loadSaved(); showSavedPopup=true;}}>Saved: {savedCount} ▼</span><button class="preview-btn" on:click={()=>showChatPopup=true}>💬 Chat</button><button class="save" style="background:{selectedTheme.color}" on:click={saveTemplate}>Save to DB</button></div>
  {#if toast}<div class="toast">{toast}</div>{/if}
</div>

<div class="layout">
  <div class="left">
    <div class="theme-panel top-side"><b class="theme-title">🎨 10 Colors</b>
      <select class="theme-select" value={selectedTheme.id} on:change={(e)=>{ const v=(e.target as HTMLSelectElement).value; const th=themes.find(t=>t.id===v); if(th) pickTheme(th); }}>
        {#each themes as th}<option value={th.id}>{th.name}</option>{/each}
      </select>
      <div class="time-box mini"><span class="t-box" style="background:{selectedTheme.color}"></span><small>{creatingTime.toLocaleTimeString()} {selectedTheme.color}</small></div>
    </div>
    <div class="search-box"><span>🔍</span><input placeholder="Search" maxlength="30" /></div>
    <div class="field-grid">
      {#each allFields as f}
        <button class="field-row small" style="border-left:3px solid {f.border};" on:click={()=>quickAdd(f)}><span class="f-icon">{f.icon}</span><span class="f-label-down">{f.label}</span></button>
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
              on:mousedown={(e)=>startDrag(e,p)}
              on:touchstart|nonpassive={(e)=>startDrag(e,p)}
              on:click={()=>{selectedId=p.id; editFormula=p.formula;}}>
              <span class="mod-label">{p.label}</span><button class="x" on:click|stopPropagation={()=>{placed=placed.filter(x=>x.id!==p.id); isDirty=true;}}>✕</button>
            </div>
          {/each}
        </div>
      </div>
      <div class="creating-info" style="background:{selectedTheme.light}; border-top:1px solid {selectedTheme.color}"><b>📅 {creatingTime.toLocaleString()}</b><span style="color:{selectedTheme.color}; font-weight:800;">{selectedTheme.color}</span></div>
    </div>

    <div class="preview-wrap linked onebyone" style="border-color:{selectedTheme.color}">
      <div class="preview-head">◉ Preview - {selectedTheme.name} <span style="background:{selectedTheme.color}; color:white; padding:2px 6px; border-radius:10px; font-size:7px;">one by one</span></div>
      <div class="preview-white">
        {#each placed as p (p.id)}
          <div class="p-preview-item" style="border-left:3px solid {p.border}">
            <b class="p-l">{p.label}</b>
            {#if p.type!=='formula'}
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
      <div class="edit-box" style="border-color:{selectedTheme.color}"><div class="edit-head"><b>✏️ {selected.label}</b><small>{selected.type}</small></div>
        <label>Label</label><input class="edit-in" value={selected.label} on:input={(e)=>updateSelectedLabel(e.currentTarget.value)} maxlength="60" />
        <label>Field Name</label><input class="edit-in" value={selected.field_name} readonly style="background:#f1f5f9;" />
        {#if selected.type==='dropdown'}<div class="edit-sec"><b>Options</b>{#each selected.options as opt,i}<div class="opt-row"><span>{opt}</span><button on:click={()=>removeOption(i)}>✕</button></div>{/each}
          <div class="opt-add"><input bind:value={dropdownNewOption} maxlength="30" placeholder="New" on:keydown={(e)=>{ if(e.key==='Enter') addDropdownOption(); }} /><button on:click={addDropdownOption} style="background:{selectedTheme.color}">Add</button></div></div>{/if}
      </div>
    {/if}
    <div class="formula-builder" style="border-color:{selectedTheme.color}; background:{selectedTheme.light}">
      <div class="fb-head"><b>Formula - {selectedTheme.name}</b><small>{selectedTheme.color}</small></div>
      <textarea bind:value={editFormula} on:input={saveFormula} rows="3" class="fb-ta" maxlength="200" placeholder="Select fields"></textarea>
      <div class="fb-ops"><button on:click={()=>insertOp("(")}>(</button><button on:click={()=>insertOp(")")}>)</button><button on:click={()=>insertOp("+")}>+</button><button on:click={()=>insertOp("-")}>−</button><button on:click={()=>insertOp("×")}>×</button><button on:click={()=>insertOp("÷")}>÷</button><button on:click={()=>insertOp("%")}>%</button><button on:click={()=>insertOp("100")}>100</button></div>
      <div class="fb-sec"><b>Available Fields</b>{#each numberFields as bf}<button class="fb-field" on:click={()=>insertField(bf.field_name)}>📥 {bf.label} → {'{'+bf.field_name+'}'}</button>{/each}</div>
      <button class="savef" style="background:{selectedTheme.color}" on:click={saveFormula}>💾 Save Formula</button>
    </div>
  </div>
</div>

<style>
  :global(body){margin:0; font-family:system-ui; background:#f8fafc;}
  .top-fixed{position:fixed; top:0; left:0; right:0; z-index:1000; background:white; border-bottom:1px solid #e5e7eb; padding:4px; display:flex; justify-content:space-between; gap:6px;}
  .tl{display:flex; gap:6px; align-items:center; flex:1;} .tr{display:flex; gap:4px; align-items:center;}
  .builder-title{font-size:11px; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .top-inputs{display:flex; gap:4px; flex:1;} .top-inputs input, .top-inputs select{height:26px; border:1px solid #e5e7eb; border-radius:6px; padding:0 6px; font-size:10px; flex:1; min-width:0;}
  .code-in{flex:0 0 60px !important;} .back{width:26px; height:26px; border:none; background:#f1f5f9; border-radius:6px;}
  .dirty{font-size:8px; color:#ef4444; font-weight:700;} .saved{font-size:8px; color:#16a34a;}
  .count-badge{background:#111827; color:white; padding:0 8px; height:26px; border-radius:12px; font-size:9px; font-weight:700;}
  .preview-btn{height:26px; border:1px solid #e5e7eb; background:#f8fafc; border-radius:6px; font-size:9px; padding:0 8px;}
  .save{height:26px; border:none; border-radius:6px; color:white; font-weight:800; font-size:9px; padding:0 10px;}
  .toast{position:fixed; top:50px; right:8px; background:#111827; color:white; padding:6px 10px; border-radius:6px; font-size:10px; z-index:2000;}
  .layout{display:grid; grid-template-columns: 14% 50% 36%; gap:2px; margin-top:44px; height:calc(100vh - 44px); overflow:hidden;}
  .left{overflow-y:auto; background:white; border-right:1px solid #e5e7eb; padding:3px; display:flex; flex-direction:column; gap:3px;}
  .center{overflow-y:auto; background:#fcfcfc; padding:3px; display:flex; flex-direction:column; gap:4px;}
  .right{overflow-y:auto; background:#f0fdf4; padding:3px; display:flex; flex-direction:column; gap:4px;}
  .theme-panel.top-side{background:#fff7ed; border:1px solid #fed7aa; border-radius:6px; padding:4px; display:flex; flex-direction:column; gap:3px;}
  .theme-title{font-size:8px; font-weight:800; text-align:center;} .theme-select{height:22px; font-size:8px; border:1px solid #e5e7eb; border-radius:4px; width:100%;}
  .time-box.mini{display:flex; gap:3px; align-items:center; justify-content:center; font-size:7px;} .t-box{width:10px; height:10px; border-radius:2px; display:inline-block;}
  .search-box{display:flex; gap:4px; align-items:center; border:1px solid #e5e7eb; border-radius:6px; padding:0 4px; background:white; height:26px; font-size:10px;}
  .search-box input{border:none; outline:none; font-size:9px; width:100%;}
  .field-grid{display:grid; grid-template-columns:1fr 1fr; gap:3px;}

  /* 1. LEFT - ALL SAME SIZE - FIXED */
  .field-row.small{
    height:38px !important; min-height:38px !important; max-height:38px !important;
    border:1px solid #f1f5f9; border-left:3px solid #111827;
    background:white; border-radius:6px;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:1px !important; padding:2px 1px !important;
  }
  .f-icon{font-size:13px !important; line-height:1; width:16px; height:16px; display:flex; align-items:center; justify-content:center;}
  .f-label-down{font-size:6.5px !important; font-weight:700; text-align:center; white-space:nowrap; overflow:hidden; max-width:100%; line-height:1;}

  .board-wrap{width:100%; background:white; border:1.5px solid #0ea5e9; border-radius:6px; height:52%; min-height:220px; overflow:hidden; display:flex; flex-direction:column; touch-action:none;}
  .board-scroll{flex:1; overflow:auto; touch-action:none; -webkit-overflow-scrolling:touch;}
  .board{position:relative; touch-action:none;}
  .dot{position:absolute; width:2px; height:2px; background:#cbd5e1; border-radius:50%; opacity:.5;}

  /* 2. MIDDLE X - REDUCED SIZE - FIXED */
  .mod.reduced{position:absolute; background:white; border:2px solid; border-radius:8px; display:flex; align-items:center; justify-content:space-between; padding:0 4px; font-size:7px; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.12); touch-action:none; user-select:none; -webkit-user-select:none; cursor:grab;}
  .mod.reduced:active{cursor:grabbing; z-index:20; transform:scale(1.02);}
  .mod-label{overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:78%; font-size:7px;}
  .x{
    border:none; background:#f1f5f9; 
    width:12px !important; height:12px !important; min-width:12px !important; min-height:12px !important;
    border-radius:2px; font-size:7px !important; line-height:1;
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0; padding:0;
  }

  .creating-info{padding:4px 6px; display:flex; justify-content:space-between; font-size:8px; flex-shrink:0;}
  .preview-wrap.linked.onebyone{flex:1; overflow:auto; background:white; border:1.5px solid #0ea5e9; border-radius:6px; padding:4px;}
  .preview-head{font-size:8px; font-weight:700; margin-bottom:4px; display:flex; justify-content:space-between;}
  .preview-white{display:flex; flex-direction:column; gap:6px;}
  .p-preview-item{display:flex; flex-direction:column; gap:2px; background:#f8fafc; border-radius:4px; padding:4px; border:1px solid #e2e8f0; border-left:3px solid #0ea5e9;}
  .p-l{font-size:9px; font-weight:700;} .p-input{height:24px; font-size:9px; border:1px dashed #cbd5e1; border-radius:4px; padding:0 6px;}
  .p-formula{font-size:8px; padding:6px; border-radius:4px; font-weight:700; text-align:center; background:#e0f2fe;}
  .edit-box{background:white; border:1px solid #e5e7eb; border-radius:6px; padding:4px; display:flex; flex-direction:column; gap:3px;}
  .edit-head{display:flex; justify-content:space-between; font-size:9px;} .edit-box label{font-size:8px; font-weight:700;}
  .edit-in{height:22px; border:1px solid #e2e8f0; border-radius:4px; padding:0 6px; font-size:9px;}
  .formula-builder{border:1px solid #bbf7d0; border-radius:6px; padding:4px; display:flex; flex-direction:column; gap:4px;}
  .fb-head{font-size:10px; font-weight:700;} .fb-ta{width:100%; border:1px solid #bbf7d0; border-radius:4px; padding:4px; font-size:9px; resize:none; box-sizing:border-box;}

  /* 3. RIGHT () + * - REDUCED SIZE - FIXED */
  .fb-ops{display:grid; grid-template-columns:repeat(4,1fr); gap:4px;}
  .fb-ops button{
    height:24px !important; min-height:24px !important;
    border:1px solid #e5e7eb; background:white; border-radius:5px;
    font-weight:700; font-size:11px !important;
    display:flex; align-items:center; justify-content:center; padding:0;
  }
  .fb-sec{display:flex; flex-direction:column; gap:3px;} 
  .fb-field{width:100%; min-height:26px; border:1px solid #e5e7eb; border-radius:12px; font-size:8px; background:white; padding:4px 6px; text-align:left;}
  .savef{height:28px; border:none; border-radius:6px; color:white; font-weight:700; font-size:9px;}
  @media (max-width:480px){
    .layout{grid-template-columns: 20% 44% 36%;}
    .mod.reduced{font-size:6px; border-radius:6px;}
    .field-row.small{height:34px !important; min-height:34px !important;}
    .fb-ops button{height:22px !important; font-size:10px !important;}
  }
</style>