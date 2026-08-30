<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { authUserName, authUserId, getTemplateOwner } from "$lib/stores/auth";
  import { supabaseTemplates } from "$lib/supabase";

  function uuid(){ return Math.random().toString(36).substring(2,9); }
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
    { id:"emerald", name:"Emerald Pro", color:"#10b981", light:"#ecfdf5", dark:"#065f46", use:"Production Day" },
    { id:"ocean", name:"Ocean Blue", color:"#0ea5e9", light:"#e0f2fe", dark:"#0c4a6e", use:"Quality Audit" },
    { id:"sunset", name:"Sunset Amber", color:"#f59e0b", light:"#fffbeb", dark:"#78350f", use:"Evening Report" },
    { id:"slate", name:"Slate Corporate", color:"#334155", light:"#f1f5f9", dark:"#0f172a", use:"Official Finance" },
    { id:"royal", name:"Royal Purple", color:"#8b5cf6", light:"#ede9fe", dark:"#4c1d95", use:"Management" },
    { id:"ruby", name:"Ruby Red", color:"#ef4444", light:"#fef2f2", dark:"#7f1d1d", use:"Urgent Breakdown" },
    { id:"teal", name:"Teal Medical", color:"#14b8a6", light:"#ccfbf1", dark:"#134e4a", use:"Safety Hygiene" },
    { id:"indigo", name:"Indigo Night", color:"#6366f1", light:"#e0e7ff", dark:"#312e81", use:"Night Shift" },
    { id:"forest", name:"Forest Dark", color:"#16a34a", light:"#dcfce7", dark:"#052e16", use:"Maintenance" },
    { id:"charcoal", name:"Charcoal Elite", color:"#111827", light:"#ffffff", dark:"#000000", use:"Executive" },
  ];
  let selectedTheme = themes[8];
  let creatingTime = new Date();
  $: timeLabel = creatingTime.toLocaleTimeString();
  $: timeColor = selectedTheme.color;

  let templateName="Daily Tracker";
  let templateCode="PROD-01";
  let category="Production";
  let cols=38; let rows=18; let gap=16;
  type Placed = { id:string, defId:string, label:string, field_name:string, type:FieldType, metric?:string, options:string[], formula:string, x:number, y:number, w:number, h:number, color:string, border:string, required?:boolean };
  let placed: Placed[] = [
    { id:uuid(), defId:"", label:"Daily Tracker", field_name:"daily_tracker", type:"text", options:[], formula:"", x:1, y:0, w:5, h:3, color:"#3b82f6", border:"#3b82f6" },
    { id:uuid(), defId:"", label:"Enter input", field_name:"enter_input", type:"number", metric:"input", options:[], formula:"", x:1, y:4, w:5, h:3, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Enter Output", field_name:"enter_output", type:"number", metric:"output", options:[], formula:"", x:1, y:8, w:5, h:3, color:"#111827", border:"#111827" },
    { id:uuid(), defId:"", label:"Formula", field_name:"formula", type:"formula", options:[], formula:"{enter_output} ÷ {enter_input} × 100", x:1, y:12, w:5, h:3, color:"#16a34a", border:"#f59e0b" },
  ];
  let drag:Placed|null=null; let dragOff={x:0,y:0}; let selectedId=placed[3].id;
  $: selected = placed.find(p=>p.id===selectedId);
  $: numberFields = placed.filter(p=>p.metric || p.type==='number' || p.type==='dropdown');
  let editFormula = "{enter_output} ÷ {enter_input} × 100";
  let savedCount = 0; let isDirty = true; let showChatPopup = false; let toast = ""; let showSavedPopup = false; let savedTemplates: any[] = []; let dropdownNewOption = ""; let currentUserName = ""; let currentUserId = ""; let chatValues: Record<string,any> = {}; let showCleanupPopup = false; let idealTemplates: any[] = []; let cleanupZipSaved = false;

  function evaluateChatFormula(formulaStr: string, vals: Record<string,any>): string {
    if(!formulaStr) return "0.00 %";
    try{
      let expr = formulaStr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');
      expr = expr.replace(/\{([^}]+)\}/g, (_, k)=>{
        let v = vals[k.trim()];
        if(v===undefined || v==="" || v===null) return "0";
        let num = Number(v);
        return isNaN(num)? "0" : String(num);
      });
      expr = expr.replace(/%/g,'');
      let r = Function('"use strict"; return ('+expr+')')();
      if(r===undefined || isNaN(r) ||!isFinite(r)) return "0.00 %";
      return Number(r).toFixed(2) + " %";
    }catch{ return "0.00 %"; }
  }
  function getChatFormula(p: Placed){ return evaluateChatFormula(p.formula, chatValues); }
  function onChatInput(fname: string, val: string){ chatValues[fname]=val; chatValues={...chatValues}; }

  onMount(async ()=>{
    try{
      const { data: { user } } = await supabaseTemplates.auth.getUser();
      if(user){ currentUserName=user.email||user.id; currentUserId=user.id; }
      else{
        const owner = getTemplateOwner();
        currentUserName = owner.owner_name || get(authUserName) || "Account User";
        currentUserId = owner.owner_id || get(authUserId) || currentUserName;
      }
    }catch{
      const owner = getTemplateOwner();
      currentUserName = owner.owner_name || get(authUserName) || "Account User";
      currentUserId = owner.owner_id || get(authUserId) || currentUserName;
    }
    creatingTime = new Date();
    setInterval(()=> creatingTime = new Date(), 1000);
    try{
      const savedTheme = localStorage.getItem("template_theme_id");
      if(savedTheme){ const found = themes.find(t=>t.id===savedTheme); if(found) selectedTheme = found; }
      const edit = localStorage.getItem("edit_template");
      if(edit){
        const t = JSON.parse(edit);
        if(t && t.id){
          templateName = t.name; templateCode = t.code || t.template_code || ""; category = t.category || "Production";
          if(t.theme){ const f = themes.find(x=>x.id===t.theme); if(f) selectedTheme = f; }
          if(Array.isArray(t.fields)) placed = t.fields; else if(Array.isArray(t.data?.fields)) placed = t.data.fields;
          if(placed.length>0) selectedId = placed[0].id;
          localStorage.removeItem("edit_template");
        }
      }
    }catch{}
    loadSaved();
  });
  function loadSaved(){ try{ let t = JSON.parse(localStorage.getItem("templates")||"[]"); savedTemplates = t; savedCount = t.length; }catch{ savedCount=0; savedTemplates=[]; } }
  function quickAdd(def:FieldDef){
    const w=5; const h=3; const x=(placed.length*6)%(38-w); const y=(placed.length*4)%(18-h);
    placed=[...placed, { id:uuid(), defId:def.id, label:def.label, field_name:def.label.toLowerCase().replace(/\s+/g,"_")+"_"+uuid().slice(0,3), type:def.type, metric:def.metric, options:[...(def.options||[])], formula:def.type==='formula'? "{enter_output} ÷ {enter_input} × 100" : "", x, y, w, h, color:def.color, border:def.border, required:def.required }];
    selectedId=placed[placed.length-1].id; if(placed[placed.length-1].type==='formula') editFormula = placed[placed.length-1].formula; isDirty=true;
  }
  function onDown(e:MouseEvent, p:Placed){ drag=p; selectedId=p.id; editFormula=p.formula||""; const b=document.getElementById("board")!.getBoundingClientRect(); dragOff.x=e.clientX-b.left-p.x*gap; dragOff.y=e.clientY-b.top-p.y*gap; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }
  function onMove(e:MouseEvent){ if(!drag) return; const b=document.getElementById("board")!.getBoundingClientRect(); let nx=Math.round((e.clientX-b.left-dragOff.x)/gap); let ny=Math.round((e.clientY-b.top-dragOff.y)/gap); nx=Math.max(0,Math.min(cols-drag.w,nx)); ny=Math.max(0,Math.min(rows-drag.h,ny)); placed=placed.map(pl=> pl.id===drag!.id? {...pl, x:nx, y:ny}:pl); isDirty=true; }
  function onUp(){ drag=null; window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); }
  function insertOp(t:string){ editFormula+= (editFormula?" ":"") + t + " "; saveFormula(); }
  function insertField(fn:string){ editFormula+= `{${fn}} `; if(selected){ selected.formula=editFormula; placed=[...placed]; } isDirty=true; }
  function saveFormula(){ if(selected){ selected.formula=editFormula; placed=[...placed]; } isDirty=true; }
  function updateSelectedLabel(val:string){ if(!selected) return; selected.label = val; selected.field_name = val.toLowerCase().replace(/[^a-z0-9]+/g,"_"); placed=[...placed]; isDirty=true; }
  function addDropdownOption(){ if(!selected) return; if(!dropdownNewOption.trim()) return; selected.options = [...(selected.options||[]), dropdownNewOption.trim()]; placed=[...placed]; dropdownNewOption=""; isDirty=true; }
  function removeOption(idx:number){ if(!selected) return; selected.options.splice(idx,1); selected.options = [...selected.options]; placed=[...placed]; isDirty=true; }
  async function saveTemplate(){
    if(!templateName.trim()){ toast="Enter Template Name"; setTimeout(()=>toast="",2000); return; }
    let all:any[] = []; try{ all = JSON.parse(localStorage.getItem("templates")||"[]"); }catch{ all=[]; }
    let owner = getTemplateOwner(); let realIdStr = owner.owner_id; let realEmail = owner.owner_name || owner.owner_email || "user"; let realUUID: string | null = null;
    try{ const { data: { user } } = await supabaseTemplates.auth.getUser(); if(user){ realEmail = user.email || user.id; realIdStr = user.email || user.id; if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)){ realUUID = user.id; } owner = { owner_id: user.id, owner_name: user.email || user.id, owner_email: user.email || '' }; } }catch{}
    const newId = crypto.randomUUID(); const finalCode = (templateCode.trim() || `PROD-${Date.now().toString().slice(-4)}`).toUpperCase().replace(/\s+/g,'-');
    const normalized = placed.map(p=>({ ...p, field_name:(p.field_name||p.label.toLowerCase().replace(/[^a-z0-9]+/g,"_")).toLowerCase(), name:(p.field_name||p.label.toLowerCase().replace(/[^a-z0-9]+/g,"_")).toLowerCase() }));
    let obj = { id:newId, name:templateName, code:finalCode, template_code:finalCode, t_code:finalCode, category, theme:selectedTheme.id, theme_color:selectedTheme.color, fields:normalized, data:{ fields:normalized }, owner_id: realIdStr, owner_name: realEmail, allow_all_contacts:false, createdAt:new Date().toISOString() };
    all=[obj,...all]; localStorage.setItem("templates", JSON.stringify(all)); localStorage.setItem("template_theme_id", selectedTheme.id); savedTemplates = all; savedCount = all.length; isDirty=false;
    try{
      const baseData = { fields: normalized, department: category, owner_id: realIdStr, owner_name: realEmail, owner_email: realEmail, owner_uuid: realUUID, allow_all_contacts: false, shared_with: [], theme: selectedTheme.id, theme_color: selectedTheme.color, code: finalCode, t_code: finalCode };
      let payload:any = { id: newId, name: templateName, template_code: finalCode, data: baseData }; if(realUUID) payload.owner_id = realUUID;
      let { error } = await supabaseTemplates.from('templates').insert(payload);
      if(error){ delete payload.owner_id; const res2 = await supabaseTemplates.from('templates').insert(payload); if(res2.error){ const minimal = { id:newId, name:templateName, template_code:finalCode, data: baseData }; const res3 = await supabaseTemplates.from('templates').insert(minimal); if(res3.error) throw res3.error; toast=`✅ Saved minimal - ${finalCode} 🔒`; } else { toast=`✅ Saved to DB - ${finalCode} 🔒 Private`; } } else { toast=`✅ Saved to DB: ${finalCode} 🔒`; }
    }catch(e:any){ toast=`Saved locally - ${e?.message?.slice(0,40)}`; }
    setTimeout(()=>toast="",3000); showSavedPopup=true; showChatPopup=false;
  }
  function handleBack(){ if(isDirty){ if(!confirm("Not Saved! Leave without saving?")) return; } history.back(); }
  async function deleteSaved(id:string){ if(!confirm("Delete this template?")) return; savedTemplates = savedTemplates.filter(t=>t.id!==id); localStorage.setItem("templates", JSON.stringify(savedTemplates)); savedCount = savedTemplates.length; try{ if(id.length>20) await supabaseTemplates.from('templates').delete().eq('id', id); }catch{} }
  function pickTheme(t:any){ selectedTheme=t; localStorage.setItem("template_theme_id", t.id); isDirty=true; }
