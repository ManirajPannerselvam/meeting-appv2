<script lang="ts">
  export let contacts: any[] = [];
  export let groups: any[] = [];
  export let selectedContact: any = null;
  export let selectedGroup: any = null;
  export let onSelectContact: any = ()=>{};
  export let onSelectGroup: any = ()=>{};
  export let onNewGroup: any = ()=>{};
  export let onNewContact: any = ()=>{};
  export let onLogout: any = ()=>{};
  export let onHandleInvite: any = ()=>{};

  let search = ""; let showMainMenu = false; let activeFilter = "All";
  $: filteredContacts = contacts.filter((c:any)=> c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));
  $: filteredGroups = groups.filter((g:any)=> g.name?.toLowerCase().includes(search.toLowerCase()));
  $: displayContacts = activeFilter==='Groups'? [] : filteredContacts;
  $: displayGroups = activeFilter==='All' || activeFilter==='Groups'? filteredGroups : [];
  function getInitials(n:string){ return n? n.trim().split(' ').map((x:string)=>x[0]).join('').toUpperCase().slice(0,2) : 'U'; }
</script>

<div class="sidebar">
  <div class="sidebar-header"><h1>Chat</h1><button class="icon-btn" onclick={(e)=>{e.stopPropagation(); showMainMenu=!showMainMenu}}>⋮</button>{#if showMainMenu}<div class="dropdown"><button onclick={()=>{ showMainMenu=false; onNewGroup(); }}>New group</button><button onclick={()=>{ showMainMenu=false; onNewContact(); }}>New contact</button><button class="logout" onclick={()=>{ showMainMenu=false; onLogout(); }}>Log out</button></div>{/if}</div>
  <div class="search-wrap"><div class="search-box"><input bind:value={search} placeholder="Search or start a new chat" /></div></div>
  <div class="filters">{#each ['All','Unread','Favorites','Groups'] as f}<button class:active={activeFilter===f} onclick={()=>activeFilter=f}>{f}</button>{/each}</div>
  <div class="chat-list">
    {#each displayGroups as g}
      <div class="chat-row" class:selected={selectedGroup?.id===g.id} role="button" tabindex="0" onclick={()=>onSelectGroup(g)} onkeydown={(e)=>{ if(e.key==='Enter') onSelectGroup(g)}}>
        <div class="avatar group">👥</div><div class="info"><div class="top"><span class="name">{g.name}</span></div><span class="sub">Tap to open</span></div>
      </div>
    {/each}
    {#each displayContacts as c}
      <div class="chat-row" class:selected={selectedContact?.id===c.id} role="button" tabindex="0" onclick={()=>{ if(c.status==='accepted' ||!c.status) onSelectContact(c); }} onkeydown={(e)=>{ if(e.key==='Enter' && (c.status==='accepted' ||!c.status)) onSelectContact(c)}}>
        <div class="avatar">{getInitials(c.name||c.email)}</div>
        <div class="info">
          <div class="top"><span class="name">{c.name||c.email}</span></div>

          {#if c.status==='pending'}
            <span class="sub pending">Invite pending</span>
          {:else if c.status==='invite_received'}
            <span class="sub">Invitation • {c.email}</span>
            <div class="invite-actions">
              <button class="accept" onclick={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'accepted'}}) }}>Accept</button>
              <button class="reject" onclick={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'rejected'}}) }}>Reject</button>
            </div>
          {:else}
            <span class="sub">Tap to chat</span>
          {/if}
        </div>
      </div>
    {/each}
    {#if displayContacts.length===0 && displayGroups.length===0}
      <div class="no-chat">No chats found</div>
    {/if}
  </div>
</div>

<style>
.sidebar{ width:410px; height:100vh; background:#111b21; border-right:1px solid #222d34; display:flex; flex-direction:column; position:relative; }
.sidebar-header{ height:64px; background:#202c33; display:flex; justify-content:space-between; align-items:center; padding:0 20px; color:#fff; }
.sidebar-header h1{ margin:0; font-size:20px; }
.icon-btn{ background:transparent; border:none; color:#aebac1; font-size:22px; cursor:pointer; }
.dropdown{ position:absolute; right:10px; top:50px; background:#233138; border-radius:8px; z-index:99; overflow:hidden; box-shadow:0 8px 20px rgba(0,0,0,0.5); }
.dropdown button{ display:block; width:100%; background:transparent; border:none; color:#fff; padding:12px 16px; text-align:left; cursor:pointer; }
.dropdown button:hover{ background:#2a3942; }
.search-wrap{ padding:10px; }.search-box{ background:#202c33; border-radius:8px; padding:8px 12px; }.search-box input{ background:transparent; border:none; color:#fff; width:100%; outline:none; }
.filters{ display:flex; gap:6px; padding:6px 12px; }.filters button{ background:#1f2c34; color:#8696a0; border:none; border-radius:20px; padding:6px 12px; font-size:13px; cursor:pointer; }.filters button.active{ background:#0a332c; color:#00a884; }
.chat-list{ flex:1; overflow-y:auto; }
.chat-row{ display:flex; align-items:center; padding:0 12px; cursor:pointer; }.chat-row:hover{ background:#202c33; }.chat-row.selected{ background:#2a3942; }
.avatar{ width:49px; height:49px; border-radius:50%; background:#3a4a54; color:#fff; display:flex; align-items:center; justify-content:center; margin:8px 12px 8px 0; font-weight:600; flex-shrink:0; }.avatar.group{ background:#00a884; }
.info{ flex:1; border-top:1px solid #222d34; padding:12px 0; min-width:0; }.name{ color:#e9edef; font-size:16px; }.sub{ color:#8696a0; font-size:13px; display:block; margin-top:2px; }.sub.pending{ color:#f1c40f; }
.invite-actions{ display:flex; gap:8px; margin-top:6px; }
.accept{ background:#00a884; color:#111b21; border:none; border-radius:16px; padding:5px 12px; font-size:12px; font-weight:700; cursor:pointer; }
.reject{ background:#2a3942; color:#e9edef; border:none; border-radius:16px; padding:5px 12px; font-size:12px; cursor:pointer; }
.no-chat{ color:#8696a0; text-align:center; padding:30px; font-size:14px; }
</style>