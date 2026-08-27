<script lang="ts">
  let {
    contacts = [] as any[],
    groups = [] as any[],
    selectedContact = null as any,
    selectedGroup = null as any,
    onSelectContact = (_c:any)=>{},
    onSelectGroup = (_g:any)=>{},
    onNewGroup = ()=>{},
    onNewContact = ()=>{},
    onLogout = ()=>{},
    onHandleInvite = (_e:any)=>{},
    onDeleteContact = (_c:any)=>{},
    onUpdateAvatar = (_e:any)=>{}
  } = $props();

  let search = $state("");
  let showMainMenu = $state(false);
  let activeFilter = $state("All");
  let longPressTimer: any = $state(null);
  let showDeleteMenu: string | null = $state(null);
  let deleteTarget: any = $state(null);

  let filteredContacts = $derived.by(()=>{
    if(!search.trim()) return contacts;
    const s = search.toLowerCase();
    return contacts.filter((c:any)=>
      c.name?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s)
    )
  });

  let filteredGroups = $derived.by(()=>{
    if(!search.trim()) return groups;
    const s = search.toLowerCase();
    return groups.filter((g:any)=> g.name?.toLowerCase().includes(s));
  });

  let displayContacts = $derived.by(()=>{
    if(activeFilter==='Groups') return [];
    let list = [...filteredContacts];
    // self on top
    let selfIdx = list.findIndex((c:any)=>c.isSelf);
    if(selfIdx>0){
      const self = list.splice(selfIdx,1)[0];
      list.unshift(self);
    }
    // Unread filter
    if(activeFilter==='Unread'){
      list = list.filter((c:any)=> c.unread_count>0);
    }
    if(activeFilter==='Favorites'){
      list = list.filter((c:any)=> c.isFavorite || c.isPinned);
    }
    if(selfIdx===-1 && activeFilter==='All'){
      list.sort((a:any,b:any)=>{
        if(a.isSelf) return -1;
        if(b.isSelf) return 1;
        if(a.status==='accepted' && b.status!=='accepted') return -1;
        if(b.status==='accepted' && a.status!=='accepted') return 1;
        return 0;
      });
    }
    return list;
  });

  let displayGroups = $derived.by(()=>{
    if(activeFilter==='All') return filteredGroups;
    if(activeFilter==='Groups') return filteredGroups;
    if(activeFilter==='Unread') return filteredGroups.filter((g:any)=> g.unread_count>0);
    return [];
  });

  function getInitials(n:string){
    return n? n.trim().split(' ').map((x:string)=>x[0]).join('').toUpperCase().slice(0,2) : 'U';
  }
  function clickOutside(node: HTMLElement, cb: () => void) {
    const handle = (e: MouseEvent) => { if (!node.contains(e.target as Node)) setTimeout(cb, 10); };
    document.addEventListener('mousedown', handle, true);
    return { destroy() { document.removeEventListener('mousedown', handle, true); } };
  }
  function handleContactClick(c:any, e: MouseEvent){
    e.stopPropagation();
    if(showDeleteMenu) { showDeleteMenu = null; return; }
    if(c.status==='pending') return;
    if(c.status==='invite_received') return;
    onSelectContact(c);
  }
  function handleGroupClick(g:any, e: MouseEvent){
    e.stopPropagation();
    if(showDeleteMenu) { showDeleteMenu = null; return; }
    onSelectGroup(g);
  }
  function onTouchStart(c:any){
    longPressTimer = setTimeout(() => {
      deleteTarget = c;
      showDeleteMenu = c.id;
      if(navigator.vibrate) navigator.vibrate(50);
    }, 700);
  }
  function onTouchEnd(){ clearTimeout(longPressTimer); }
  function onContextMenu(e: MouseEvent, c:any){
    e.preventDefault();
    deleteTarget = c;
    showDeleteMenu = c.id;
  }
  function confirmDelete(){
    if(deleteTarget){
      onDeleteContact(deleteTarget);
      showDeleteMenu = null;
    }
  }
  function triggerAvatarUpload(c:any, e: MouseEvent){
    e.stopPropagation();
    // only self can change avatar
    if(!c.isSelf) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (ev:any) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if(file) onUpdateAvatar({contact: c, file});
    };
    input.click();
  }
  function getLastMessage(c:any){
    if(c.isSelf) return 'Message yourself';
    if(c.last_message) return c.last_message.slice(0,28);
    if(c.lastMessage) return c.lastMessage.slice(0,28);
    if(c.email) return c.email.slice(0,25);
    return 'Tap to chat';
  }