</script>

<div class="top-fixed">
  <div class="tl">
    <button class="back" on:click={handleBack}>←</button>
    <b class="builder-title">Builder - {currentUserName}</b>
    <div class="top-inputs">
      <input bind:value={templateName} placeholder="Template Name *" />
      <input bind:value={templateCode} placeholder="Code" class="code-in" />
      <select bind:value={category}><option>Production</option><option>Quality</option><option>Maintenance</option></select>
    </div>
    {#if isDirty}<span class="dirty">● Not Saved</span>{:else}<span class="saved">✓ Saved</span>{/if}
  </div>
  <div class="tr">
    <span class="count-badge" on:click={()=>{loadSaved(); showSavedPopup=true;}} style="cursor:pointer;">Saved: {savedCount} ▼</span>
    <button class="preview-btn" on:click={()=>showChatPopup=true}>💬 Chat</button>
    <button class="save" style="background:{selectedTheme.color}; color:white" on:click={saveTemplate}>Save to DB</button>
  </div>
  {#if toast}<div class="toast">{toast}</div>{/if}
</div>

<div class="layout">
  <!-- 10% FIELDS -->
  <div class="left">
    <div class="search-box"><span>🔍</span><input placeholder="Search" /></div>
    <div class="field-grid">
      {#each allFields as f}
        <button class="field-row" data-label={f.label} style="border-left:4px solid {f.border};" on:click={()=>quickAdd(f)}><span class="f-icon">{f.icon}</span><span class="f-label">{f.label}</span></button>
      {/each}
    </div>
    <div class="theme-panel">
      <b class="theme-title">🎨 10 Colors</b>
      <select class="theme-select" value={selectedTheme.id} on:change={(e)=>{ const v=(e.target as HTMLSelectElement).value; const th=themes.find(t=>t.id===v); if(th) pickTheme(th); }}>
        {#each themes as th}<option value={th.id}>{th.name} - {th.color}</option>{/each}
      </select>
      <div class="time-box">
        <small>{timeLabel}</small>
        <div class="time-row"><span class="t-box" style="background:{timeColor}"></span><span style="font-size:8px;">{timeColor}</span></div>
      </div>
    </div>
  </div>

  <!-- 60% DESIGN BOARD + PREVIEW CASCADE -->
  <div class="center">
    <div class="board-wrap" style="border-color:{selectedTheme.color}">
      <div class="board-scroll">
        <div id="board" class="board" style="height:{rows*gap+16}px; width:{cols*gap+24}px;">
          {#each Array(rows) as _,r}{#each Array(cols) as _,c}<div class="dot" style="left:{c*gap+12}px; top:{r*gap+12}px;"></div>{/each}{/each}
          {#each placed as p}
            <div class="mod" class:active={selectedId===p.id} style="left:{p.x*gap+8}px; top:{p.y*gap+8}px; width:{p.w*gap-4}px; height:{p.h*gap-6}px; border-color:{p.border}; color:{p.color};" on:mousedown={(e)=>onDown(e,p)} on:click={()=>{selectedId=p.id; editFormula=p.formula; dropdownNewOption="";}}>
              <span>{p.label}</span><button class="x" on:click|stopPropagation={()=>{placed=placed.filter(x=>x.id!==p.id); isDirty=true;}}>✕</button>
            </div>
          {/each}
        </div>
      </div>
      <div class="creating-info" style="background:{selectedTheme.light}; border-top:1px solid {selectedTheme.color}">
        <b>📅 Creating Time: {creatingTime.toLocaleString()}</b>
        <div class="creating-colors"><span class="c-box big" style="background:{selectedTheme.color}"></span><b style="color:{selectedTheme.color}">{selectedTheme.name} - {selectedTheme.color}</b></div>
      </div>
    </div>

    <div class="preview-wrap" style="border-color:{selectedTheme.color}">
      <div class="preview-head">◉ Preview - White Area - Theme: {selectedTheme.name} <span style="background:{selectedTheme.color}; color:white; padding:2px 8px; border-radius:10px; font-size:8px;">{selectedTheme.color}</span></div>
      <div class="preview-white" style="border-left:4px solid {selectedTheme.color}">
        {#each placed as p}
          <div class="p-preview-item">
            <input class="p-label" value={p.label} on:input={(e)=>{ p.label=e.currentTarget.value; p.field_name=e.currentTarget.value.toLowerCase().replace(/[^a-z0-9]+/g,"_"); placed=[...placed]; isDirty=true; }} />
            {#if p.type!=='formula'}
              <input class="p-input" placeholder="Enter {p.label}" value={p.type==='number'?'0':''} />
            {:else}
              <input class="p-input" style="background:{selectedTheme.light}; color:{selectedTheme.dark}; font-weight:700; text-align:center; border-color:{selectedTheme.color}" value="⚡ Auto Calculated" readonly />
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- 30% FORMULA + EDIT -->
  <div class="right">
    {#if selected}
      <div class="edit-box" style="border-color:{selectedTheme.color}">
        <div class="edit-head"><b>✏️ {selected.label}</b><small style="background:{selectedTheme.light}">{selected.type}</small></div>
        <label>Label</label><input class="edit-in" value={selected.label} on:input={(e)=>updateSelectedLabel(e.currentTarget.value)} />
        <label>Field Name</label><input class="edit-in" value={selected.field_name} readonly style="background:#f1f5f9;" />
        {#if selected.type==='dropdown'}
          <div class="edit-sec"><b>Options</b>{#each selected.options as opt,i}<div class="opt-row"><span>{opt}</span><button on:click={()=>removeOption(i)}>✕</button></div>{/each}
          <div class="opt-add"><input placeholder="New" bind:value={dropdownNewOption} on:keydown={(e)=>{ if(e.key==='Enter') addDropdownOption(); }} /><button on:click={addDropdownOption} style="background:{selectedTheme.color}">Add</button></div></div>
        {/if}
      </div>
    {:else}
      <div class="edit-box" style="text-align:center; color:#64748b; padding:12px; font-size:10px;">👈 Select from Board</div>
    {/if}

    <div class="formula-builder" style="border-color:{selectedTheme.color}; background:{selectedTheme.light}">
      <div class="fb-head"><div class="fb-ico" style="border:1px solid {selectedTheme.color}">🧮</div><div><b style="font-size:11px;">Formula Builder - {selectedTheme.name}</b><br><span style="font-size:9px;">Theme {selectedTheme.color}</span></div></div>
      <label>Formula</label>
      <textarea bind:value={editFormula} on:input={saveFormula} placeholder="Select fields and operators" rows="3" class="fb-ta" style="border-color:{selectedTheme.color}"></textarea>
      <div class="fb-ops"><button on:click={()=>insertOp("(")}>(</button><button on:click={()=>insertOp(")")}>)</button><button on:click={()=>insertOp("+")}>+</button><button on:click={()=>insertOp("-")}>−</button><button on:click={()=>insertOp("×")}>×</button><button on:click={()=>insertOp("÷")}>÷</button><button on:click={()=>insertOp("%")}>%</button><button on:click={()=>insertOp("100")}>100</button></div>
      <div class="fb-sec"><b>Available Fields</b><small>Click to insert</small>
        {#each numberFields as bf}<button class="fb-field" style="border-color:{selectedTheme.color}" on:click={()=>insertField(bf.field_name)}>📥 {bf.label} → {'{'+bf.field_name+'}'}</button>{/each}
      </div>
      <div class="fb-sec"><b>Common</b>
        <button class="common" on:click={()=>{editFormula="{output} ÷ {input} × 100"; saveFormula();}}><span>Yield %</span><code>{`{output} ÷ {input} × 100`}</code></button>
        <button class="common" on:click={()=>{editFormula="{retest} ÷ {input} × 100"; saveFormula();}}><span>Retest %</span><code>{`{retest} ÷ {input} × 100`}</code></button>
      </div>
      <button class="savef" style="background:{selectedTheme.color}" on:click={saveFormula}>💾 Save Formula</button>
    </div>
  </div>
</div>

{#if showSavedPopup}
<div class="chat-overlay" on:click={()=>showSavedPopup=false}><div class="saved-popup" on:click|stopPropagation><div class="saved-head" style="border-bottom:3px solid {selectedTheme.color}"><b>📦 Saved ({savedCount})</b><button on:click={()=>showSavedPopup=false}>✕</button></div><div class="saved-body">{#each savedTemplates as t}{@const th = themes.find(x=>x.id===t.theme) || selectedTheme}<div class="saved-item" style="border-left:4px solid {th.color}; background:{th.light}"><div class="saved-info"><b>{t.name}</b><small>{t.code} • {new Date(t.createdAt).toLocaleString()}</small></div><div class="saved-actions"><button class="del" on:click={()=>deleteSaved(t.id)}>🗑️</button></div></div>{/each}</div><div class="saved-foot"><button on:click={()=>showSavedPopup=false}>Close</button></div></div></div>
{/if}

{#if showChatPopup}
<div class="chat-overlay" on:click={()=>showChatPopup=false}><div class="chat-popup" on:click|stopPropagation><div class="chat-head" style="border-bottom:3px solid {selectedTheme.color}"><b>📋 {templateName}</b><button on:click={()=>showChatPopup=false}>✕</button></div><div class="chat-body">{#each placed as p}<div class="chat-field"><label>{p.label}</label>{#if p.type==='formula'}<input class="chat-input formula-chat" style="border-color:{selectedTheme.color}!important; background:{selectedTheme.light}!important;" readonly value={getChatFormula(p)} />{:else}<input class="chat-input" placeholder="Enter {p.label}" value={chatValues[p.field_name]??""} on:input={(e)=>onChatInput(p.field_name, e.currentTarget.value)} />{/if}</div>{/each}</div><div class="chat-foot"><button on:click={()=>showChatPopup=false}>Close</button><button class="send" style="background:{selectedTheme.color}">Send</button></div></div></div>
{/if}

<style>
  :global(body){margin:0; font-family:system-ui,-apple-system; background:#f8fafc;}
  .top-fixed{position:fixed; top:0; left:0; right:0; z-index:1000; background:white; border-bottom:1px solid #e5e7eb; padding:4px; display:flex; justify-content:space-between; gap:6px; align-items:center;}
  .tl{display:flex; gap:6px; align-items:center; flex:1; min-width:0;}
  .tr{display:flex; gap:4px; align-items:center; flex-shrink:0;}
  .builder-title{font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px;}
  .top-inputs{display:flex; gap:4px; flex:1;}
  .top-inputs input, .top-inputs select{height:26px; border:1px solid #e5e7eb; border-radius:6px; padding:0 6px; font-size:10px; width:70px; flex:1; min-width:0;}
  .code-in{flex:0 0 60px !important; width:60px !important;}
  .back{width:26px; height:26px; border:none; background:#f1f5f9; border-radius:6px; flex-shrink:0;}
  .dirty{font-size:8px; color:#ef4444; font-weight:700; white-space:nowrap;}
  .saved{font-size:8px; color:#16a34a; font-weight:700;}
  .count-badge{background:#111827; color:white; border:none; padding:0 8px; height:26px; border-radius:12px; font-size:9px; font-weight:700;}
  .preview-btn{height:26px; border:1px solid #e5e7eb; background:#f8fafc; border-radius:6px; font-size:9px; padding:0 8px;}
  .save{height:26px; border:none; border-radius:6px; color:white; font-weight:800; font-size:9px; padding:0 10px;}
  .toast{position:fixed; top:50px; right:8px; background:#111827; color:white; padding:6px 10px; border-radius:6px; font-size:10px; z-index:2000;}

  /* 10-60-30 GRID - MOBILE + DESKTOP SAME */
  .layout{
    display:grid;
    grid-template-columns: 12% 52% 36%; /* mobile: 12/52/36 = ~10/60/30 */
    gap:2px;
    margin-top:44px;
    height:calc(100vh - 44px);
    background:#f8fafc;
    overflow:hidden;
  }
  .left{overflow-y:auto; background:white; border-right:1px solid #e5e7eb; padding:3px; display:flex; flex-direction:column; gap:4px;}
  .center{overflow-y:auto; background:#fcfcfc; padding:3px; display:flex; flex-direction:column; gap:4px; border-right:1px solid #e5e7eb;}
  .right{overflow-y:auto; background:#f0fdf4; padding:3px; display:flex; flex-direction:column; gap:4px;}

  /* Fields 10% */
  .search-box{display:flex; gap:4px; align-items:center; border:1px solid #e5e7eb; border-radius:6px; padding:0 4px; background:white; height:26px; font-size:10px;}
  .search-box input{border:none; outline:none; font-size:9px; width:100%; background:transparent;}
  .field-grid{display:flex; flex-direction:column; gap:3px;}
  .field-row{height:28px; min-height:28px; border:1px solid #f1f5f9; border-left:3px solid #111827; background:white; border-radius:6px; display:flex; align-items:center; gap:4px; padding:0 4px; font-size:9px; font-weight:600; text-align:left; overflow:hidden;}
  .f-icon{font-size:12px; flex-shrink:0;}
  .f-label{overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:8px;}
  .theme-panel{display:flex; flex-direction:column; gap:3px; margin-top:4px;}
  .theme-title{font-size:8px; font-weight:800; text-align:center;}
  .theme-select{height:24px; font-size:8px; border:1px solid #e5e7eb; border-radius:4px; width:100%;}
  .time-box{font-size:8px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:4px; padding:3px; text-align:center;}
  .time-row{display:flex; align-items:center; justify-content:center; gap:3px; margin-top:2px;}
  .t-box{width:10px; height:10px; border-radius:3px; display:inline-block; border:1px solid #0002;}

  /* Board 60% */
  .board-wrap{width:100%; background:white; border:1.5px solid #16a34a; border-radius:6px; height:52%; min-height:220px; overflow:hidden; display:flex; flex-direction:column; flex-shrink:0;}
  .board-scroll{flex:1; overflow:auto; -webkit-overflow-scrolling:touch;}
  .board{position:relative; background-image:radial-gradient(#e5e7eb 1px, transparent 1px); background-size:16px 16px;}
  .dot{display:none;}
  .mod{position:absolute; background:white; border:2px solid; border-radius:6px; display:flex; align-items:center; justify-content:space-between; padding:0 4px; font-size:8px; font-weight:700; box-shadow:0 1px 2px rgba(0,0,0,.08);}
  .mod.active{outline:2px solid #111827; z-index:10;}
  .x{border:none; background:#f1f5f9; width:14px; height:14px; border-radius:3px; font-size:8px;}
  .creating-info{padding:4px 6px; display:flex; justify-content:space-between; align-items:center; font-size:8px; flex-shrink:0;}
  .creating-colors{display:flex; gap:4px; align-items:center;}
  .c-box{width:12px; height:12px; border-radius:3px; display:inline-block;}
  .c-box.big{width:16px; height:16px;}

  .preview-wrap{width:100%; background:white; border:1.5px solid #16a34a; border-radius:6px; padding:4px; flex:1; overflow:auto; display:flex; flex-direction:column;}
  .preview-head{font-size:8px; font-weight:700; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;}
  .preview-white{display:flex; flex-direction:column; gap:4px; padding:4px; background:white; border-radius:4px;}
  .p-preview-item{display:flex; flex-direction:column; gap:2px;}
  .p-label{height:20px; border:1px dashed #94a3b8; border-radius:4px; font-size:8px; font-weight:700; padding:0 6px; background:#fff;}
  .p-input{height:24px; border:1px dashed #cbd5e1; border-radius:4px; font-size:9px; padding:0 6px; background:#f8fafc;}

  /* Formula 30% */
  .edit-box{background:white; border:1px solid #e5e7eb; border-radius:6px; padding:4px; display:flex; flex-direction:column; gap:3px;}
  .edit-head{display:flex; justify-content:space-between; align-items:center; font-size:9px;}
  .edit-box label{font-size:8px; font-weight:700; margin-top:2px;}
  .edit-in{height:22px; border:1px solid #e2e8f0; border-radius:4px; padding:0 6px; font-size:9px;}
  .edit-sec{border-top:1px solid #f1f5f9; margin-top:4px; padding-top:4px;}
  .opt-row{display:flex; justify-content:space-between; font-size:8px; padding:2px 0;}
  .opt-add{display:flex; gap:3px; margin-top:3px;}
  .opt-add input{flex:1; height:20px; font-size:8px; border:1px solid #e5e7eb; border-radius:4px; padding:0 4px;}
  .opt-add button{height:20px; font-size:8px; border:none; border-radius:4px; color:white; padding:0 6px;}

  .formula-builder{border:1px solid #bbf7d0; border-radius:6px; padding:4px; display:flex; flex-direction:column; gap:4px;}
  .fb-head{display:flex; gap:6px; align-items:center; background:white; border-radius:4px; padding:4px;}
  .fb-ico{width:24px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:12px; background:white;}
  .fb-ta{width:100%; border:1px solid #bbf7d0; border-radius:4px; padding:4px; font-size:9px; box-sizing:border-box; resize:none;}
  .fb-ops{display:grid; grid-template-columns:repeat(4,1fr); gap:3px;}
  .fb-ops button{height:28px; border:1px solid #e5e7eb; background:white; border-radius:6px; font-weight:700; font-size:11px; box-shadow:0 1px 1px rgba(0,0,0,.04);}
  .fb-sec{display:flex; flex-direction:column; gap:3px; margin-top:2px;}
  .fb-sec b{font-size:9px;}
  .fb-sec small{font-size:7px; color:#64748b;}
  .fb-field{width:100%; min-height:28px; border:1px solid #e5e7eb; border-radius:12px; font-size:8px; background:white; padding:4px 6px; text-align:left;}
  .common{display:flex; justify-content:space-between; align-items:center; background:white; border:1px solid #e5e7eb; border-radius:6px; padding:4px 6px; font-size:8px; width:100%;}
  .common code{font-size:7px; background:#f1f5f9; padding:1px 4px; border-radius:4px;}
  .savef{height:28px; border:none; border-radius:6px; color:white; font-weight:700; font-size:9px;}

  /* Overlays */
  .chat-overlay{position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:3000; padding:10px;}
  .saved-popup,.chat-popup{background:white; border-radius:10px; width:95%; max-width:400px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden;}
  .saved-head,.chat-head{display:flex; justify-content:space-between; align-items:center; padding:8px 10px; border-bottom:1px solid #e5e7eb; font-size:11px;}
  .saved-body,.chat-body{flex:1; overflow:auto; padding:8px; display:flex; flex-direction:column; gap:6px;}
  .saved-item{display:flex; justify-content:space-between; align-items:center; padding:6px; border-radius:6px; font-size:10px;}
  .saved-foot,.chat-foot{display:flex; justify-content:space-between; padding:8px; border-top:1px solid #e5e7eb; gap:6px;}
  .chat-field{display:flex; flex-direction:column; gap:3px;}
  .chat-field label{font-size:9px; font-weight:600;}
  .chat-input{height:28px; border:1px solid #e5e7eb; border-radius:6px; padding:0 8px; font-size:10px;}

  @media (min-width:769px){
    .layout{grid-template-columns: 14% 52% 34%;}
    .builder-title{max-width:200px; font-size:13px;}
    .top-inputs input, .top-inputs select{width:120px; font-size:11px;}
    .f-label{font-size:10px;}
    .field-row{height:32px;}
  }
  @media (max-width:480px){
    .layout{grid-template-columns: 16% 48% 36%;}
    .f-label{display:none;} /* icon only on very small */
    .search-box span{font-size:12px;}
    .board-wrap{height:45%;}
  }
</style>