<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { get } from "svelte/store";
    import { authStore, authUserId, authUserName, displayName, getTemplateOwner } from "$lib/stores/auth";
    import { supabaseTemplates } from "$lib/supabase";

    export let templates: any[] = [];
    export let loading = false;
    const dispatch = createEventDispatcher();
    let search = "";
    let deletingId: string | number | null = null;
    let localTemplates: any[] = [];

    let showShareModal = false;
    let shareTemplate: any = null;
    let shareAll = true;
    let requiresApproval = true;
    let allowReshare = true;
    let canEdit = true;
    let shareUserId = "";
    let currentUserId = "";
    let currentUserName = "";
    let selectedTheme = "emerald";
    let showTheme = false;

    const themes = [
      { id:"emerald", name:"Emerald Pro", primary:"#10b981", secondary:"#065f46", card:"#ecfdf5", times:[ { label:"Morning 06-12", color:"#10b981" }, { label:"Afternoon 12-18", color:"#f59e0b" }, { label:"Night 18-06", color:"#1e293b" }, ]},
      { id:"ocean", name:"Ocean Blue", primary:"#0ea5e9", secondary:"#0c4a6e", card:"#e0f2fe", times:[ { label:"Morning 06-12", color:"#0ea5e9" }, { label:"Afternoon 12-18", color:"#6366f1" }, { label:"Night 18-06", color:"#0f172a" }, ]},
      { id:"sunset", name:"Sunset Amber", primary:"#f59e0b", secondary:"#78350f", card:"#fffbeb", times:[ { label:"Morning 06-12", color:"#fbbf24" }, { label:"Afternoon 12-18", color:"#f59e0b" }, { label:"Night 18-06", color:"#92400e" }, ]},
      { id:"slate", name:"Slate Corporate", primary:"#334155", secondary:"#0f172a", card:"#f1f5f9", times:[ { label:"Morning 06-12", color:"#475569" }, { label:"Afternoon 12-18", color:"#334155" }, { label:"Night 18-06", color:"#0f172a" }, ]},
      { id:"royal", name:"Royal Purple", primary:"#8b5cf6", secondary:"#4c1d95", card:"#ede9fe", times:[ { label:"Morning 06-12", color:"#a78bfa" }, { label:"Afternoon 12-18", color:"#8b5cf6" }, { label:"Night 18-06", color:"#4c1d95" }, ]},
      { id:"ruby", name:"Ruby Red", primary:"#ef4444", secondary:"#7f1d1d", card:"#fef2f2", times:[ { label:"Morning 06-12", color:"#f87171" }, { label:"Afternoon 12-18", color:"#ef4444" }, { label:"Night 18-06", color:"#991b1b" }, ]},
      { id:"teal", name:"Teal Medical", primary:"#14b8a6", secondary:"#134e4a", card:"#ccfbf1", times:[ { label:"Morning 06-12", color:"#2dd4bf" }, { label:"Afternoon 12-18", color:"#14b8a6" }, { label:"Night 18-06", color:"#0f766e" }, ]},
      { id:"indigo", name:"Indigo Night", primary:"#6366f1", secondary:"#312e81", card:"#e0e7ff", times:[ { label:"Morning 06-12", color:"#818cf8" }, { label:"Afternoon 12-18", color:"#6366f1" }, { label:"Night 18-06", color:"#1e1b4b" }, ]},
      { id:"forest", name:"Forest Dark", primary:"#16a34a", secondary:"#052e16", card:"#dcfce7", times:[ { label:"Morning 06-12", color:"#4ade80" }, { label:"Afternoon 12-18", color:"#16a34a" }, { label:"Night 18-06", color:"#14532d" }, ]},
      { id:"charcoal", name:"Charcoal Elite", primary:"#111827", secondary:"#000000", card:"#ffffff", times:[ { label:"Morning 06-12", color:"#6b7280" }, { label:"Afternoon 12-18", color:"#111827" }, { label:"Night 18-06", color:"#000000" }, ]},
    ];

    $: activeTheme = themes.find(t=>t.id===selectedTheme) || themes[0];
    function getTimeColor(dateStr?: string){ const d = dateStr? new Date(dateStr) : new Date(); const h = d.getHours(); if(h>=6 && h<12) return activeTheme.times[0].color; if(h>=12 && h<18) return activeTheme.times[1].color; return activeTheme.times[2].color; }
    function getCurrentUser(){ try{ const owner = getTemplateOwner(); const storeName = get(authUserName); const storeId = get(authUserId); const dispName = get(displayName); currentUserName = owner.owner_name || storeName || dispName || "Account User"; currentUserId = owner.owner_id || storeId || currentUserName; return currentUserId; }catch{ currentUserName = "Account User"; currentUserId = "Account User"; return currentUserId; } }
    function loadLocal(){
        try{
            const saved = JSON.parse(localStorage.getItem("templates")||"[]");
            getCurrentUser();
            const storedTheme = localStorage.getItem("template_theme") || localStorage.getItem("template_theme_id");
            if(storedTheme) selectedTheme = storedTheme;
            localTemplates = saved.map((t:any)=>({ id: t.id, owner_id: t.owner_id || t.owner_name || currentUserId, owner_name: t.owner_name || t.owner_id || currentUserName, name: t.name || t.template_name || "Untitled", template_code: t.code || t.template_code || t.t_code || "", code: t.code || t.template_code || "", description: t.description || "", department: t.category || t.department || "General", category: t.category || t.department || "General", placements: t.fields || t.placements || t.data?.fields || [], theme: t.theme || selectedTheme, data: { fields: t.fields || t.placements || t.data?.fields || [], department: t.category || t.department || "General", description: t.description || "" }, allow_all_contacts: t.allow_all_contacts?? true, requires_approval: t.requires_approval?? true, allow_reshare: t.allow_reshare?? true, shared_with: t.shared_with || [], createdAt: t.createdAt || t.created_at }));
        }catch(e){ console.error("loadLocal error", e); localTemplates=[]; }
    }
    onMount(()=>{ loadLocal(); const unsub = authStore.subscribe(()=> loadLocal()); return unsub; });
    function onFocus(){ loadLocal(); }
    function canAccess(template:any){ if(!template) return false; if(String(template.owner_id)===String(currentUserId) || String(template.owner_name)===String(currentUserName) || String(template.owner_name)===String(currentUserId)) return true; if(template.allow_all_contacts) return true; const found = template.shared_with?.find((s:any)=> String(s.user_id)===String(currentUserId) || String(s.user_id)===String(currentUserName)); if(!found) return false; if(template.requires_approval &&!found.approved) return false; return true; }
    function isPending(template:any){ const found = template.shared_with?.find((s:any)=> String(s.user_id)===String(currentUserId) || String(s.user_id)===String(currentUserName)); return found && template.requires_approval &&!found.approved; }
    $: allTemplates = (() => { const map = new Map(); [...localTemplates,...(templates??[])].forEach(t=>{ if(!t) return; if(!canAccess(t)) return; const key = String(t.id || t.template_code || t.name); if(!map.has(key)) map.set(key, t); }); return Array.from(map.values()); })();
    $: filteredTemplates = allTemplates.filter((template) => { const query = search.trim().toLowerCase(); if (!query) return true; return [ template?.name, template?.template_code, template?.code, template?.category, template?.department, template?.description, template?.owner_name ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)); });
    function close() { dispatch("close"); }
    function handleEdit(template: any) { if (!template) return; const isOwner = String(template.owner_id)===String(currentUserId) || String(template.owner_name)===String(currentUserName); const canEditPerm = template.shared_with?.find((s:any)=> (String(s.user_id)===String(currentUserId) || String(s.user_id)===String(currentUserName)) && s.permission==='edit' && s.approved); if(!isOwner &&!canEditPerm){ alert(`No edit permission - Need approval from ${template.owner_name}`); return; } localStorage.setItem("edit_template", JSON.stringify(template)); dispatch("edit", { template }); close(); const qs = window.location.search; goto(`/templates/create?id=${template.id}${qs? `&${qs.substring(1)}` : ''}`); }
    function handleNew() { dispatch("new"); dispatch("create"); close(); const qs = window.location.search; goto(`/templates/create${qs}`); }
    function handleUse(template: any) { if (!template) return; if(isPending(template)){ alert(`Waiting approval from ${template.owner_name} for installation`); return; } localStorage.setItem("use_template", JSON.stringify(template)); dispatch("use", { template }); close(); }
    async function handleDelete(template: any) { if (!template?.id || deletingId!== null) return; const isOwner = String(template.owner_id)===String(currentUserId) || String(template.owner_name)===String(currentUserName); if(!isOwner){ alert("Only owner can delete"); return; } const confirmed = window.confirm(`Delete "${template.name || "this template"}"?`); if (!confirmed) return; deletingId = template.id; try { const saved = JSON.parse(localStorage.getItem("templates")||"[]"); const updated = saved.filter((x:any)=> String(x.id)!== String(template.id)); localStorage.setItem("templates", JSON.stringify(updated)); loadLocal(); try{ await supabaseTemplates.from('templates').delete().eq('id', template.id); await fetch(`/api/templates?id=${encodeURIComponent(String(template.id))}`, { method: "DELETE", headers: { Accept: "application/json" } }); }catch{} dispatch("deleted", { template }); } catch (error) { console.error("[TemplatePopup] Delete failed:", error); window.alert(error instanceof Error? error.message : "Failed to delete template."); } finally { deletingId = null; } }
    function openShare(template:any){ const isOwner = String(template.owner_id)===String(currentUserId) || String(template.owner_name)===String(currentUserName); if(!isOwner &&!template.allow_reshare){ alert(`You don't have reshare permission. Need approval from ${template.owner_name}.`); return; } shareTemplate = template; shareAll = template.allow_all_contacts?? true; requiresApproval = template.requires_approval?? true; allowReshare = template.allow_reshare?? true; canEdit = true; shareUserId = ""; showShareModal = true; }

    // SECURE SHARE - SYNC TO SUPABASE FOR REPORTS APPROVAL
    async function confirmShare(){
      const saved = JSON.parse(localStorage.getItem("templates")||"[]");
      const idx = saved.findIndex((x:any)=> String(x.id)===String(shareTemplate.id));
      if(idx<0) return;
      let updatedShared = shareTemplate.shared_with || [];
      if(!shareAll){
        if(!shareUserId.trim()){ alert("Enter B user ID / Email"); return; }
        updatedShared = [...updatedShared.filter((s:any)=> String(s.user_id)!==String(shareUserId)), { user_id: shareUserId.trim(), permission: canEdit? 'edit':'use', approved:!requiresApproval, requestedAt: new Date().toISOString(), shared_by: currentUserName }];
      }
      const updated = {...saved[idx], allow_all_contacts: shareAll, requires_approval: requiresApproval, allow_reshare: allowReshare, shared_with: updatedShared, owner_id: shareTemplate.owner_id, owner_name: shareTemplate.owner_name };
      saved[idx]=updated;
      localStorage.setItem("templates", JSON.stringify(saved));
      // SYNC TO SUPABASE - FOR SECURE REPORTS
      try{
        await supabaseTemplates.from('templates').update({
          allow_all_contacts: shareAll,
          requires_approval: requiresApproval,
          allow_reshare: allowReshare,
          shared_with: updatedShared,
          owner_id: String(shareTemplate.owner_id),
          owner_name: String(shareTemplate.owner_name)
        }).eq('id', shareTemplate.id);
      }catch(e){ console.warn("supabase share sync failed", e); }
      loadLocal();
      showShareModal=false;
      alert(shareAll? `🔒 Shared to all by ${currentUserName} - Reports secure` : `🔒 Request sent to ${shareUserId} - Needs your approval`);
    }

    async function approveUser(template:any, userId:string, approve:boolean){
      const saved = JSON.parse(localStorage.getItem("templates")||"[]");
      const idx = saved.findIndex((x:any)=> String(x.id)===String(template.id));
      if(idx<0) return;
      if(!approve){
        saved[idx].shared_with = saved[idx].shared_with.filter((s:any)=> String(s.user_id)!==String(userId));
      } else {
        saved[idx].shared_with = saved[idx].shared_with.map((s:any)=> String(s.user_id)===String(userId)? {...s, approved: true} : s);
      }
      localStorage.setItem("templates", JSON.stringify(saved));
      try{
        await supabaseTemplates.from('templates').update({ shared_with: saved[idx].shared_with }).eq('id', template.id);
      }catch{}
      loadLocal();
    }

    function getFields(template: any): any[] { if(Array.isArray(template?.data?.fields)) return template.data.fields; if(Array.isArray(template?.placements)) return template.placements; if(Array.isArray(template?.fields)) return template.fields; return []; }
    function getDepartment(template: any): string { return template?.data?.department || template?.department || template?.category || "General"; }
    function getDescription(template: any): string { return template?.description || template?.data?.description || `Code: ${template.template_code||template.code||'N/A'}`; }
    function handleKeydown(event: KeyboardEvent, action: () => void) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); } }
    function selectTheme(id:string){ selectedTheme = id; localStorage.setItem("template_theme", id); localStorage.setItem("template_theme_id", id); showTheme = false; }
