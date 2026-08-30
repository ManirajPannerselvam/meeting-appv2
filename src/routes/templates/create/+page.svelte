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
  let selectedTheme = themes[0];
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
  let savedCount = 0;
  let isDirty = true;
  let showChatPopup = false;
  let toast = "";
  let showSavedPopup = false;
  let savedTemplates: any[] = [];
  let dropdownNewOption = "";
  let currentUserName = "";
  let currentUserId = "";
  let chatValues: Record<string,any> = {};
  let showCleanupPopup = false;
  let idealTemplates: any[] = [];
  let cleanupZipSaved = false;

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
          templateName = t.name;
          templateCode = t.code || t.template_code || "";
          category = t.category || "Production";
          if(t.theme){ const f = themes.find(x=>x.id===t.theme); if(f) selectedTheme = f; }
          if(Array.isArray(t.fields)) placed = t.fields;
          else if(Array.isArray(t.data?.fields)) placed = t.data.fields;
          if(placed.length>0) selectedId = placed[0].id;
          localStorage.removeItem("edit_template");
        }
      }
    }catch{}
    loadSaved();
    setTimeout(()=> checkIdealTemplates(), 2000);
  });

  function loadSaved(){
    try{
      let t = JSON.parse(localStorage.getItem("templates")||"[]");
      savedTemplates = t;
      savedCount = t.length;
    }catch{ savedCount=0; savedTemplates=[]; }
  }

  function checkIdealTemplates(){
    try{
      const all = JSON.parse(localStorage.getItem("templates")||"[]");
      const now = Date.now();
      const sixtyDays = 60*24*60*60*1000;
      const dismissed = localStorage.getItem("cleanup_dismissed");
      if(dismissed && (now - new Date(dismissed).getTime() < 24*60*60*1000)) return;
      idealTemplates = all.filter((t:any)=>{
        const created = new Date(t.createdAt || t.created_at || 0).getTime();
        return (now - created) > sixtyDays;
      });
      if(idealTemplates.length>0) showCleanupPopup = true;
    }catch{}
  }

  async function saveZipBeforeDelete(){
    try{
      let JSZip:any;
      if(!(window as any).JSZip){
        await new Promise((res, rej)=>{
          const s=document.createElement('script');
          s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          s.onload=()=>res(true);
          s.onerror=()=>rej(new Error("cdn fail"));
          document.head.appendChild(s);
        });
      }
      JSZip=(window as any).JSZip;
      const zip=new JSZip();
      idealTemplates.forEach((t:any)=>{ zip.file(`templates/${t.name}_${t.code}.json`, JSON.stringify(t,null,2)); });
      try{
        const codes=idealTemplates.map((t:any)=> t.t_code||t.code||t.template_code).filter(Boolean);
        if(codes.length>0){
          const { data: recs }=await supabaseTemplates.from('records').select('*').in('t_code', codes).limit(5000);
          if(recs && recs.length>0){
            zip.file(`database/records_backup.json`, JSON.stringify(recs,null,2));
            const headers=Object.keys(recs[0]||{});
            const csv=[headers.join(',')].concat(recs.map((r:any)=> headers.map(h=> `"${String(r[h]||r.data?.[h]||'').replace(/"/g,'""')}"`).join(','))).join('\n');
            zip.file(`database/records_backup.csv`, csv);
          }
        }
      }catch{}
      zip.file("README.txt", `BACKUP ${idealTemplates.length} templates >60days - ${new Date().toISOString()}\nMethod: Save ZIP before delete`);
      const blob=await zip.generateAsync({type:"blob"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download=`DB_TEMPLATES_60DAYS_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      cleanupZipSaved=true; toast=`✅ DB ZIP saved - ${idealTemplates.length} templates + DB`; setTimeout(()=>toast="",3000);
    }catch(e:any){
      const blob=new Blob([JSON.stringify({templates:idealTemplates, backup_date:new Date().toISOString()},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`templates_DB_backup_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
      cleanupZipSaved=true; toast=`✅ DB JSON saved`; setTimeout(()=>toast="",3000);
    }
  }

  async function deleteIdealTemplates(){
    if(!cleanupZipSaved){ toast="⚠️ Save ZIP first!"; setTimeout(()=>toast="",2500); return; }
    if(!confirm(`Delete ${idealTemplates.length} templates >60 days? ZIP saved?`)) return;
    let all=JSON.parse(localStorage.getItem("templates")||"[]");
    const ids=new Set(idealTemplates.map(t=>t.id));
    all=all.filter((t:any)=> !ids.has(t.id));
    localStorage.setItem("templates", JSON.stringify(all));
    savedTemplates=all; savedCount=all.length;
    for(const t of idealTemplates){ try{ if(t.id.length>20) await supabaseTemplates.from('templates').delete().eq('id', t.id); }catch{} }
    toast=`🗑️ Deleted ${idealTemplates.length} ideal`; idealTemplates=[]; showCleanupPopup=false; cleanupZipSaved=false; setTimeout(()=>toast="",3000);
  }
  function dismissCleanup(){ showCleanupPopup=false; localStorage.setItem("cleanup_dismissed", new Date().toISOString()); }

  function quickAdd(def:FieldDef){
    const w=5; const h=3; const x=(placed.length*6)%(38-w); const y=(placed.length*4)%(18-h);
    placed=[...placed, { id:uuid(), defId:def.id, label:def.label, field_name:def.label.toLowerCase().replace(/\s+/g,"_")+"_"+uuid().slice(0,3), type:def.type, metric:def.metric, options:[...(def.options||[])], formula:def.type==='formula'? "{enter_output} ÷ {enter_input} × 100" : "", x, y, w, h, color:def.color, border:def.border, required:def.required }];
    selectedId=placed[placed.length-1].id;
    if(placed[placed.length-1].type==='formula') editFormula = placed[placed.length-1].formula;
    isDirty=true;
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

  // ✅ FIXED - NO UUID ERROR, NO 400
  async function saveTemplate(){
    if(!templateName.trim()){ toast="Enter Template Name"; setTimeout(()=>toast="",2000); return; }
    let all:any[] = [];
    try{ all = JSON.parse(localStorage.getItem("templates")||"[]"); }catch{ all=[]; }

    // Get real UUID only if valid
    let owner = getTemplateOwner();
    let realIdStr = owner.owner_id;
    let realEmail = owner.owner_name || owner.owner_email || "user";
    let realUUID: string | null = null;

    try{
      const { data: { user } } = await supabaseTemplates.auth.getUser();
      if(user){
        realEmail = user.email || user.id;
        realIdStr = user.email || user.id;
        if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)){
          realUUID = user.id;
        }
        owner = { owner_id: user.id, owner_name: user.email || user.id, owner_email: user.email || '' };
      }
    }catch{}

    const newId = crypto.randomUUID();
    const finalCode = (templateCode.trim() || `PROD-${Date.now().toString().slice(-4)}`).toUpperCase().replace(/\s+/g,'-');
    const normalized = placed.map(p=>({ ...p, field_name:(p.field_name||p.label.toLowerCase().replace(/[^a-z0-9]+/g,"_")).toLowerCase(), name:(p.field_name||p.label.toLowerCase().replace(/[^a-z0-9]+/g,"_")).toLowerCase() }));

    let obj = {
      id:newId, name:templateName, code:finalCode, template_code:finalCode, t_code:finalCode,
      category, theme:selectedTheme.id, theme_color:selectedTheme.color,
      fields:normalized, data:{ fields:normalized },
      owner_id: realIdStr, owner_name: realEmail, allow_all_contacts:false,
      createdAt:new Date().toISOString()
    };
    all=[obj,...all];
    localStorage.setItem("templates", JSON.stringify(all));
    localStorage.setItem("template_theme_id", selectedTheme.id);
    savedTemplates = all; savedCount = all.length; isDirty=false;

    try{
      // Build payload - owner_id column ONLY if real UUID
      const baseData = {
        fields: normalized,
        department: category,
        owner_id: realIdStr,
        owner_name: realEmail,
        owner_email: realEmail,
        owner_uuid: realUUID,
        allow_all_contacts: false,
        shared_with: [],
        theme: selectedTheme.id,
        theme_color: selectedTheme.color,
        code: finalCode,
        t_code: finalCode
      };

      let payload:any = {
        id: newId,
        name: templateName,
        template_code: finalCode,
        data: baseData
      };
      if(realUUID) payload.owner_id = realUUID; // add only if valid UUID

      console.log("Sending:", payload);
      let { error } = await supabaseTemplates.from('templates').insert(payload);

      if(error){
        console.warn("First insert fail:", error.message);
        // Retry without owner_id column
        delete payload.owner_id;
        const res2 = await supabaseTemplates.from('templates').insert(payload);
        if(res2.error){
          console.warn("Second fail:", res2.error.message);
          // Final minimal - only id, name, template_code, data
          const minimal = { id:newId, name:templateName, template_code:finalCode, data: baseData };
          const res3 = await supabaseTemplates.from('templates').insert(minimal);
          if(res3.error) throw res3.error;
          toast=`✅ Saved minimal - ${finalCode} 🔒`;
        } else {
          toast=`✅ Saved to DB - ${finalCode} 🔒 Private`;
        }
      } else {
        toast=`✅ Saved to DB: ${finalCode} 🔒`;
      }
    }catch(e:any){
      console.warn("Save failed:", e?.message);
      toast=`Saved locally - ${e?.message?.slice(0,40)}`;
    }
    setTimeout(()=>toast="",3000);
    showSavedPopup=true;
    showChatPopup=false;
  }

  function handleBack(){ if(isDirty){ if(!confirm("Not Saved! Leave without saving?")) return; } history.back(); }
  async function deleteSaved(id:string){
    if(!confirm("Delete this template?")) return;
    savedTemplates = savedTemplates.filter(t=>t.id!==id);
    localStorage.setItem("templates", JSON.stringify(savedTemplates));
    savedCount = savedTemplates.length;
    try{ if(id.length>20) await supabaseTemplates.from('templates').delete().eq('id', id); }catch{}
  }
  function pickTheme(t:any){ selectedTheme=t; localStorage.setItem("template_theme_id", t.id); isDirty=true; }
</script>

<div class="top-fixed">
  <div class="tl">
    <button class="back" on:click={handleBack}>←</button>
    <b>Builder - {currentUserName}</b>
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
  <div class="left">
    <div class="search-box"><span>🔍</span><input placeholder="Search" /></div>
    {#each allFields as f}
      <button class="field-row" style="border-left:3px solid {f.border}" on:click={()=>quickAdd(f)}><span>{f.icon}</span> {f.label}</button>
    {/each}
    <div class="theme-panel">
      <b class="theme-title">🎨 10 Professional Colors</b>
      <small class="theme-sub">Creating: {timeLabel} - Color: {selectedTheme.name}</small>
      {#each themes as th}
        <button class="theme-line" class:active={selectedTheme.id===th.id} style="border-left:4px solid {th.color}; background:{selectedTheme.id===th.id? th.light : 'white'}" on:click={()=>pickTheme(th)}>
          <span class="c-box" style="background:{th.color}"></span>
          <div class="c-info"><b>{th.name}</b><small>{th.use} • {th.color}</small></div>
          {#if selectedTheme.id===th.id}<span class="c-check">✓</span>{/if}
        </button>
      {/each}
      <div class="time-box">
        <b>⏰ Creating Time Color</b>
        <div class="time-row"><span class="t-box" style="background:{timeColor}"></span><span>{timeLabel} → {timeColor}</span></div>
        <small>Message bubble will use this color when sent</small>
      </div>
    </div>
  </div>

  <div class="center">
    <div class="template-top" style="border-left:6px solid {selectedTheme.color}; background:{selectedTheme.light}">
      <span>Design Board: {templateName} | {templateCode} | {category} | Owner: {currentUserName} | Theme: {selectedTheme.name}</span>
      <span style="display:flex; gap:8px; align-items:center;">
        <span class="c-box" style="background:{selectedTheme.color}; width:18px; height:18px;"></span>
        {selectedTheme.color}
        <span style="color:#64748b;">Fields: {placed.length} | Time: {timeLabel}</span>
      </span>
    </div>

    <div class="board-wrap" style="border-color:{selectedTheme.color}">
      <div id="board" class="board" style="height:{rows*gap+16}px;">
        {#each Array(rows) as _,r}{#each Array(cols) as _,c}<div class="dot" style="left:{c*gap+12}px; top:{r*gap+12}px;"></div>{/each}{/each}
        {#each placed as p}
          <div class="mod" class:active={selectedId===p.id} style="left:{p.x*gap+8}px; top:{p.y*gap+8}px; width:{p.w*gap-4}px; height:{p.h*gap-6}px; border-color:{p.border}; color:{p.color};" on:mousedown={(e)=>onDown(e,p)} on:click={()=>{selectedId=p.id; editFormula=p.formula; dropdownNewOption="";}}>
            <span>{p.label}</span><button class="x" on:click|stopPropagation={()=>{placed=placed.filter(x=>x.id!==p.id); isDirty=true;}}>✕</button>
          </div>
        {/each}
      </div>
      <div class="creating-info" style="background:{selectedTheme.light}; border:1px solid {selectedTheme.color}">
        <b>📅 Creating Time: {creatingTime.toLocaleString()}</b>
        <div class="creating-colors">
          <span>Template Color:</span>
          <span class="c-box big" style="background:{selectedTheme.color}"></span>
          <b style="color:{selectedTheme.color}">{selectedTheme.name} - {selectedTheme.color}</b>
          <span class="c-box big" style="background:{selectedTheme.dark}"></span>
          <span class="c-box big" style="background:{selectedTheme.light}; border:1px solid {selectedTheme.color}"></span>
        </div>
        <div class="theme-mini-grid">
          {#each themes as th}
            <div class="mini-c" class:active={th.id===selectedTheme.id} style="background:{th.color}" title="{th.name} {th.color}" on:click={()=>pickTheme(th)}></div>
          {/each}
        </div>
        <small>10 professional options - color below shows sending time color for messages</small>
      </div>
    </div>

    <div class="preview-wrap" style="border-color:{selectedTheme.color}">
      <div class="preview-head">◉ Preview - White Area - Theme: {selectedTheme.name} <span style="background:{selectedTheme.color}; color:white; padding:2px 8px; border-radius:10px;">{selectedTheme.color}</span></div>
      <div class="preview-white" style="height:{rows*gap+80}px; border-left:4px solid {selectedTheme.color}">
        {#each placed as p}
          <div class="p-abs" style="left:{p.x*gap+8}px; top:{p.y*gap+8}px; width:{p.w*gap+20}px;">
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

  <div class="right">
    {#if selected}
      <div class="edit-box" style="border-color:{selectedTheme.color}">
        <div class="edit-head"><b>✏️ Edit Field</b><small style="background:{selectedTheme.light}; color:{selectedTheme.dark}; border:1px solid {selectedTheme.color}">{selected.type}</small></div>
        <label>Label</label>
        <input class="edit-in" value={selected.label} on:input={(e)=>updateSelectedLabel(e.currentTarget.value)} />
        <label>Field Name</label>
        <input class="edit-in" value={selected.field_name} readonly style="background:#f1f5f9;" />
        <label><input type="checkbox" bind:checked={selected.required} on:change={()=>{placed=[...placed]; isDirty=true;}} /> Required</label>
        {#if selected.type==='dropdown'}
          <div class="edit-sec">
            <b>Dropdown Options</b>
            {#each selected.options as opt,i}
              <div class="opt-row"><span>{opt}</span><button on:click={()=>removeOption(i)}>✕</button></div>
            {/each}
            <div class="opt-add">
              <input placeholder="New option" bind:value={dropdownNewOption} on:keydown={(e)=>{ if(e.key==='Enter') addDropdownOption(); }} />
              <button on:click={addDropdownOption} style="background:{selectedTheme.color}">Add</button>
            </div>
          </div>
        {/if}
      </div>
    {/if}
    <div class="formula-builder" style="border-color:{selectedTheme.color}; background:{selectedTheme.light}">
      <div class="fb-head"><div class="fb-ico" style="background:{selectedTheme.light}; border:1px solid {selectedTheme.color}">🧮</div><div><b>Formula Builder - {selectedTheme.name}</b><span style="color:{selectedTheme.dark}">Theme color {selectedTheme.color}</span></div></div>
      {#if selected?.type==='formula'}
        <div style="background:{selectedTheme.light}; padding:6px 8px; border-radius:6px; font-size:11px; font-weight:700; color:{selectedTheme.dark}; border:1px solid {selectedTheme.color}">Editing: {selected.label} - {selectedTheme.color}</div>
      {/if}
      <label>Formula</label>
      <textarea bind:value={editFormula} on:input={saveFormula} placeholder="Select fields and operators below" rows="5" class="fb-ta" style="border-color:{selectedTheme.color}"></textarea>
      <div class="fb-ops"><button on:click={()=>insertOp("(")}>(</button><button on:click={()=>insertOp(")")}>)</button><button on:click={()=>insertOp("+")}>+</button><button on:click={()=>insertOp("-")}>−</button><button on:click={()=>insertOp("×")}>×</button><button on:click={()=>insertOp("÷")}>÷</button><button on:click={()=>insertOp("%")}>%</button><button on:click={()=>insertOp("100")}>100</button></div>
      <div class="fb-sec"><b>Available Fields</b><small>Click to insert</small>
        {#each numberFields as bf}<button class="fb-field" style="border-color:{selectedTheme.color}" on:click={()=>insertField(bf.field_name)}>📥 {bf.label} → {'{'+bf.field_name+'}'}</button>{/each}
      </div>
      <div class="fb-sec"><b>Common Calculations</b><small>One click</small>
        <button class="common" on:click={()=>{editFormula="{output} ÷ {input} × 100"; saveFormula();}}><span>Yield %</span><code>{`{output} ÷ {input} × 100`}</code></button>
        <button class="common" on:click={()=>{editFormula="{retest} ÷ {input} × 100"; saveFormula();}}><span>Retest %</span><code>{`{retest} ÷ {input} × 100`}</code></button>
      </div>
      <button class="savef" style="background:{selectedTheme.color}" on:click={saveFormula}>💾 Save Formula</button>
    </div>
  </div>
</div>

{#if showSavedPopup}
<div class="chat-overlay" on:click={()=>showSavedPopup=false}>
  <div class="saved-popup" on:click|stopPropagation>
    <div class="saved-head" style="border-bottom:3px solid {selectedTheme.color}"><b>📦 Saved Templates ({savedCount}) by {currentUserName} - {selectedTheme.name}</b><button on:click={()=>showSavedPopup=false}>✕</button></div>
    <div class="saved-body">
      {#if savedTemplates.length===0}
        <div style="text-align:center; padding:20px; color:#64748b;">No templates saved yet</div>
      {:else}
        {#each savedTemplates as t}
          {@const th = themes.find(x=>x.id===t.theme) || selectedTheme}
          <div class="saved-item" style="border-left:4px solid {th.color}; background:{th.light}">
            <div class="saved-info"><b>{t.name} <span style="background:{th.color}; color:white; padding:1px 6px; border-radius:4px; font-size:10px;">{th.name}</span></b><small>{t.code} • {t.category} • Owner: {t.owner_name||currentUserName} • {new Date(t.createdAt).toLocaleString()} • Color {th.color}</small><small>Fields: {t.fields?.length||0} • Time: {t.creating_time? new Date(t.creating_time).toLocaleTimeString() : ''} <span class="c-box" style="background:{th.color}"></span></small></div>
            <div class="saved-actions"><button class="del" on:click={()=>deleteSaved(t.id)}>🗑️</button></div>
          </div>
        {/each}
      {/if}
    </div>
    <div class="saved-foot"><button on:click={()=>showSavedPopup=false}>Close</button><button class="green" style="background:{selectedTheme.color}" on:click={()=>{showSavedPopup=false; showChatPopup=true;}}>💬 Preview Current</button></div>
  </div>
</div>
{/if}

{#if showChatPopup}
<div class="chat-overlay" on:click={()=>showChatPopup=false}>
  <div class="chat-popup" on:click|stopPropagation>
    <div class="chat-head" style="border-bottom:3px solid {selectedTheme.color}"><b>📋 {templateName} - {selectedTheme.name}</b><small>{templateCode} • {timeLabel} • {selectedTheme.color}</small><button on:click={()=>showChatPopup=false}>✕</button></div>
    <div class="chat-body">
      <div style="background:{selectedTheme.light}; border:1px solid {selectedTheme.color}; padding:8px; border-radius:8px; display:flex; gap:6px; align-items:center; font-size:11px;"><span class="c-box big" style="background:{selectedTheme.color}"></span><b>{selectedTheme.name}</b> {selectedTheme.color} - Sending time {timeLabel}</div>
      {#each placed as p}
        <div class="chat-field"><label>{p.label}</label>
          {#if p.type==='formula'}<input class="chat-input formula-chat" style="border-color:{selectedTheme.color}!important; background:{selectedTheme.light}!important; color:{selectedTheme.dark}!important;" readonly value={getChatFormula(p)} />{:else}<input class="chat-input" placeholder="Enter {p.label}" value={chatValues[p.field_name]??""} on:input={(e)=>onChatInput(p.field_name, e.currentTarget.value)} />{/if}
        </div>
      {/each}
    </div>
    <div class="chat-foot"><button on:click={()=>showChatPopup=false}>Close</button><button class="send" style="background:{selectedTheme.color}">Send Report - {selectedTheme.name}</button></div>
  </div>
</div>
{/if}

{#if showCleanupPopup}
<div class="chat-overlay" style="z-index:4000;">
  <div class="saved-popup" style="width:480px; border:2px solid #ef4444;">
    <div class="saved-head" style="background:#fef2f2; border-bottom:3px solid #ef4444;">
      <b>⚠️ {idealTemplates.length} Templates Ideal >60 Days</b>
      <button on:click={dismissCleanup}>✕</button>
    </div>
    <div class="saved-body">
      <div style="background:#fffbeb; border:1px solid #f59e0b; padding:10px; border-radius:8px; font-size:12px;">
        <b>Follow Method:</b><br/>
        1. Save ZIP file first (backup DB + templates)<br/>
        2. Then delete old templates<br/>
        3. If needed, restore from ZIP later
      </div>
      {#each idealTemplates as t}
        <div class="saved-item" style="border-left:4px solid #ef4444;">
          <div class="saved-info">
            <b>{t.name} ({t.code})</b>
            <small>Created: {new Date(t.createdAt).toLocaleDateString()} - Age: {Math.floor((Date.now() - new Date(t.createdAt).getTime())/(1000*60*60*24))} days</small>
            <small>Owner: {t.owner_name} - Fields: {t.fields?.length||0}</small>
          </div>
        </div>
      {/each}
      {#if !cleanupZipSaved}
        <div style="background:#fee2e2; color:#b91c1c; padding:8px; border-radius:6px; font-size:11px; font-weight:700; text-align:center;">
          ⚠️ Must save ZIP before delete - Follow method
        </div>
      {:else}
        <div style="background:#ecfdf5; color:#065f46; padding:8px; border-radius:6px; font-size:11px; font-weight:700; text-align:center;">
          ✅ ZIP saved - You can now delete
        </div>
      {/if}
    </div>
    <div class="saved-foot">
      <button on:click={dismissCleanup}>Keep</button>
      <button on:click={saveZipBeforeDelete} style="background:#0ea5e9; color:white; border:none;">📦 Save ZIP First</button>
      <button on:click={deleteIdealTemplates} style="background:{cleanupZipSaved ? '#ef4444' : '#9ca3af'}; color:white; border:none;">🗑️ Delete Old</button>
    </div>
  </div>
</div>
{/if}

<style>
.top-fixed{position:fixed; top:0; left:0; right:0; height:56px; z-index:1000; background:white; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; padding:0 12px; box-sizing:border-box;}
.tl{display:flex; align-items:center; gap:10px;}
.tr{display:flex; align-items:center; gap:8px;}
.top-inputs{display:flex; gap:6px; margin-left:8px;}
.top-inputs input,.top-inputs select{padding:7px 8px; border:1px solid #e5e7eb; border-radius:6px; font-size:12px; width:130px;}
.code-in{width:80px!important;}
.back{border:none; background:#f1f5f9; width:28px; height:28px; border-radius:6px; cursor:pointer;}
.count-badge{background:#0f172a; color:white; padding:6px 10px; border-radius:20px; font-size:11px; font-weight:700;}
.preview-btn{background:#f8fafc; border:1px solid #e5e7eb; padding:7px 10px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;}
.save{border:none; padding:8px 16px; border-radius:8px; font-weight:800; cursor:pointer;}
.dirty{color:#ef4444; font-size:11px; font-weight:700;}.saved{color:#10b981; font-size:11px; font-weight:700;}
.toast{position:fixed; top:60px; right:12px; background:#111827; color:white; padding:8px 14px; border-radius:8px; font-size:12px; z-index:2000;}
.layout{margin-top:56px; display:grid; grid-template-columns:200px 1fr 340px; height:calc(100vh - 56px); overflow:hidden; background:#f8fafc;}
.left{background:white; border-right:1px solid #e5e7eb; padding:8px; overflow:auto; display:flex; flex-direction:column; gap:6px;}
.search-box{display:flex; align-items:center; gap:6px; border:1px solid #e5e7eb; border-radius:8px; padding:8px; background:white;}
.search-box input{border:none; outline:none; font-size:12px; width:100%;}
.field-row{display:flex; align-items:center; gap:8px; padding:10px 8px; background:white; border:1px solid #f1f5f9; border-radius:8px; text-align:left; cursor:pointer; font-size:12px; font-weight:500;}
.field-row:hover{background:#f8fafc;}
.theme-panel{margin-top:8px; border-top:1px solid #e5e7eb; padding-top:8px; display:flex; flex-direction:column; gap:6px;}
.theme-title{font-size:12px; color:#111827;}.theme-sub{font-size:10px; color:#64748b;}
.theme-line{display:flex; align-items:center; gap:8px; padding:8px; border:1px solid #f1f5f9; border-radius:8px; text-align:left; cursor:pointer; background:white;}
.theme-line.active{box-shadow:0 2px 8px rgba(0,0,0,.08); border-color:#111827!important;}
.c-box{width:16px; height:16px; border-radius:4px; display:inline-block; flex-shrink:0; border:1px solid rgba(0,0,0,.08);}.c-box.big{width:20px; height:20px;}
.c-info{display:flex; flex-direction:column; flex:1; gap:1px;}.c-info b{font-size:11px; color:#111827;}.c-info small{font-size:9px; color:#64748b;}
.c-check{font-size:12px; font-weight:800;}
.time-box{background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:8px; display:flex; flex-direction:column; gap:4px;}
.time-box b{font-size:11px;}.time-row{display:flex; gap:6px; align-items:center; font-size:11px; font-weight:700;}
.t-box{width:16px; height:10px; border-radius:3px; display:inline-block;}
.center{overflow:auto; padding:10px; display:flex; flex-direction:column; gap:10px;}
.template-top{display:flex; justify-content:space-between; background:white; padding:8px 10px; border-radius:10px; border:1px solid #e5e7eb; font-size:11px; font-weight:600;}
.board-wrap{background:white; border:1px solid #e5e7eb; border-radius:12px; padding:10px;}
.board{position:relative; width:100%; background:#fcfcfc; border-radius:8px; overflow:hidden;}
.dot{position:absolute; width:2px; height:2px; background:#94a3b8; border-radius:50%; opacity:.4;}
.mod{position:absolute; background:white; border:2px solid; border-radius:8px; display:flex; align-items:center; justify-content:space-between; padding:0 6px; font-size:11px; font-weight:600; cursor:grab; z-index:2; box-shadow:0 1px 4px rgba(0,0,0,.1);}
.mod.active{outline:2px solid #f59e0b; z-index:5;}
.x{border:none; background:#f1f5f9; width:16px; height:16px; border-radius:4px; cursor:pointer; font-size:10px;}
.creating-info{margin-top:10px; padding:10px; border-radius:10px; display:flex; flex-direction:column; gap:8px;}
.creating-info b{font-size:12px;}
.creating-colors{display:flex; gap:8px; align-items:center; font-size:11px; flex-wrap:wrap;}
.theme-mini-grid{display:flex; gap:4px; flex-wrap:wrap;}
.mini-c{width:22px; height:14px; border-radius:4px; cursor:pointer; border:2px solid transparent;}
.mini-c.active{border-color:#111827; outline:2px solid white; box-shadow:0 0 0 1px #111827;}
.preview-wrap{background:white; border:2px solid; border-radius:12px; padding:10px;}
.preview-head{font-size:11px; font-weight:700; display:flex; justify-content:space-between; margin-bottom:8px;}
.preview-white{position:relative; background:white; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;}
.p-abs{position:absolute; display:flex; flex-direction:column; gap:4px;}
.p-label{border:1px dashed #94a3b8; border-radius:6px; padding:6px 8px; font-size:11px; font-weight:700; background:#f8fafc;}
.p-input{border:1px dashed #cbd5e1; border-radius:6px; padding:6px 8px; font-size:11px; background:white;}
.right{background:#fffbeb; border-left:1px solid #fde68a; padding:10px; overflow:auto; display:flex; flex-direction:column; gap:10px;}
.edit-box{background:white; border:1px solid #e5e7eb; border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;}
.edit-head{display:flex; justify-content:space-between; align-items:center;}
.edit-head b{font-size:13px;}.edit-head small{padding:2px 6px; border-radius:4px; font-size:10px; text-transform:uppercase;}
.edit-box label{font-size:11px; font-weight:600; color:#475569;}
.edit-in{border:1px solid #e2e8f0; border-radius:8px; padding:8px; font-size:12px; outline:none;}
.edit-sec{border-top:1px solid #f1f5f9; padding-top:8px; margin-top:4px; display:flex; flex-direction:column; gap:6px;}
.opt-row{display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:6px 8px; border-radius:6px; font-size:12px;}
.opt-row button{border:none; background:#fee2e2; color:#ef4444; width:20px; height:20px; border-radius:4px; cursor:pointer;}
.opt-add{display:flex; gap:6px;}
.opt-add input{flex:1; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; font-size:12px;}
.opt-add button{border:none; color:white; padding:6px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;}
.formula-builder{border:1px solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:10px;}
.fb-head{display:flex; gap:8px; align-items:center;}.fb-ico{width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;}
.fb-ta{width:100%; border:1px solid #e7e5e4; border-radius:8px; padding:10px; font-size:12px; background:white; box-sizing:border-box;}
.fb-ops{display:flex; flex-wrap:wrap; gap:6px;}.fb-ops button{background:white; border:1px solid #e7e5e4; width:42px; height:36px; border-radius:8px; font-weight:700; cursor:pointer;}
.fb-sec b{font-size:12px; display:block;}.fb-sec small{font-size:10px; color:#78716c;}
.fb-field{background:white; border:1px solid #e7e5e4; border-radius:20px; padding:6px 10px; font-size:11px; margin-top:6px; width:100%; text-align:left; cursor:pointer;}
.common{background:white; border:1px solid #e7e5e4; border-radius:8px; padding:8px 10px; display:flex; justify-content:space-between; width:100%; margin-top:6px; cursor:pointer; text-align:left;}
.common span{font-weight:700; font-size:11px;}.common code{font-size:10px; background:#f5f5f4; padding:2px 6px; border-radius:4px;}
.savef{width:100%; color:white; border:none; padding:10px; border-radius:8px; font-weight:700; cursor:pointer; margin-top:6px;}
.chat-overlay{position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:3000; display:flex; align-items:center; justify-content:center; padding:16px;}
.chat-popup{background:#111b21; width:380px; max-height:90vh; border-radius:16px; overflow:hidden; display:flex; flex-direction:column;}
.chat-head{display:flex; align-items:center; justify-content:space-between; padding:12px; background:#202c33; color:white; gap:8px;}
.chat-head small{color:#8696a0; font-size:10px; flex:1; margin-left:8px;}
.chat-head button{border:none; background:white; width:24px; height:24px; border-radius:4px; cursor:pointer;}
.chat-body{padding:12px; display:flex; flex-direction:column; gap:10px; overflow:auto;}
.chat-field{display:flex; flex-direction:column; gap:4px;}.chat-field label{color:#8696a0; font-size:11px; font-weight:600;}
.chat-input{padding:10px; border-radius:8px; border:1px solid #2a3942; background:#2a3942; color:#e9edef; outline:none; font-size:16px;}
.formula-chat{font-weight:800; text-align:center;}
.chat-foot{display:flex; gap:8px; padding:12px; background:#202c33;}
.chat-foot button{flex:1; padding:10px; border-radius:8px; border:none; cursor:pointer;}
.chat-foot button:last-child{color:white; font-weight:700;}
.saved-popup{background:white; width:420px; max-height:85vh; border-radius:16px; overflow:hidden; display:flex; flex-direction:column;}
.saved-head{display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid #e5e7eb; font-weight:700;}
.saved-head button{border:none; background:#f1f5f9; width:28px; height:28px; border-radius:6px; cursor:pointer;}
.saved-body{padding:10px; overflow:auto; display:flex; flex-direction:column; gap:8px; max-height:60vh;}
.saved-item{display:flex; justify-content:space-between; align-items:center; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px;}
.saved-info{display:flex; flex-direction:column; gap:2px;}
.saved-info b{font-size:13px;}.saved-info small{font-size:11px; color:#64748b;}
.saved-actions button{border:none; background:#fee2e2; padding:6px 8px; border-radius:6px; cursor:pointer;}
.saved-foot{display:flex; gap:8px; padding:12px; border-top:1px solid #e5e7eb;}
.saved-foot button{flex:1; padding:10px; border-radius:8px; border:1px solid #e5e7eb; background:white; cursor:pointer; font-weight:600;}
.saved-foot button.green{color:white; border:none;}
</style>