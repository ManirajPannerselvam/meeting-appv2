<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { get } from "svelte/store";
    import { authUserId, authUserName, displayName, getTemplateOwner } from "$lib/stores/auth";
    import { supabaseTemplates } from "$lib/supabase";

    export let templates: any[] = [];
    export let loading = false;
    const dispatch = createEventDispatcher();

    let searchInput = ""; let search = ""; let searchTimer:any=null;
    let deletingId:any=null; let localTemplates:any[]=[];
    let showShareModal=false; let shareTemplate:any=null;
    let shareAll=true; let requiresApproval=true; let allowReshare=true; let canEdit=true; let shareUserId="";
    let currentUserId=""; let currentUserName=""; let selectedTheme="emerald";
    let showTheme=false; let showUseModal=false; let useTemplate:any=null; let useFormData:any={}; let useSaving=false;
    let showReport=false; let reportData:any[]=[]; let toast=""; let visibleCount=30;
    let listEl: HTMLElement | null = null;
    let loaded = false;

    const MAX_NAME=80, MAX_CODE=30, MAX_DESC=200, MAX_SEARCH=50, MAX_SHARE_ID=100, MAX_FORMULA_LEN=120;

    function sanitizeStr(s:any, max=100){ if(typeof s!=='string') return ''; return s.replace(/[<>`$]/g,'').trim().slice(0,max); }
    function isValidUUID(u:string){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u); }
    function isValidShareId(s:string){ return /^[a-zA-Z0-9@._-]{3,100}$/.test(s); }

    function safeEval(expr:string): number | null {
      if(!expr || expr.length>MAX_FORMULA_LEN) return null;
      expr=expr.replaceAll('×','*').replaceAll('÷','/').replace(/%/g,'/100').trim();
      if(!/^[0-9\.\+\-\*\/\(\)\s]+$/.test(expr)) return null;
      if(/[\(\)]{3,}/.test(expr)) return null;
      try{ const fn = new Function(`"use strict"; return (${expr})`); const res = fn(); if(typeof res!=='number'||!isFinite(res)) return null; return Math.round(res*100)/100; }catch{ return null; }
    }

    const themes = [
      { id:"emerald", name:"Emerald", primary:"#10b981", secondary:"#065f46", card:"#ecfdf5", times:[{label:"M",color:"#10b981"},{label:"A",color:"#f59e0b"},{label:"N",color:"#1e293b"}]},
      { id:"ocean", name:"Ocean", primary:"#0ea5e9", secondary:"#0c4a6e", card:"#e0f2fe", times:[{label:"M",color:"#0ea5e9"},{label:"A",color:"#6366f1"},{label:"N",color:"#0f172a"}]},
      { id:"sunset", name:"Sunset", primary:"#f59e0b", secondary:"#78350f", card:"#fffbeb", times:[{label:"M",color:"#fbbf24"},{label:"A",color:"#f59e0b"},{label:"N",color:"#92400e"}]},
      { id:"slate", name:"Slate", primary:"#334155", secondary:"#0f172a", card:"#f1f5f9", times:[{label:"M",color:"#475569"},{label:"A",color:"#334155"},{label:"N",color:"#0f172a"}]},
      { id:"royal", name:"Royal", primary:"#8b5cf6", secondary:"#4c1d95", card:"#ede9fe", times:[{label:"M",color:"#a78bfa"},{label:"A",color:"#8b5cf6"},{label:"N",color:"#4c1d95"}]},
      { id:"ruby", name:"Ruby", primary:"#ef4444", secondary:"#7f1d1d", card:"#fef2f2", times:[{label:"M",color:"#f87171"},{label:"A",color:"#ef4444"},{label:"N",color:"#991b1b"}]},
      { id:"teal", name:"Teal", primary:"#14b8a6", secondary:"#134e4a", card:"#ccfbf1", times:[{label:"M",color:"#2dd4bf"},{label:"A",color:"#14b8a6"},{label:"N",color:"#0f766e"}]},
      { id:"indigo", name:"Indigo", primary:"#6366f1", secondary:"#312e81", card:"#e0e7ff", times:[{label:"M",color:"#818cf8"},{label:"A",color:"#6366f1"},{label:"N",color:"#1e1b4b"}]},
    ];
    const themeMap = new Map(themes.map(t=>[t.id,t]));
    let activeTheme:any = themes[0];
    let cachedTimeColor = themes[0].times[0].color;
    $: { try{ const th=themeMap.get(selectedTheme)||themes[0]; activeTheme=th; const h=new Date().getHours(); cachedTimeColor=h>=6&&h<12?th.times[0].color:h>=12&&h<18?th.times[1].color:th.times[2].color; }catch{ activeTheme=themes[0]; } }

    function getCurrentUserFast(){ try{ const o=getTemplateOwner(); currentUserName=sanitizeStr(o.owner_name||get(authUserName)||get(displayName)||"User",50); currentUserId=sanitizeStr(o.owner_id||get(authUserId)||currentUserName,100); }catch{ currentUserName="User"; currentUserId="User"; } }

    function loadLocalFast(){
        try{
            const raw=localStorage.getItem("templates"); if(!raw){ localTemplates=[]; return; }
            if(raw.length>500000){ localTemplates=[]; return; }
            const saved=JSON.parse(raw); const nowColor=cachedTimeColor;
            localTemplates=saved.map((t:any)=>{
              const tid=sanitizeStr(t.theme||selectedTheme,20);
              const th=themeMap.get(tid)||themes[0];
              return {
                id:sanitizeStr(String(t.id||''),100),
                owner_id:sanitizeStr(t.owner_id||currentUserId,100),
                owner_name:sanitizeStr(t.owner_name||currentUserName,50),
                name:sanitizeStr(t.name||"Untitled",MAX_NAME),
                template_code:sanitizeStr(t.code||t.template_code||"",MAX_CODE),
                code:sanitizeStr(t.code||t.template_code||"",MAX_CODE),
                description:sanitizeStr(t.description||"",MAX_DESC),
                department:sanitizeStr(t.category||t.department||"General",30),
                placements:t.fields||t.placements||t.data?.fields||[],
                fields:t.fields||t.placements||t.data?.fields||[],
                theme:tid, data:{fields:t.fields||t.placements||t.data?.fields||[]},
                allow_all_contacts:t.allow_all_contacts??true,
                requires_approval:t.requires_approval??true,
                allow_reshare:t.allow_reshare??true,
                shared_with:Array.isArray(t.shared_with)?t.shared_with.slice(0,20):[],
                createdAt:t.createdAt||t.created_at,
                _th:th, _msgColor:nowColor,
                _search:`${t.name||''} ${t.code||''}`.toLowerCase().slice(0,150)
              };
            });
        }catch{ localTemplates=[]; }
    }
    getCurrentUserFast(); try{ const st=localStorage.getItem("template_theme"); if(st&&themeMap.has(st)) selectedTheme=sanitizeStr(st,20); }catch{} loadLocalFast(); loaded=true;

    onMount(()=>{ if(listEl) listEl.addEventListener('scroll', ()=>{ if(listEl && listEl.scrollTop+listEl.clientHeight>=listEl.scrollHeight-200){ if(visibleCount<filteredTemplates.length) visibleCount+=20; } }, {passive:true}); });

    function onSearchInput(e:any){ const v=sanitizeStr(e.target.value,MAX_SEARCH); searchInput=v; if(searchTimer) clearTimeout(searchTimer); if(v.length===0){ search=""; visibleCount=30; return; } searchTimer=setTimeout(()=>{ search=v.trim().toLowerCase(); visibleCount=30; },80); }
    function clearSearch(){ searchInput=""; search=""; visibleCount=30; }

    // --- ONLY MY TEMPLATES + SHARED TO ME ---
    $: allTemplates=(()=>{
      if(!loaded) return localTemplates;
      const seen=new Set(); const out:any[]=[];
      const myId = String(currentUserId||'').toLowerCase();
      const myName = String(currentUserName||'').toLowerCase();
      function isMine(t:any){
        const oid = String(t.owner_id||'').toLowerCase();
        const oname = String(t.owner_name||'').toLowerCase();
        if(oid && myId && oid===myId) return true;
        if(oname && myName && oname===myName) return true;
        if(!oid && !oname) return true; // old local without owner
        if(t.allow_all_contacts) return true;
        if(Array.isArray(t.shared_with)){
          return t.shared_with.some((s:any)=>{
            const sid=String(s.user_id||'').toLowerCase();
            return sid===myId || sid===myName;
          });
        }
        return false;
      }
      for(let t of localTemplates){ if(!isMine(t)) continue; const k=String(t.id||t.name); if(!seen.has(k)){ seen.add(k); out.push(t); } }
      for(let t of (templates||[])){
        if(!t) continue; if(!isMine(t)) continue;
        const k=String(t.id||t.template_code||t.name); if(seen.has(k)) continue; seen.add(k);
        const th=themeMap.get(sanitizeStr(t.theme||selectedTheme,20))||themes[0];
        out.push({...t, name:sanitizeStr(t.name,MAX_NAME), owner_name:sanitizeStr(t.owner_name||currentUserName,50), _th:th, _msgColor:cachedTimeColor, _search:`${t.name||''} ${t.template_code||t.code||''}`.toLowerCase().slice(0,150), data: typeof t.data==='string'? (()=>{ try{ return JSON.parse(t.data); }catch{ return {fields:[]}; } })() : t.data });
      }
      return out;
    })();
    $: filteredTemplates=!search? allTemplates : allTemplates.filter((t:any)=> t._search?.includes(search));
    $: visibleTemplates=filteredTemplates.slice(0,visibleCount);

    function close(){ dispatch("close"); }
    function handleEdit(t:any){ try{ localStorage.setItem("edit_template", JSON.stringify(t)); }catch{} dispatch("edit",{template:t}); close(); goto(`/templates/create?id=${encodeURIComponent(t.id)}`); }
    function handleNew(){ dispatch("new"); dispatch("create"); close(); goto(`/templates/create`); }
    function handleUse(t:any){ useTemplate=t; useFormData={}; let fields=t.fields||t.data?.fields||[]; for(let f of fields){ let key=sanitizeStr(f.field_name||f.name,50); if(!key) continue; useFormData[key]=f.type==='dropdown'?(sanitizeStr(f.options?.[0]||'',50)) : ''; } dispatch("use",{template:t}); showUseModal=true; setTimeout(()=>calcAllFormulas(),30); }
    function calcAllFormulas(){ if(!useTemplate) return; let fields=useTemplate.fields||useTemplate.data?.fields||[]; for(let f of fields){ if(f.type==='formula'&&f.formula){ let expr=String(f.formula).slice(0,MAX_FORMULA_LEN); for(let rf of fields){ let key=rf.field_name||rf.name; if(!key) continue; let raw=useFormData[key]; let val=parseFloat(raw); if(isNaN(val)) val=0; if(val>1e9||val<-1e9) val=0; expr=expr.split(`{${key}}`).join(val.toString()); } const res=safeEval(expr); if(res!==null){ let k=f.field_name||f.name; useFormData[k]=res; } } } }
    function onUseInput(){ calcAllFormulas(); }
    async function submitUseData(){
      if(!useTemplate) return; let fields=useTemplate.fields||useTemplate.data?.fields||[]; for(let f of fields){ if(f.required){ let k=f.field_name||f.name; if(!useFormData[k]&&useFormData[k]!==0){ toast=`❌ Enter ${sanitizeStr(f.label,30)}`; setTimeout(()=>toast="",2000); return; } } } useSaving=true;
      try{ let owner=getTemplateOwner(); let realUUID=null; try{ const {data:{user}}=await supabaseTemplates.auth.getUser(); if(user&&isValidUUID(user.id)) realUUID=user.id; }catch{} const entry={ id:crypto.randomUUID(), template_id:sanitizeStr(String(useTemplate.id),100), template_code:sanitizeStr(useTemplate.template_code||useTemplate.code,MAX_CODE), template_name:sanitizeStr(useTemplate.name,MAX_NAME), data:{...useFormData}, owner_email:sanitizeStr(owner.owner_email||currentUserName,100), created_at:new Date().toISOString() }; let subs=[]; try{ subs=JSON.parse(localStorage.getItem("submissions")||"[]"); }catch{ subs=[]; } subs=[entry,...subs].slice(0,200); try{ localStorage.setItem("submissions", JSON.stringify(subs)); }catch{} try{ let payload:any={ template_id:String(useTemplate.id).slice(0,100), template_code:entry.template_code, data:useFormData }; if(realUUID) payload.owner_id=realUUID; let {error}=await supabaseTemplates.from('submissions').insert(payload); if(error) await supabaseTemplates.from('template_entries').insert(payload); }catch{} showUseModal=false; reportData=subs.filter((s:any)=>String(s.template_id)===String(useTemplate.id)); showReport=true; toast=`✅ Saved`; setTimeout(()=>toast="",2000); }finally{ useSaving=false; }
    }
    async function handleDelete(t:any){ if(!t?.id||deletingId!==null) return; if(!confirm(`Delete "${sanitizeStr(t.name,30)}"?`)) return; deletingId=t.id; try{ const saved=JSON.parse(localStorage.getItem("templates")||"[]"); localStorage.setItem("templates", JSON.stringify(saved.filter((x:any)=>String(x.id)!==String(t.id)))); loadLocalFast(); try{ if(isValidUUID(t.id)) await supabaseTemplates.from('templates').delete().eq('id',t.id); }catch{} dispatch("deleted",{template:t}); }finally{ deletingId=null; } }
    function openShare(t:any){ shareTemplate=t; shareAll=t.allow_all_contacts??true; requiresApproval=t.requires_approval??true; allowReshare=t.allow_reshare??true; canEdit=true; shareUserId=""; showShareModal=true; }
    async function confirmShare(){
      if(!shareAll){ const sid=sanitizeStr(shareUserId,MAX_SHARE_ID); if(!sid||!isValidShareId(sid)){ alert("Enter valid User ID / Email (3-100 chars)"); return; } shareUserId=sid; }
      const saved=JSON.parse(localStorage.getItem("templates")||"[]"); const idx=saved.findIndex((x:any)=>String(x.id)===String(shareTemplate.id)); if(idx<0) return;
      let updatedShared=shareTemplate.shared_with||[]; if(!shareAll){ updatedShared=[...updatedShared.filter((s:any)=>String(s.user_id)!==String(shareUserId)), { user_id:shareUserId, permission:canEdit?'edit':'use', approved:!requiresApproval, requestedAt:new Date().toISOString(), shared_by:currentUserName }].slice(0,20); }
      saved[idx]={...saved[idx], allow_all_contacts:shareAll, requires_approval:requiresApproval, allow_reshare:allowReshare, shared_with:updatedShared };
      localStorage.setItem("templates", JSON.stringify(saved));
      try{ if(isValidUUID(shareTemplate.id)) await supabaseTemplates.from('templates').update({ allow_all_contacts:shareAll, requires_approval:requiresApproval, allow_reshare:allowReshare, shared_with:updatedShared }).eq('id',shareTemplate.id); }catch{}
      loadLocalFast(); showShareModal=false; toast="🔒 Shared"; setTimeout(()=>toast="",2000);
    }
    function getFields(t:any){ return t.data?.fields||t.fields||t.placements||[]; }
    function getDept(t:any){ return sanitizeStr(t.data?.department||t.department||t.category||"General",30); }
    function getDesc(t:any){ return sanitizeStr(t.description||t.data?.description||`Code: ${t.template_code||t.code||'N/A'}`,MAX_DESC); }
    function getOwner(t:any){ return sanitizeStr(t.owner_name||currentUserName,30); }
    function handleKeydown(e:KeyboardEvent, a:()=>void){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); a(); } }
    function selectTheme(id:string){ if(!themeMap.has(id)) return; selectedTheme=id; try{ localStorage.setItem("template_theme",id); }catch{} showTheme=false; }
</script>

<div class="overlay" role="presentation" on:click={(e)=>{ if(e.target===e.currentTarget) close(); }}>
    <section class="popup" role="dialog" aria-modal="true">
        <header class="popup-header" style="border-bottom:4px solid {activeTheme.primary}">
            <div class="title-wrap"><span class="title-icon">📋</span><div><h2>Templates</h2><p>{filteredTemplates.length} my • {visibleTemplates.length} shown</p></div></div>
            <div class="head-actions"><button class="theme-btn" style="background:{activeTheme.card}; border:1px solid {activeTheme.primary}; color:{activeTheme.primary}" on:click={()=>showTheme=!showTheme}>🎨 {activeTheme.name}</button><button type="button" class="close-btn" on:click={close}>×</button></div>
        </header>
        {#if showTheme}<div class="theme-picker">{#each themes as th}<button class="theme-opt" class:active={th.id===selectedTheme} style="border-color:{th.primary}; background:{th.card}" on:click={()=>selectTheme(th.id)}><b style="color:{th.primary}">{th.name}</b></button>{/each}</div>{/if}
        <div class="toolbar"><div class="search-box"><span>🔍</span><input value={searchInput} on:input={onSearchInput} type="search" placeholder="Search my templates..." maxlength={MAX_SEARCH} /><button class="clear-search" style="display:{searchInput?'flex':'none'}" on:click={clearSearch}>×</button></div><button class="new-btn" style="background:{activeTheme.primary}" on:click={handleNew}>+ New</button></div>
        <div class="template-list" bind:this={listEl}>
            {#if filteredTemplates.length===0}<div class="empty-state"><div class="empty-icon">📋</div><h3>No templates</h3><p>You: {currentUserName}</p><button class="new-empty-btn" style="background:{activeTheme.primary}" on:click={handleNew}>+ Create</button></div>
            {:else}{#each visibleTemplates as template (template.id)}<article class="template-card" style="border-left:5px solid {template._msgColor}; background:{template._th.card};"><div class="card-top"><div class="template-icon" role="button" tabindex="0" style="background:{template._th.card}; border:1px solid {template._th.primary}; color:{template._th.primary}" on:click={()=>handleUse(template)} on:keydown={(e)=>handleKeydown(e,()=>handleUse(template))}>📄</div><div class="template-info"><div class="name-row"><h3>{template.name}</h3><span class="theme-tag" style="background:{template._th.primary}">{template._th.name}</span></div><p class="description">{getDesc(template)}</p><div class="meta">F:{getFields(template).length} • {getDept(template)} • 👤 {getOwner(template)}</div></div></div><div class="actions"><button class="action edit" on:click={()=>handleEdit(template)}>Edit</button><button class="action share" style="background:{template._th.primary}" on:click={()=>openShare(template)}>Share</button><button class="action delete" on:click={()=>handleDelete(template)}>Del</button><button class="action use" style="background:{template._th.primary}" on:click={()=>handleUse(template)}>Use</button></div></article>{/each}{#if visibleCount<filteredTemplates.length}<div class="load-more">Scroll for {filteredTemplates.length-visibleCount} more</div>{/if}{/if}
        </div>
        {#if toast}<div class="toast-pop">{toast}</div>{/if}
    </section>
</div>

{#if showShareModal}
<div class="overlay share-overlay" on:click|self={()=>showShareModal=false}>
    <div class="share-popup">
        <div class="share-head"><div class="share-head-left"><span class="share-icon">🔒</span><div><h3 class="share-title">Share</h3><small class="share-sub">{shareTemplate?.name} • by {getOwner(shareTemplate)}</small></div></div><button class="close-btn" on:click={()=>showShareModal=false}>×</button></div>
        <div class="share-body">
            <label class="check-box check-main"><input type="checkbox" bind:checked={shareAll} /><span class="check-label">All contacts</span></label>
            <div class="perm-box">
                <label class="check-box"><input type="checkbox" bind:checked={requiresApproval} /><span class="check-label">Need approval</span></label>
                <label class="check-box"><input type="checkbox" bind:checked={allowReshare} /><span class="check-label">Can reshare</span></label>
                <label class="check-box"><input type="checkbox" bind:checked={canEdit} /><span class="check-label">Can edit</span></label>
            </div>
            {#if !shareAll}<input bind:value={shareUserId} placeholder="User ID / Email" maxlength={MAX_SHARE_ID} class="share-input" />{/if}
        </div>
        <div class="share-actions"><button class="secondary-btn" on:click={()=>showShareModal=false}>Cancel</button><button class="new-btn" style="background:{activeTheme.primary}" on:click={confirmShare}>🔒 Share</button></div>
    </div>
</div>
{/if}

{#if showUseModal && useTemplate}
<div class="overlay use-overlay" on:click|self={()=>showUseModal=false}>
  <div class="use-popup" style="border-top:5px solid {activeTheme.primary}"><div class="use-popup-head"><div><h3>📥 {useTemplate.name}</h3><small>{useTemplate.template_code||useTemplate.code} • 👤 {getOwner(useTemplate)}</small></div><button class="close-btn" on:click={()=>showUseModal=false}>×</button></div><div class="use-form-list">{#each (useTemplate.fields||useTemplate.data?.fields||[]) as f}{@const key=f.field_name||f.name}<div class="use-field-row" style="border-left:4px solid {activeTheme.primary}"><label class="use-label">{f.label} {#if f.required}<span class="req">*</span>{/if}</label>{#if f.type==='dropdown'}<select class="use-input" bind:value={useFormData[key]} on:change={onUseInput}><option value="">Select</option>{#each (f.options||[]) as opt}<option value={opt}>{opt}</option>{/each}</select>{:else if f.type==='number'}<input class="use-input" type="number" bind:value={useFormData[key]} on:input={onUseInput} />{:else if f.type==='formula'}<div class="formula-box" style="background:{activeTheme.card}; border:1px solid {activeTheme.primary}"><b>{useFormData[key]??'0'}</b></div>{:else}<input class="use-input" type="text" bind:value={useFormData[key]} on:input={onUseInput} />{/if}</div>{/each}</div><div class="use-actions"><button class="secondary-btn" on:click={()=>showUseModal=false}>Cancel</button><button class="new-btn" style="background:{activeTheme.primary}" disabled={useSaving} on:click={submitUseData}>{useSaving?'Saving...':'💾 Save'}</button></div></div>
</div>
{/if}

<style>
*{box-sizing:border-box;}
.overlay{ position:fixed; inset:0; z-index:99990!important; display:flex; align-items:center; justify-content:center; padding:12px; background:rgba(15,23,42,0.6); backdrop-filter:blur(3px); }
.share-overlay{ position:fixed!important; inset:0!important; background:rgba(0,0,0,0.8)!important; backdrop-filter:blur(6px)!important; z-index:100000!important; display:flex!important; align-items:center!important; justify-content:center!important; }
.use-overlay{ position:fixed!important; inset:0!important; z-index:100010!important; display:flex!important; align-items:center!important; justify-content:center!important; background:rgba(15,23,42,0.7)!important; }
.popup{ width:min(920px,100%); max-height:min(760px,calc(100dvh - 24px)); display:flex; flex-direction:column; overflow:hidden; background:#fff; border-radius:16px; box-shadow:0 24px 70px rgba(0,0,0,0.35); animation:popIn 0.15s ease-out; }
@keyframes popIn{ from{ transform:scale(0.96); opacity:0; } to{ transform:scale(1); opacity:1; } }
.popup-header{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #e5e7eb; gap:8px; flex-shrink:0; background:#fff; }
.title-wrap{ display:flex; align-items:center; gap:8px; }
h2{ margin:0; font-size:16px; color:#111827; }
.head-actions{ display:flex; gap:6px; align-items:center; }
.close-btn{ width:30px; height:30px; border:0; border-radius:50%; background:#f1f5f9; color:#334155; font-size:18px; cursor:pointer; }
.theme-btn{ padding:4px 8px; border-radius:20px; font-size:10px; font-weight:700; cursor:pointer; }
.theme-picker{ display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:6px; padding:8px; background:#f8fafc; }
.theme-opt{ border:1px solid; border-radius:8px; padding:6px; cursor:pointer; background:#fff; }
.toolbar{ display:flex; gap:8px; padding:8px 10px; border-bottom:1px solid #eef2f7; background:#fff; }
.search-box{ flex:1; height:36px; display:flex; align-items:center; gap:6px; padding:0 10px; border:1px solid #cbd5e1; border-radius:8px; background:#fff!important; }
.search-box input{ flex:1; border:0; outline:0; font-size:13px; background:#fff!important; color:#111827!important; }
.search-box span{ color:#111827!important; }
.clear-search{ width:22px; height:22px; border:0; border-radius:50%; background:#f1f5f9; cursor:pointer; color:#111827; }
.new-btn{ height:36px; min-width:68px; padding:0 12px; border:0; border-radius:8px; color:#fff; font-weight:700; cursor:pointer; }
.template-list{ flex:1; overflow-y:auto; padding:4px 8px 12px; background:#f8fafc; }
.template-card{ display:flex; flex-direction:column; gap:6px; margin:5px 0; padding:8px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; }
.card-top{ display:flex; gap:8px; }.template-icon{ width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:6px; cursor:pointer; }
.name-row{ display:flex; gap:4px; align-items:center; }.name-row h3{ margin:0; font-size:13px; color:#111827; }.theme-tag{ padding:1px 5px; border-radius:4px; font-size:8px; font-weight:700; color:#fff; }
.description{ margin:2px 0 0; color:#475569; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }.meta{ color:#64748b; font-size:9px; }
.actions{ display:grid; grid-template-columns:repeat(4,1fr); gap:4px; }.action{ height:28px; border:0; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; }.edit{ background:#f1f5f9; color:#111827; border:1px solid #cbd5e1; }.delete{ background:#fee2e2; color:#991b1b; }.use,.share{ color:#fff; }
.load-more{ text-align:center; padding:10px; color:#475569; font-size:11px; }
.empty-state{ min-height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#475569; }.new-empty-btn{ color:#fff; height:34px; padding:0 14px; border:0; border-radius:6px; font-weight:700; cursor:pointer; margin-top:8px; }
.share-popup{ background:#ffffff!important; width:min(440px,96%); border-radius:14px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.35); animation:popIn 0.15s ease-out; border:1px solid #cbd5e1; }
.share-head{ display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:#ffffff!important; border-bottom:3px solid #0ea5e9; }
.share-head-left{ display:flex; gap:10px; align-items:center; }
.share-icon{ width:36px; height:36px; background:#e0f2fe!important; border:2px solid #0ea5e9!important; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; }
.share-title{ margin:0; font-size:16px; color:#0f172a!important; font-weight:800!important; }
.share-sub{ color:#334155!important; font-weight:600!important; font-size:12px!important; }
.share-body{ padding:16px; display:flex; flex-direction:column; gap:12px; background:#ffffff!important; }
.check-main{ background:#e0f2fe!important; border:2px solid #0ea5e9!important; padding:14px 16px!important; border-radius:10px!important; }
.perm-box{ background:#f8fafc!important; border:2px solid #e2e8f0!important; padding:14px 16px!important; border-radius:10px!important; display:flex; flex-direction:column; gap:12px!important; }
.check-box{ display:flex!important; align-items:center!important; gap:12px!important; cursor:pointer; }
.check-box input{ width:22px!important; height:22px!important; accent-color:#0ea5e9!important; flex-shrink:0; cursor:pointer; }
.check-label{ color:#0f172a!important; font-weight:700!important; font-size:14px!important; line-height:1.3!important; opacity:1!important; }
.share-input{ padding:12px 14px!important; border:2px solid #0ea5e9!important; border-radius:10px!important; width:100%!important; font-size:14px!important; background:#ffffff!important; color:#0f172a!important; }
.share-actions{ display:flex; justify-content:flex-end; gap:10px; padding:14px 16px; background:#f1f5f9!important; border-top:1px solid #e2e8f0; }
.secondary-btn{ background:#ffffff!important; color:#0f172a!important; border:2px solid #cbd5e1!important; height:40px; padding:0 16px; border-radius:8px; font-weight:700!important; cursor:pointer; font-size:14px!important; }
.toast-pop{ position:fixed; bottom:14px; left:50%; transform:translateX(-50%); background:#111827; color:#fff; padding:8px 14px; border-radius:8px; font-size:11px; z-index:20000; }
.use-popup{ background:#fff; width:min(500px,96%); max-height:85vh; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; animation:popIn 0.15s ease-out; }
.use-popup-head{ display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid #e5e7eb; }
.use-form-list{ padding:10px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; background:#f8fafc; }
.use-field-row{ background:#fff; padding:8px 10px; border-radius:8px; border:1px solid #e5e7eb; display:flex; flex-direction:column; gap:4px; }
.use-label{ font-size:11px; font-weight:800; color:#0f172a; }
.req{ color:#ef4444; }
.use-input{ height:36px; border:2px solid #cbd5e1; border-radius:8px; padding:0 10px; font-size:14px; width:100%; background:#fff!important; color:#0f172a!important; }
.formula-box{ padding:10px 12px; border-radius:8px; display:flex; justify-content:space-between; font-weight:900; font-size:13px; color:#0f172a; }
.use-actions{ display:flex; justify-content:space-between; padding:12px 14px; background:#fff; border-top:1px solid #e5e7eb; }
</style>