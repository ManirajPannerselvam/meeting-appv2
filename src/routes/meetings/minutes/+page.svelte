<script>
  import { onMount } from "svelte";
  let title=""; let description=""; let date="";
  let meetings=[]; let loading=false; let saving=false; let error="";

  async function loadMeetings(){
    loading=true;
    try{
      const res=await fetch("/api/meetings");
      const data=await res.json();
      meetings=data.meetings||[];
    }catch(e){ console.error(e); } finally{ loading=false; }
  }

  async function createMeeting(){
    error="";
    if(!title.trim()){ error="Title is required"; return; }
    if(!date){ error="Date is required"; return; }
    saving=true;
    try{
      const res=await fetch("/api/meetings",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ title:title.trim(), description:description.trim(), date, created_by:1 })
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Save failed");
      title=""; description=""; date="";
      await loadMeetings();
      window.scrollTo({top:0, behavior:"smooth"});
    }catch(e){ error=e.message; alert(error); }
    finally{ saving=false; }
  }
  onMount(loadMeetings);
</script>

<svelte:head>
<style>
  html,body{ overflow:auto!important; height:auto!important; }
  body{ background:#f6f8fb; margin:0; -webkit-overflow-scrolling:touch; }
</style>
</svelte:head>

<div class="page">
  <header class="top">
    <div><h1>Meetings</h1><p>Create and manage meetings • {meetings.length} total</p></div>
    <button class="ghost" on:click={loadMeetings}>↻ Refresh</button>
  </header>

  <div class="layout">
    <div class="main">
      <div class="card">
        <div class="card-h"><h2>New Meeting</h2><span class="badge">Enterprise</span></div>
        {#if error}<div class="alert">{error}</div>{/if}
        <div class="field"><label>Title *</label><input bind:value={title} placeholder="e.g. Production Review"/></div>
        <div class="field"><label>Description</label><textarea bind:value={description} placeholder="Agenda, objective..." rows="4"></textarea></div>
        <div class="field"><label>Date *</label><input type="date" bind:value={date}/></div>
        <button class="primary" on:click={createMeeting} disabled={saving}>{#if saving}Saving...{:else}➕ Create Meeting{/if}</button>
        <small class="hint">Press Enter after Title • Mobile friendly</small>
      </div>

      <div class="card list" id="list">
        <div class="card-h"><h2>All Meetings ({meetings.length})</h2></div>
        {#if loading}<div class="center">Loading...</div>
        {:else if meetings.length===0}<div class="center">📭 No meetings yet</div>
        {:else}
          <div class="items">
            {#each meetings as m (m.id)}
              <div class="item">
                <div class="item-t"><b>{m.title}</b><span class="date">{m.date || m.meeting_date || ""}</span></div>
                {#if m.description}<p>{m.description}</p>{/if}
                <small class="id">#{m.id}</small>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <div class="spacer"></div>
    </div>

    <aside class="side">
      <div class="card sticky">
        <h2>Summary</h2>
        <div class="row"><span>Total</span><b>{meetings.length}</b></div>
        <div class="row"><span>Last</span><b>{meetings[0]?.title || "-"}</b></div>
        <div class="row"><span>Date</span><b>{date || "-"}</b></div>
        <div class="prog"><div style="width:{title && date? '100%' : title || date? '50%' : '0%'}"></div></div>
        <button class="primary full" on:click={createMeeting} disabled={saving}>💾 Save</button>
      </div>
    </aside>
  </div>

  <div class="mob-bar">
    <button class="ghost" on:click={loadMeetings}>Refresh</button>
    <button class="primary" on:click={createMeeting} disabled={saving}>Save</button>
  </div>
</div>

<style>
.page{ min-height:100dvh; display:flex; flex-direction:column; }
.top{ position:sticky; top:0; z-index:10; background:rgba(255,255,255,.92); backdrop-filter:blur(12px); border-bottom:1px solid #eef2f7; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; }
.top h1{ margin:0; font-size:18px; font-weight:800; }.top p{ margin:4px 0 0; font-size:12px; color:#64748b; }

.layout{ display:grid; grid-template-columns:1fr 300px; gap:14px; max-width:1100px; width:100%; margin:0 auto; padding:14px; flex:1; }
.main{ display:flex; flex-direction:column; gap:14px; min-width:0; }
.card{ background:white; border:1px solid #eef2f7; border-radius:16px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.card-h{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }.card-h h2{ margin:0; font-size:13px; font-weight:700; text-transform:uppercase; }
.badge{ background:#0f172a; color:white; font-size:10px; padding:4px 8px; border-radius:20px; }
.field{ margin-bottom:12px; } label{ display:block; font-size:11px; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase; }
input,textarea{ width:100%; padding:11px 12px; border-radius:10px; border:1px solid #e2e8f0; background:#fbfdff; font-size:14px; box-sizing:border-box; } input:focus,textarea:focus{ outline:none; border-color:#0f172a; background:white; }
.primary{ padding:12px 16px; border-radius:10px; border:none; background:#0f172a; color:white; font-weight:700; cursor:pointer; }.primary:disabled{ opacity:.6; }.primary.full{ width:100%; }
.ghost{ padding:8px 14px; border-radius:10px; border:1px solid #e2e8f0; background:white; font-weight:600; font-size:12px; cursor:pointer; }
.alert{ background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:8px 10px; border-radius:8px; font-size:12px; margin-bottom:12px; }
.hint{ color:#94a3b8; font-size:10px; display:block; margin-top:8px; }
.center{ text-align:center; padding:30px; color:#94a3b8; font-size:13px; }
.items{ display:flex; flex-direction:column; gap:8px; }
.item{ border:1px solid #f1f5f9; border-radius:12px; padding:12px; background:#fbfdff; }.item-t{ display:flex; justify-content:space-between; gap:8px; }.item-t b{ font-size:13px; }.date{ font-size:11px; color:#64748b; font-family:monospace; }.item p{ margin:6px 0 0; font-size:12px; color:#475569; }.id{ font-family:monospace; color:#94a3b8; font-size:10px; }
.side.sticky{ position:sticky; top:66px; }.row{ display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f8fafc; font-size:12px; }.row span{ color:#64748b; }.prog{ height:6px; background:#f1f5f9; border-radius:10px; margin:12px 0; overflow:hidden; }.prog div{ height:100%; background:#0f172a; transition:width.3s; }
.spacer{ height:20px; }.mob-bar{ display:none; }

@media(max-width:850px){
 .layout{ grid-template-columns:1fr; padding:10px; padding-bottom:80px; }
 .side{ order:-1; }.side.sticky{ position:static; }
 .mob-bar{ display:flex; position:fixed; bottom:0; left:0; right:0; background:white; border-top:1px solid #e2e8f0; padding:10px; gap:8px; z-index:20; padding-bottom:calc(10px + env(safe-area-inset-bottom)); }
 .mob-bar.primary,.mob-bar.ghost{ flex:1; height:44px; }
  input,textarea{ font-size:16px; }
}
</style>