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

  let search = "";
  let showMainMenu = false;
  let activeFilter = "All";

  $: filteredContacts = contacts.filter((c:any)=>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  $: filteredGroups = groups.filter((g:any)=> g.name?.toLowerCase().includes(search.toLowerCase()));

  $: displayContacts = activeFilter==='Groups'? [] : filteredContacts;
  $: displayGroups = activeFilter==='All' || activeFilter==='Groups'? filteredGroups : [];

  function getInitials(n:string){
    return n? n.trim().split(' ').map((x:string)=>x[0]).join('').toUpperCase().slice(0,2) : 'U';
  }

  // FIX 4 - Outside click hide
  function clickOutside(node: HTMLElement, cb: () => void) {
    const handle = (e: MouseEvent) => {
      if (!node.contains(e.target as Node)) cb();
    };
    document.addEventListener('click', handle, true);
    return {
      destroy() { document.removeEventListener('click', handle, true); }
    };
  }

  // FIX 5 - Contact open 100% working
  function handleContactClick(c:any, e: MouseEvent){
    e.stopPropagation();
    // Don't open if pending
    if(c.status==='pending') return;
    // If invite_received, don't auto open, need accept first
    if(c.status==='invite_received') return;

    // FIX 6 - Open message page no sidebar (mobile handled in parent)
    onSelectContact(c);
  }

  function handleGroupClick(g:any, e: MouseEvent){
    e.stopPropagation();
    onSelectGroup(g);
  }
</script>

<div class="sidebar">
  <div class="sidebar-header">
    <h1>WhatsApp</h1>
    <div class="header-actions">
      <button class="icon-btn" title="New chat" on:click={(e)=>{e.stopPropagation(); onNewContact();}}>✎</button>

      <div class="menu-container" use:clickOutside={()=>showMainMenu=false}>
        <button class="icon-btn" on:click={(e)=>{e.stopPropagation(); showMainMenu=!showMainMenu}}>⋮</button>

        {#if showMainMenu}
          <div class="dropdown">
            <button on:click={()=>{ showMainMenu=false; onNewGroup(); }}>New group</button>
            <button on:click={()=>{ showMainMenu=false; onNewContact(); }}>New contact</button>
            <button on:click={()=>{ showMainMenu=false; }}>Archived</button>
            <button on:click={()=>{ showMainMenu=false; }}>Starred messages</button>
            <button on:click={()=>{ showMainMenu=false; }}>Settings</button>
            <button class="logout" on:click={()=>{ showMainMenu=false; onLogout(); }}>Log out</button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="search-wrap">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input bind:value={search} placeholder="Search or start new chat" />
    </div>
  </div>

  <div class="filters">
    {#each ['All','Unread','Favorites','Groups'] as f}
      <button class:active={activeFilter===f} on:click={()=>activeFilter=f}>{f}</button>
    {/each}
  </div>

  <div class="chat-list">
    {#each displayGroups as g}
      <div class="chat-row"
        class:selected={selectedGroup?.id===g.id}
        role="button" tabindex="0"
        on:click={(e)=>handleGroupClick(g,e)}
        on:keydown={(e)=>{ if(e.key==='Enter') onSelectGroup(g)}}>
        <div class="avatar group">👥</div>
        <div class="info">
          <div class="top"><span class="name">{g.name}</span><span class="time">Now</span></div>
          <span class="sub">Tap to open group</span>
        </div>
      </div>
    {/each}

    {#each displayContacts as c}
      <div class="chat-row"
        class:selected={selectedContact?.id===c.id}
        class:disabled={c.status==='pending'}
        role="button" tabindex="0"
        on:click={(e)=>handleContactClick(c,e)}
        on:keydown={(e)=>{ if(e.key==='Enter') handleContactClick(c,e)}}>

        <div class="avatar" class:online={c.status==='accepted'}>
          {#if c.avatar_url}
            <img src={c.avatar_url} alt="" />
          {:else}
            {getInitials(c.name||c.email)}
          {/if}
        </div>

        <div class="info">
          <div class="top">
            <span class="name">{c.name||c.email}</span>
            {#if c.status==='accepted' ||!c.status}
              <span class="time"></span>
            {/if}
          </div>

          {#if c.status==='pending'}
            <span class="sub pending">⏳ Invite pending - {c.email}</span>
          {:else if c.status==='invite_received'}
            <span class="sub">Invitation • {c.email}</span>
            <div class="invite-actions">
              <button class="accept" on:click={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'accepted'}}) }}>Accept</button>
              <button class="reject" on:click={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'rejected'}}) }}>Reject</button>
            </div>
          {:else}
            <span class="sub">{c.email? c.email.slice(0,25) : 'Tap to chat'}</span>
          {/if}
        </div>
      </div>
    {/each}

    {#if displayContacts.length===0 && displayGroups.length===0}
      <div class="no-chat">
        <div>🔍</div>
        <p>No chats found</p>
        <span>Try searching with different keyword</span>
      </div>
    {/if}
  </div>

  <!-- FIX 10 - Bottom nav only 4 items -->
  <div class="bottom-nav">
    <button class="b-nav-item active"><span>💬</span><span>Chats</span></button>
    <button class="b-nav-item"><span>🔄</span><span>Updates</span></button>
    <button class="b-nav-item"><span>👥</span><span>Communities</span></button>
    <button class="b-nav-item"><span>📞</span><span>Calls</span></button>
  </div>
</div>

<style>
.sidebar{ width:100%; max-width:430px; height:100vh; background:#111b21; border-right:1px solid #222d34; display:flex; flex-direction:column; position:relative; }
.sidebar-header{ height:59px; background:#202c33; display:flex; justify-content:space-between; align-items:center; padding:0 16px; color:#fff; flex-shrink:0; }
.sidebar-header h1{ margin:0; font-size:19px; font-weight:700; }
.header-actions{ display:flex; gap:4px; align-items:center; }
.icon-btn{ background:transparent; border:none; color:#aebac1; font-size:20px; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.icon-btn:hover{ background:#374045; color:#fff; }
.menu-container{ position:relative; }
.dropdown{ position:absolute; right:0; top:40px; background:#233138; border-radius:8px; z-index:99; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.6); min-width:200px; border:1px solid #2a3942; }
.dropdown button{ display:block; width:100%; background:transparent; border:none; color:#e9edef; padding:12px 16px; text-align:left; cursor:pointer; font-size:14.5px; }
.dropdown button:hover{ background:#2a3942; }
.dropdown button.logout{ color:#f15c6d; border-top:1px solid #2a3942; }

.search-wrap{ padding:7px 12px; background:#111b21; flex-shrink:0; }
.search-box{ background:#202c33; border-radius:8px; padding:0 12px; display:flex; align-items:center; gap:10px; height:36px; }
.search-icon{ color:#8696a0; font-size:14px; }
.search-box input{ background:transparent; border:none; color:#d1d7db; width:100%; outline:none; font-size:14px; }
.search-box input::placeholder{ color:#8696a0; }

.filters{ display:flex; gap:8px; padding:8px 12px; flex-shrink:0; overflow-x:auto; scrollbar-width:none; }
.filters button{ background:#182229; color:#8696a0; border:none; border-radius:18px; padding:6px 12px; font-size:13px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
.filters button.active{ background:#0a332c; color:#00a884; font-weight:600; }

.chat-list{ flex:1; overflow-y:auto; scrollbar-width:thin; scrollbar-color:#374045 transparent; }
.chat-row{ display:flex; align-items:center; padding:0 12px; cursor:pointer; transition:background 0.15s; position:relative; }
.chat-row:hover{ background:#202c33; }
.chat-row.selected{ background:#2a3942; }
.chat-row.disabled{ opacity:0.6; cursor:default; }
.avatar{ width:49px; height:49px; border-radius:50%; background:#3a4a54; color:#fff; display:flex; align-items:center; justify-content:center; margin:8px 12px 8px 0; font-weight:600; flex-shrink:0; font-size:16px; overflow:hidden; }
.avatar img{ width:100%; height:100%; object-fit:cover; }
.avatar.group{ background:#00a884; font-size:22px; }
.info{ flex:1; border-top:1px solid #222d34; padding:12px 0; min-width:0; }
.top{ display:flex; justify-content:space-between; align-items:center; gap:8px; }
.name{ color:#e9edef; font-size:16.5px; font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
.time{ color:#8696a0; font-size:11.5px; flex-shrink:0; }
.sub{ color:#8696a0; font-size:13px; display:block; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sub.pending{ color:#f1c40f; }

.invite-actions{ display:flex; gap:8px; margin-top:8px; }
.accept{ background:#00a884; color:#111b21; border:none; border-radius:16px; padding:6px 14px; font-size:12.5px; font-weight:700; cursor:pointer; }
.reject{ background:#2a3942; color:#e9edef; border:none; border-radius:16px; padding:6px 14px; font-size:12.5px; cursor:pointer; }

.no-chat{ color:#8696a0; text-align:center; padding:60px 20px; font-size:14px; display:flex; flex-direction:column; gap:6px; align-items:center; }
.no-chat div{ font-size:40px; opacity:0.5; }

.bottom-nav{
  display:none; /* FIX 10 - hide on desktop, only show mobile if needed */
  height:50px; background:#202c33;
  border-top:1px solid #2a3942;
  justify-content:space-around; align-items:center;
  flex-shrink:0;
}
.b-nav-item{
  background:none; border:none; color:#8696a0;
  display:flex; flex-direction:column; align-items:center;
  gap:2px; font-size:10px; cursor:pointer; padding:4px 16px;
}
.b-nav-item.active{ color:#e9edef; }
.b-nav-item span:first-child{ font-size:20px; }

@media (max-width:768px){
 .sidebar{ max-width:100%; width:100vw; }
 .bottom-nav{ display:flex; }
}
</style>