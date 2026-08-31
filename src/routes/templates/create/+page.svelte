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

  let templateName="Daily Tracker"; let templateCode="PROD-01"; let category="Production";
  let cols=38; let rows=22; let gap=14;
  type Placed = { id:string, defId:string, label:string, field_name:string, type:FieldType, metric?:string, options:string[], formula:string, x:number, y:number, w:number, h:number, color:string, border:string, required?:boolean };
  let placed: Placed[] = [
    { id:uuid(), defId:"", label:"Daily Tracker", field_name:"daily_tracker", type:"text", options:[], formula:"", x:1, y:0, w:3.2, h:1.8, color:"#3b82f6", border:"#3b82f6" },
    { id:uuid(), defId:"", label:"Enter input", field_name:"enter_input", type:"number", metric:"input", options:[], formula:"", x:1, y:3, w:3.2, h:1.8, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Enter Output", field_name:"enter_output", type:"number", metric:"output", options:[], formula:"", x:1, y:6, w:3.2, h:1.8, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Formula", field_name:"formula", type:"formula", options:[], formula:"{enter_output} ÷ {enter_input} × 100", x:1, y:9, w:3.2, h:1.8, color:"#16a34a", border:"#f59e0b" },
    { id:uuid(), defId:"", label:"number", field_name:"number_a4v", type:"number", options:[], formula:"", x:7, y:0, w:3.2, h:1.8, color:"#111827", border:"#111827" },
  ];
  let drag:Placed|null=null; let dragOff={x:0,y:0}; let selectedId=placed[3].id;
  $: selected = placed.find(p=>p.id===selectedId);
  $: numberFields = placed.filter(p=>p.metric || p.type==='number' || p.type==='dropdown');
  let editFormula = "{enter_output} ÷ {enter_input} × 100";
  let savedCount = 0; let isDirty = true; let toast = ""; let showSavedPopup = false; let savedTemplates: any[] = []; let dropdownNewOption = "";

  onMount(async ()=>{
    creatingTime = new Date(); setInterval(()=> creatingTime = new Date(), 1000);
    try{ const s=localStorage.getItem("template_theme_id"); if(s && /^[a-z]+$/.test(s)){ const f=themes.find(t=>t.id===s); if(f) selectedTheme=f; } }catch{}
    loadSaved();
  });
  function loadSaved(){ try{ let t=JSON.parse(localStorage.getItem("templates")||"[]"); savedTemplates = Array.isArray(t)? t.slice(0,100):[]; savedCount=t.length; }catch{ savedCount=0; } }

  function quickAdd(def:FieldDef){
    const w=3.2; const h=1.8;
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
    if((e.target as HTMLElement).closest('.x')) return;
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
  function deleteField(id:string){ placed=placed.filter(x=>x.id!==id); isDirty=true; }

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
  function pickTheme(t:any){ if(!t||!/^[a-z]+$/.test(t.id)) return; selectedTheme=t; localStorage.setItem("template_theme_id",t.id); isDirty=true; }
</script>

<!-- TOP 2 LINES -->
<div class="top-fixed two-line">
  <div class="top-line line1">
    <div class="tl1">
      <button class="back" on:click={handleBack}>←</button>
      {#if isDirty}<span class="dirty">● Not Saved</span>{:else}<span class="saved">✓ Saved</span>{/if}
    </div>
    <div class="tr1">
      <span class="count-badge">Saved: {savedCount} ▼</span>
      <button class="preview-btn">💬 Chat</button>
      <button class="save" style="background:{selectedTheme.color}" on:click={saveTemplate}>Save to DB</button>
    </div>
  </div>

  <div class="top-line line2">
    <div class="t-inputs-2">
      <div class="t-field"><label>Template</label><input bind:value={templateName} maxlength="60" placeholder="Daily Tracker" /></div>
      <div class="t-field small"><label>Code</label><input bind:value={templateCode} maxlength="20" class="code-in" /></div>
      <div class="t-field small"><label>Category</label><select bind:value={category}><option>Production</option><option>Quality</option><option>Maintenance</option></select></div>
      <div class="t-field small">
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
              on:mousedown={(e)=>startDrag(e,p)}
              on:touchstart|nonpassive={(e)=>startDrag(e,p)}
              on:click={()=>{selectedId=p.id; editFormula=p.formula;}}>
              <span class="mod-label">{p.label}</span>
              <button class="x" 
                on:pointerdown|stopPropagation
                on:mousedown|stopPropagation
                on:touchstart|stopPropagation
                on:click|stopPropagation={()=>deleteField(p.id)}>✕</button>
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
      </div>
    {/if}
    <div class="formula-builder" style="border-color:{selectedTheme.color}; background:{selectedTheme.light}">
      <div class="fb-head"><b>Formula - {selectedTheme.name}</b></div>
      <textarea bind:value={editFormula} on:input={saveFormula} rows="2" class="fb-ta" maxlength="200" placeholder="Select fields"></textarea>
      <div class="fb-ops all-sym">
        <button on:click={()=>insertOp("(")}>(</button>
        <button on:click={()=>insertOp(")")}>)</button>
        <button on:click={()=>insertOp("+")}>+</button>
        <button on:click={()=>insertOp("-")}>−</button>
        <button on:click={()=>insertOp("×")}>×</button>
        <button on:click={()=>insertOp("÷")}>÷</button>
        <button on:click={()=>insertOp("%")}>%</button>
        <button on:click={()=>insertOp("100")}>100</button>
      </div>
      <div class="fb-sec"><b>Available Fields</b>{#each numberFields as bf}<button class="fb-field" on:click={()=>insertField(bf.field_name)}>📥 {bf.label} → {'{'+bf.field_name+'}'}</button>{/each}</div>
      <button class="savef" style="background:{selectedTheme.color}" on:click={saveFormula}>💾 Save Formula</button>
    </div>
  </div>
</div>

<style>
  :global(body){margin:0; font-family:system-ui; background:#f8fafc;}

  /* TOP 2 LINES */
  .top-fixed.two-line{position:fixed; top:0; left:0; right:0; z-index:1000; background:white; border-bottom:1px solid #e5e7eb; display:flex; flex-direction:column; gap:0;}
  .top-line{display:flex; justify-content:space-between; align-items:center; padding:4px 6px;}
  .line1{background:#f8fafc; border-bottom:1px solid #f1f5f9; height:32px;}
  .line2{background:white; height:36px;}
  .tl1{display:flex; gap:6px; align-items:center;} .tr1{display:flex; gap:4px; align-items:center;}
  .back{width:24px; height:24px; border:none; background:#f1f5f9; border-radius:5px;}
  .dirty{font-size:7px; color:#ef4444; font-weight:700;} .saved{font-size:7px; color:#16a34a;}
  .count-badge{background:#111827; color:white; padding:0 6px; height:22px; border-radius:10px; font-size:8px; font-weight:700; display:flex; align-items:center;}
  .preview-btn{height:22px; border:1px solid #e5e7eb; background:white; border-radius:5px; font-size:8px; padding:0 6px;}
  .save{height:22px; border:none; border-radius:5px; color:white; font-weight:800; font-size:8px; padding:0 8px;}
  .t-inputs-2{display:flex; gap:6px; align-items:center; width:100%;}
  .t-field{display:flex; flex-direction:column; gap:1px; flex:1;} .t-field.small{flex:0 0 80px;}
  .t-field label{font-size:6px; font-weight:700; color:#64748b; text-transform:uppercase;}
  .t-field input, .t-field select{height:22px; border:1px solid #e5e7eb; border-radius:4px; padding:0 5px; font-size:8px; width:100%; box-sizing:border-box;}
  .toast{position:fixed; top:70px; right:8px; background:#111827; color:white; padding:6px 10px; border-radius:6px; font-size:10px; z-index:2000;}

  .layout.two-top{display:grid; grid-template-columns: 14% 50% 36%; gap:2px; margin-top:72px; height:calc(100vh - 72px); overflow:hidden;}
  .left{overflow-y:auto; background:white; border-right:1px solid #e5e7eb; padding:2px; display:flex; flex-direction:column; gap:2px;}
  .center{overflow-y:auto; background:#fcfcfc; padding:2px; display:flex; flex-direction:column; gap:3px;}
  .right{overflow-y:auto; background:#f0fdf4; padding:2px; display:flex; flex-direction:column; gap:3px;}
  .search-box{display:flex; gap:3px; align-items:center; border:1px solid #e5e7eb; border-radius:5px; padding:0 3px; background:white; height:22px; font-size:9px;}
  .search-box input{border:none; outline:none; font-size:8px; width:100%;}
  .field-grid.single-col{display:flex; flex-direction:column; gap:3px;}
  .field-row.vertical{height:34px !important; min-height:34px !important; width:100% !important; border:1px solid #f1f5f9; border-left-width:3px !important; background:white; border-radius:5px; display:flex; flex-direction:row; align-items:center; gap:6px; padding:0 6px !important;}
  .field-row.vertical .f-icon{font-size:12px !important; width:18px; height:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0;}
  .field-row.vertical .f-label-down{font-size:7px !important; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  .board-wrap{width:100%; background:white; border:1.5px solid #0ea5e9; border-radius:5px; height:52%; min-height:200px; overflow:hidden; display:flex; flex-direction:column; touch-action:none;}
  .board-scroll{flex:1; overflow:auto; touch-action:none;}
  .board{position:relative; touch-action:none;}
  .dot{position:absolute; width:1.5px; height:1.5px; background:#cbd5e1; border-radius:50%; opacity:.4;}
  .mod.reduced{position:absolute; background:white; border:1.5px solid; border-radius:6px; display:flex; align-items:center; justify-content:space-between; padding:0 3px; font-weight:700; box-shadow:0 1px 2px rgba(0,0,0,.1); touch-action:none; user-select:none; cursor:grab; box-sizing:border-box;}
  .mod.reduced.active{border-width:2px; z-index:10;}
  .mod-label{overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:68%; font-size:6px !important;}
  .x{border:none; background:#fee2e2; color:#991b1b; width:14px !important; height:14px !important; min-width:14px !important; border-radius:3px; font-size:7px !important; display:flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer; z-index:5;}
  .creating-info{padding:3px 5px; display:flex; justify-content:space-between; font-size:7px; flex-shrink:0;}
  .preview-wrap.linked.onebyone{flex:1; overflow:auto; background:white; border:1.5px solid #0ea5e9; border-radius:5px; padding:3px;}
  .preview-head{font-size:7px; font-weight:700; margin-bottom:3px;}
  .preview-white{display:flex; flex-direction:column; gap:4px;}
  .p-preview-item{display:flex; flex-direction:column; gap:1px; background:#f8fafc; border-radius:3px; padding:3px; border:1px solid #e2e8f0; border-left:2px solid #0ea5e9;}
  .p-l{font-size:8px; font-weight:700;} .p-input{height:20px; font-size:8px; border:1px dashed #cbd5e1; border-radius:3px; padding:0 4px;}
  .p-formula{font-size:7px; padding:4px; border-radius:3px; font-weight:700; text-align:center;}
  .edit-box{background:white; border:1px solid #e5e7eb; border-radius:5px; padding:3px; display:flex; flex-direction:column; gap:2px;}
  .edit-head{display:flex; justify-content:space-between; font-size:8px;} .edit-box label{font-size:7px; font-weight:700;}
  .edit-in{height:20px; border:1px solid #e2e8f0; border-radius:3px; padding:0 4px; font-size:8px;}
  .formula-builder{border:1px solid #bbf7d0; border-radius:5px; padding:3px; display:flex; flex-direction:column; gap:3px;}
  .fb-head{font-size:8px; font-weight:700;} .fb-ta{width:100%; border:1px solid #bbf7d0; border-radius:3px; padding:3px; font-size:8px; resize:none; box-sizing:border-box;}
  .fb-ops.all-sym{display:grid; grid-template-columns:repeat(4,1fr); gap:3px; width:100%;}
  .fb-ops.all-sym button{height:20px !important; min-height:20px !important; border:1px solid #d1d5db; background:white; border-radius:4px; font-weight:700; font-size:9px !important; display:flex; align-items:center; justify-content:center; padding:0 !important; line-height:1; cursor:pointer;}
  .fb-sec{display:flex; flex-direction:column; gap:2px; font-size:7px;} .fb-field{width:100%; min-height:22px; border:1px solid #e5e7eb; border-radius:10px; font-size:7px; background:white; padding:3px 5px; text-align:left;}
  .savef{height:26px; border:none; border-radius:5px; color:white; font-weight:700; font-size:8px;}
  @media (max-width:480px){
    .layout.two-top{grid-template-columns: 22% 40% 38%; margin-top:68px; height:calc(100vh - 68px);}
    .line2{height:auto; padding:3px 4px;}
    .t-inputs-2{gap:3px; flex-wrap:wrap;}
    .t-field.small{flex:1 0 60px;}
  }
</style>