</script>

<div class="sidebar">
  <div class="sidebar-header">
    <h1>Chat</h1>
    <div class="header-actions">
      <button class="icon-btn" title="New chat" onclick={(e)=>{e.stopPropagation(); onNewContact();}}>✎</button>
      <div class="menu-container" use:clickOutside={()=>showMainMenu=false}>
        <button class="icon-btn" onclick={(e)=>{e.stopPropagation(); showMainMenu=!showMainMenu}}>⋮</button>
        {#if showMainMenu}
          <div class="dropdown" onclick={(e)=>{e.stopPropagation()}}>
            <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onNewGroup(); }}>New group</button>
            <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onNewContact(); }}>New contact</button>
            <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; }}>Archived</button>
            <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; }}>Starred messages</button>
            <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; }}>Settings</button>
            <button class="logout" onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onLogout(); }}>Log out</button>
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
      <button class:active={activeFilter===f} onclick={()=>activeFilter=f}>{f}</button>
    {/each}
  </div>

  <!-- removed debug line - it was causing extra space on mobile -->

  <div class="chat-list">
    {#each displayGroups as g (g.id)}
      <div class="chat-row" class:selected={selectedGroup?.id===g.id}
        role="button" tabindex="0"
        onclick={(e)=>handleGroupClick(g,e)}
        ontouchstart={()=>onTouchStart(g)}
        ontouchend={onTouchEnd}
        oncontextmenu={(e)=>onContextMenu(e,g)}
        onkeydown={(e)=>{ if(e.key==='Enter') onSelectGroup(g)}}>
        <div class="avatar group">👥</div>
        <div class="info">
          <div class="top"><span class="name">{g.name}</span><span class="time">{g.last_time || ''}</span></div>
          <span class="sub">{g.last_message || 'Tap to open group'}</span>
        </div>
        {#if g.unread_count > 0}<div class="unread-badge">{g.unread_count}</div>{/if}
      </div>
    {/each}

    {#each displayContacts as c (c.id)}
      <div class="chat-row" class:selected={selectedContact?.id===c.id} class:disabled={c.status==='pending'} class:self-row={c.isSelf}
        role="button" tabindex="0"
        onclick={(e)=>handleContactClick(c,e)}
        ontouchstart={()=>onTouchStart(c)}
        ontouchend={onTouchEnd}
        ontouchmove={onTouchEnd}
        oncontextmenu={(e)=>onContextMenu(e,c)}
        onkeydown={(e)=>{ if(e.key==='Enter') handleContactClick(c,e)}}>
        <div class="avatar" class:online={c.status==='accepted'} class:self-avatar={c.isSelf} onclick={(e)=>triggerAvatarUpload(c,e)}>
          {#if c.avatar_url}<img src={c.avatar_url} alt="" />{:else if c.isSelf}💾{:else}{getInitials(c.name||c.email)}{/if}
        </div>
        <div class="info">
          <div class="top"><span class="name">{c.name||c.email}{#if c.isSelf} (You){/if}</span><span class="time">{c.last_time || ''}</span></div>
          {#if c.status==='pending'}
            <span class="sub pending">⏳ Invite pending - {c.email}</span>
          {:else if c.status==='invite_received'}
            <span class="sub">Invitation • {c.email}</span>
            <div class="invite-actions">
              <button class="accept" onclick={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'accepted'}}) }}>Accept</button>
              <button class="reject" onclick={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'rejected'}}) }}>Reject</button>
            </div>
          {:else}<span class="sub">{getLastMessage(c)}</span>{/if}
        </div>
        {#if c.unread_count > 0 && c.status!=='pending' && c.status!=='invite_received'}
          <div class="unread-badge">{c.unread_count > 99? '99+' : c.unread_count}</div>
        {/if}
        {#if showDeleteMenu===c.id}
          <div class="delete-popup" use:clickOutside={()=>showDeleteMenu=null}>
            <button onclick={(e)=>{ e.stopPropagation(); confirmDelete(); }}>🗑️ Delete {c.name||'chat'}</button>
            <button onclick={(e)=>{ e.stopPropagation(); showDeleteMenu=null; }}>Cancel</button>
          </div>
        {/if}
      </div>
    {/each}

    {#if displayContacts.length===0 && displayGroups.length===0}
      <div class="no-chat">
        <div>🔍</div>
        <p>No chats found</p>
        <button class="accept" style="margin-top:12px" onclick={()=>{search=''; activeFilter='All';}}>Clear filter</button>
      </div>
    {/if}
  </div>
  <div class="bottom-nav">
    <button class="b-nav-item active"><span>💬</span><span>Chats</span></button>
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
.filters{ display:flex; gap:8px; padding:8px 12px; flex-shrink:0; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; white-space:nowrap; }
.filters::-webkit-scrollbar{ display:none; }
.filters button{ background:#182229; color:#8696a0; border:none; border-radius:18px; padding:6px 12px; font-size:13px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
.filters button.active{ background:#0a332c; color:#00a884; font-weight:600; }
.chat-list{ flex:1; overflow-y:auto; padding-bottom:10px; }
.chat-row{ display:flex; align-items:center; padding:0 12px; cursor:pointer; position:relative; }
.chat-row:hover{ background:#202c33; }
.chat-row.selected{ background:#2a3942; }
.chat-row.disabled{ opacity:0.6; cursor:default; }
.chat-row.self-row{ background:#1a2a22; }
.avatar{ width:49px; height:49px; border-radius:50%; background:#3a4a54; color:#fff; display:flex; align-items:center; justify-content:center; margin:8px 12px 8px 0; font-weight:600; flex-shrink:0; font-size:16px; overflow:hidden; position:relative; }
.avatar img{ width:100%; height:100%; object-fit:cover; }
.avatar.group{ background:#00a884; font-size:22px; }
.avatar.self-avatar{ background:#00a884; }
.info{ flex:1; border-top:1px solid #222d34; padding:12px 0; min-width:0; }
.top{ display:flex; justify-content:space-between; align-items:center; gap:8px; }
.name{ color:#e9edef; font-size:16.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
.time{ color:#8696a0; font-size:11.5px; flex-shrink:0; }
.sub{ color:#8696a0; font-size:13px; display:block; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sub.pending{ color:#f1c40f; }
.invite-actions{ display:flex; gap:8px; margin-top:8px; }
.accept{ background:#00a884; color:#111b21; border:none; border-radius:16px; padding:6px 14px; font-size:12.5px; font-weight:700; cursor:pointer; }
.reject{ background:#2a3942; color:#e9edef; border:none; border-radius:16px; padding:6px 14px; font-size:12.5px; cursor:pointer; }
.unread-badge{ background:#00a884; color:#111b21; min-width:20px; height:20px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; padding:0 6px; margin-left:8px; flex-shrink:0; }
.delete-popup{ position:absolute; right:12px; top:60px; background:#233138; border:1px solid #2a3942; border-radius:8px; z-index:100; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.6); min-width:160px; }
.delete-popup button{ display:block; width:100%; background:transparent; border:none; color:#e9edef; padding:12px 16px; text-align:left; cursor:pointer; font-size:14px; }
.delete-popup button:first-child{ color:#f15c6d; }
.no-chat{ color:#8696a0; text-align:center; padding:60px 20px; font-size:14px; display:flex; flex-direction:column; gap:6px; align-items:center; }
.no-chat div{ font-size:40px; opacity:0.5; }
.bottom-nav{ display:none; height:50px; background:#202c33; border-top:1px solid #2a3942; justify-content:space-around; align-items:center; flex-shrink:0; }
.b-nav-item{ background:none; border:none; color:#8696a0; display:flex; flex-direction:column; align-items:center; gap:2px; font-size:10px; cursor:pointer; padding:4px 16px; }
.b-nav-item.active{ color:#e9edef; }
@media (max-width:768px){
 .sidebar{ max-width:100%; width:100vw; }
 .filters{ padding:8px 10px; gap:6px; }
 .bottom-nav{ display:flex; }
}
</style>