</script>

<svelte:window on:focus={onFocus} />

<div class="overlay" role="presentation" on:click={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section class="popup" role="dialog" aria-modal="true" aria-labelledby="template-title">
        <header class="popup-header" style="border-bottom:4px solid {activeTheme.primary}">
            <div class="title-wrap">
                <span class="title-icon" aria-hidden="true">📋</span>
                <div>
                    <h2 id="template-title">Templates</h2>
                    <p>{filteredTemplates.length} templates • You: {currentUserName} • Theme: {activeTheme.name}</p>
                </div>
            </div>
            <div class="head-actions">
              <button class="theme-btn" style="background:{activeTheme.card}; border:1px solid {activeTheme.primary}; color:{activeTheme.primary}" on:click={()=>showTheme=!showTheme}>🎨 {activeTheme.name}</button>
              <button type="button" class="close-btn" on:click={close}>×</button>
            </div>
        </header>

        {#if showTheme}
        <div class="theme-picker">
          {#each themes as th}
            <button class="theme-opt" class:active={th.id===selectedTheme} style="border-color:{th.primary}; background:{th.card}" on:click={()=>selectTheme(th.id)}>
              <div class="theme-opt-top">
                <span class="t-dot" style="background:{th.primary}"></span>
                <b>{th.name}</b>
              </div>
              <div class="t-boxes">
                <span style="background:{th.primary}"></span>
                <span style="background:{th.secondary}"></span>
                <span style="background:{th.card}; border:1px solid #e5e7eb"></span>
              </div>
              <div class="t-times">
                {#each th.times as tc}
                  <div class="t-time"><span style="background:{tc.color}"></span><small>{tc.label}</small></div>
                {/each}
              </div>
            </button>
          {/each}
        </div>
        {/if}

        <div class="toolbar">
            <div class="search-box">
                <span>🔍</span>
                <input bind:value={search} type="search" placeholder="Search by name, code, owner..." />
                {#if search}<button class="clear-search" on:click={() => (search = "")}>×</button>{/if}
            </div>
            <button class="new-btn" style="background:{activeTheme.primary}" on:click={handleNew}><span>+</span> New</button>
        </div>

        <div class="template-list">
            {#if loading}
                <div class="state"><div class="spinner"></div><p>Loading...</p></div>
            {:else if filteredTemplates.length === 0}
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No templates</h3><button class="new-empty-btn" style="background:{activeTheme.primary}" on:click={handleNew}>+ Create Template</button>
                </div>
            {:else}
                {#each filteredTemplates as template}
                    {@const th = themes.find(x=>x.id===(template.theme||selectedTheme)) || activeTheme}
                    {@const msgColor = getTimeColor(template.createdAt)}
                    <article class="template-card" class:pending={isPending(template)} style="border-left:5px solid {msgColor}; background:{th.card};">
                        <div class="template-icon" role="button" tabindex="0" style="background:{th.card}; border:1px solid {th.primary}; color:{th.primary}" on:click={() => handleUse(template)} on:keydown={(e)=>handleKeydown(e,()=>handleUse(template))}>📄</div>
                        <div class="template-info">
                            <div class="name-row">
                                <h3>{template.name}</h3>
                                <span class="color-box" style="background:{msgColor}" title="Message time color {msgColor}"></span>
                                <span class="theme-tag" style="background:{th.primary}; color:white">{th.name}</span>
                                {#if String(template.owner_id)===String(currentUserId) || String(template.owner_name)===String(currentUserName)}<span class="owner-badge">You • {template.owner_name}</span>{:else}<span class="shared-badge">Shared by {template.owner_name}</span>{/if}
                                {#if isPending(template)}<span class="pending-badge">Pending {template.owner_name} Approval</span>{/if}
                            </div>
                            <div class="meta">Fields: {getFields(template).length} • {getDepartment(template)} • {template.allow_all_contacts? 'All contacts' : `${template.shared_with?.length||0} users`} • Sent: {template.createdAt? new Date(template.createdAt).toLocaleTimeString() : 'now'} <span style="color:{msgColor}; font-weight:800">● {msgColor}</span></div>
                            <p class="description">{getDescription(template)}</p>
                            <div class="time-legend-row">
                              {#each th.times as tc}
                                <div class="legend-item" class:active={tc.color===msgColor}>
                                  <span class="legend-box" style="background:{tc.color}"></span>
                                  <small>{tc.label}</small>
                                </div>
                              {/each}
                            </div>
                            {#if (String(template.owner_id)===String(currentUserId) || String(template.owner_name)===String(currentUserName)) && template.shared_with?.some((s:any)=>!s.approved)}
                                <div class="approval-row">
                                    {#each template.shared_with.filter((s:any)=>!s.approved) as req}
                                        <span>{req.user_id} waiting your approval <button class="mini-approve" on:click={()=>approveUser(template, req.user_id, true)}>Approve</button><button class="mini-reject" on:click={()=>approveUser(template, req.user_id, false)}>Reject</button></span>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        <div class="actions">
                            <button class="action edit" on:click={() => handleEdit(template)}>Edit</button>
                            <button class="action share" style="background:{th.primary}" on:click={() => openShare(template)}>Share</button>
                            <button class="action delete" on:click={() => handleDelete(template)}>Delete</button>
                            <button class="action use" style="background:{th.primary}" on:click={() => handleUse(template)}>Use</button>
                        </div>
                    </article>
                {/each}
            {/if}
        </div>
    </section>
</div>

{#if showShareModal}
<div class="overlay" style="z-index:1100" on:click|self={()=>showShareModal=false}>
    <div class="share-popup">
        <div class="share-head"><h3>🔒 Secure Share - {shareTemplate?.name}</h3><button class="close-btn" on:click={()=>showShareModal=false}>×</button></div>
        <p class="owner-line">Owner: <b>{shareTemplate?.owner_name}</b> • You: <b>{currentUserName}</b> • Theme: <span style="background:{activeTheme.primary}; color:white; padding:2px 6px; border-radius:4px; font-size:10px;">{activeTheme.name}</span></p>
        <label class="check-box"><input type="checkbox" bind:checked={shareAll} /> <b>{currentUserName}:</b> Share to all contacts & groups allowed</label>
        <div class="perm-box">
            <p class="perm-title">B user → C user conditions:</p>
            <label class="check-box"><input type="checkbox" bind:checked={requiresApproval} /> Need permission from {shareTemplate?.owner_name} - approval for installation</label>
            <label class="check-box"><input type="checkbox" bind:checked={allowReshare} /> B can modify & share to C user</label>
            <label class="check-box"><input type="checkbox" bind:checked={canEdit} /> B can edit fields</label>
        </div>
        {#if !shareAll}
        <div>
            <label class="small-label">Enter B user ID</label>
            <input bind:value={shareUserId} placeholder="e.g. contact_123" class="share-input" />
        </div>
        {/if}
        <div class="share-actions">
            <button class="secondary-btn" on:click={()=>showShareModal=false}>Cancel</button>
            <button class="new-btn" style="background:{activeTheme.primary}" on:click={confirmShare}>Share Securely</button>
        </div>
    </div>
</div>
{/if}

<style>
.overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); }
.popup { width: min(920px, 100%); max-height: min(780px, calc(100dvh - 40px)); display: flex; flex-direction: column; overflow: hidden; background: #fff; border-radius: 20px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28); }
.popup-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; gap:12px; }
.title-wrap { display: flex; align-items: center; gap: 12px; min-width:0; }
.title-icon { font-size: 24px; }
h2 { margin: 0; color: #1f2937; font-size: 22px; line-height: 1.2; }
.title-wrap p { margin: 3px 0 0; color: #94a3b8; font-size: 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.head-actions{ display:flex; gap:8px; align-items:center; flex-shrink:0; }
.close-btn { width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: #64748b; font-size: 30px; line-height: 1; cursor: pointer; }
.close-btn:hover { background: #f1f5f9; }
.theme-btn{ padding:6px 12px; border-radius:20px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; }
.theme-picker{ display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; padding:12px 20px; background:#f8fafc; border-bottom:1px solid #e5e7eb; max-height:220px; overflow:auto; }
.theme-opt{ border:1px solid; border-radius:10px; padding:8px; text-align:left; cursor:pointer; display:flex; flex-direction:column; gap:6px; }
.theme-opt.active{ outline:2px solid #111827; }
.theme-opt-top{ display:flex; align-items:center; gap:6px; font-size:11px; }
.t-dot{ width:8px; height:8px; border-radius:50%; display:inline-block; }
.t-boxes{ display:flex; gap:4px; }.t-boxes span{ width:16px; height:10px; border-radius:3px; display:inline-block; }
.t-times{ display:flex; flex-direction:column; gap:2px; }.t-time{ display:flex; gap:4px; align-items:center; }.t-time span{ width:12px; height:8px; border-radius:2px; display:inline-block; }.t-time small{ font-size:9px; color:#475569; }
.toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 22px; border-bottom: 1px solid #eef2f7; }
.search-box { flex: 1; min-width: 0; height: 48px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 1px solid #d9dee7; border-radius: 12px; background: #fff; }
.search-box > span { font-size: 18px; }
.search-box input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; color: #1f2937; background: transparent; font-size: 15px; }
.search-box input::placeholder { color: #94a3b8; }
.clear-search { width: 28px; height: 28px; border: 0; border-radius: 50%; background: #f1f5f9; color: #64748b; cursor: pointer; font-size: 18px; }
.new-btn { height: 48px; min-width: 108px; padding: 0 18px; border: 0; border-radius: 11px; background: #16a34a; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; }
.new-btn span { margin-right: 5px; font-size: 20px; }
.template-list { flex: 1; min-height: 180px; overflow-y: auto; padding: 8px 20px 14px; -webkit-overflow-scrolling:touch; }
.template-card { display: flex; align-items: center; gap: 14px; min-height: 110px; margin: 8px 0; padding: 14px; border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; }
.template-card.pending{ opacity:.6; border-color:#f59e0b; }
.template-icon { width: 62px; height: 62px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 11px; font-size: 30px; cursor: pointer; }
.template-info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.name-row h3 { margin: 0; color: #334155; font-size: 17px; word-break:break-word; }
.color-box{ width:18px; height:18px; border-radius:4px; border:1px solid rgba(0,0,0,.1); display:inline-block; }
.theme-tag{ padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; white-space:nowrap; }
.owner-badge{ background:#dcfce7; color:#166534; padding:3px 7px; border-radius:5px; font-size:10px; font-weight:700; }
.shared-badge{ background:#e0e7ff; color:#3730a3; padding:3px 7px; border-radius:5px; font-size:10px; font-weight:700; }
.pending-badge{ background:#fef3c7; color:#92400e; padding:3px 7px; border-radius:5px; font-size:10px; font-weight:700; }
.meta { margin-top: 6px; color: #64748b; font-size: 12px; line-height:1.4; word-break:break-word; }
.description { margin: 5px 0 0; overflow: hidden; color: #94a3b8; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.time-legend-row{ display:flex; gap:8px; margin-top:8px; flex-wrap:wrap; }
.legend-item{ display:flex; align-items:center; gap:4px; padding:4px 8px; border-radius:6px; background:#f8fafc; border:1px solid #e5e7eb; }
.legend-item.active{ border-color:#111827; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.1); }
.legend-box{ width:14px; height:10px; border-radius:3px; display:inline-block; }
.legend-item small{ font-size:10px; color:#475569; font-weight:600; }
.approval-row{ margin-top:6px; background:#fffbeb; border:1px solid #fcd34d; padding:6px 8px; border-radius:8px; font-size:12px; display:flex; flex-direction:column; gap:4px; }
.mini-approve{ background:#16a34a; color:white; border:none; padding:5px 10px; border-radius:5px; margin-left:6px; cursor:pointer; font-weight:700; }
.mini-reject{ background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:5px; margin-left:4px; cursor:pointer; font-weight:700; }
.actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap:wrap; }
.action { height: 42px; padding: 0 15px; border: 0; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; min-height:42px; }
.edit { background: #f1f5f9; color: #475569; }
.delete { background: #ef4444; color: #fff; }
.use { color: #fff; }
.share{ color:#fff; }
.state,.empty-state { min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #64748b; }
.spinner { width: 30px; height: 30px; border: 3px solid #dbeafe; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
.secondary-btn,.new-empty-btn { margin-top: 16px; height: 44px; padding: 0 18px; border: 0; border-radius: 9px; cursor: pointer; font-weight: 700; font-size:15px; }
.secondary-btn { background: #f1f5f9; color: #475569; }
.new-empty-btn { color: #fff; }
.share-popup{ background:white; width:min(500px,95%); padding:20px; border-radius:20px; display:flex; flex-direction:column; gap:14px; max-height:90vh; overflow:auto; }
.share-head{ display:flex; justify-content:space-between; align-items:center; }
.share-head h3{ margin:0; font-size:16px; }
.owner-line{ margin:0; font-size:12px; color:#64748b; }
.perm-box{ background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:12px; display:flex; flex-direction:column; gap:10px; }
.perm-title{ margin:0; font-weight:700; font-size:13px; }
.check-box{ display:flex; gap:8px; font-size:13px; align-items:flex-start; line-height:1.4; }
.share-input{ padding:12px; border:1px solid #cbd5e1; border-radius:10px; width:100%; box-sizing:border-box; font-size:16px; }
.small-label{ font-size:12px; color:#64748b; font-weight:600; margin-bottom:4px; display:block; }
.share-actions{ display:flex; gap:8px; justify-content:flex-end; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px){
.overlay{ padding:0; align-items:flex-end; }
.popup{ width:100%; max-width:100%; height:100dvh; max-height:100dvh; border-radius:0; }
.popup-header{ padding:12px 14px; flex-wrap:wrap; }
  h2{ font-size:18px; }
.title-wrap p{ font-size:11px; white-space:normal; }
.theme-btn{ font-size:12px; padding:8px 12px; }
.theme-picker{ grid-template-columns:repeat(2,1fr); max-height:50vh; padding:10px; gap:6px; }
.toolbar{ padding:10px 12px; gap:8px; flex-direction:column; align-items:stretch; }
.search-box{ height:50px; font-size:16px; }
.search-box input{ font-size:16px; }
.new-btn{ width:100%; height:50px; font-size:16px; min-width:100%; }
.template-list{ padding:6px 10px 80px; }
.template-card{ flex-direction:column; align-items:flex-start; gap:10px; padding:14px; min-height:auto; border-radius:16px; }
.template-icon{ width:48px; height:48px; font-size:22px; }
.name-row h3{ font-size:17px; line-height:1.3; }
.meta{ font-size:12px; }
.description{ white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-clamp:2; }
.time-legend-row{ gap:6px; }
.legend-item{ padding:5px 8px; }
.actions{ width:100%; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.action{ width:100%; height:48px; font-size:14px; }
.share-popup{ width:100%; max-width:100%; height:100dvh; max-height:100dvh; border-radius:0; padding:16px; padding-bottom:env(safe-area-inset-bottom); }
.share-input{ font-size:16px; height:48px; }
.check-box{ font-size:14px; padding:4px 0; }
.check-box input{ width:20px; height:20px; }
}
@media (min-width: 769px){
.template-card:hover{ transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,0,0,.08); transition:all.15s; }
.action:hover{ filter:brightness(1.1); }
}
</style>