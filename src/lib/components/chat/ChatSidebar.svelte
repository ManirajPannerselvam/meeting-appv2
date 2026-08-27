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
    return contacts.filter((c:any)=> c.name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s))
  });
  let filteredGroups = $derived.by(()=>{
    if(!search.trim()) return groups;
    const s = search.toLowerCase();
    return groups.filter((g:any)=> g.name?.toLowerCase().includes(s));
  });
  let displayContacts = $derived.by(()=>{
    if(activeFilter==='Groups') return [];
    let list = [...filteredContacts];
    let selfIdx = list.findIndex((c:any)=>c.isSelf);
    if(selfIdx>0){ const self=list.splice(selfIdx,1)[0]; list.unshift(self); }
    if(activeFilter==='Unread') list=list.filter((c:any)=> c.unread_count>0);
    if(activeFilter==='Favorites') list=list.filter((c:any)=> c.isFavorite || c.isPinned);
    if(selfIdx===-1 && activeFilter==='All'){
      list.sort((a:any,b:any)=>{
        if(a.isSelf) return -1; if(b.isSelf) return 1;
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

  function getInitials(n:string){ return n? n.trim().split(' ').map((x:string)=>x[0]).join('').toUpperCase().slice(0,2) : 'U'; }
  function clickOutside(node: HTMLElement, cb: () => void) {
    const handle = (e: MouseEvent) => { if (!node.contains(e.target as Node)) setTimeout(cb, 10); };
    document.addEventListener('mousedown', handle, true);
    return { destroy() { document.removeEventListener('mousedown', handle, true); } };
  }
  function handleContactClick(c:any, e: MouseEvent){
    e.stopPropagation(); if(showDeleteMenu){ showDeleteMenu=null; return; }
    if(c.status==='pending') return; if(c.status==='invite_received') return; onSelectContact(c);
  }
  function handleGroupClick(g:any, e: MouseEvent){
    e.stopPropagation(); if(showDeleteMenu){ showDeleteMenu=null; return; } onSelectGroup(g);
  }
  function onTouchStart(c:any){
    longPressTimer = setTimeout(()=>{ deleteTarget=c; showDeleteMenu=c.id; if(navigator.vibrate) navigator.vibrate(50); },600);
  }
  function onTouchEnd(){ clearTimeout(longPressTimer); }
  function onContextMenu(e: MouseEvent, c:any){ e.preventDefault(); deleteTarget=c; showDeleteMenu=c.id; }
  function confirmDelete(){ if(deleteTarget){ onDeleteContact(deleteTarget); showDeleteMenu=null; } }
  function triggerAvatarUpload(c:any, e: MouseEvent){
    e.stopPropagation(); if(!c.isSelf) return;
    const input=document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange=async(ev:any)=>{ const file=(ev.target as HTMLInputElement).files?.[0]; if(file) onUpdateAvatar({contact:c,file}); };
    input.click();
  }
  function getLastMessage(c:any){
    if(c.isSelf) return 'Message yourself';
    if(c.last_message) return c.last_message.slice(0,32);
    if(c.email) return c.email.slice(0,26);
    return 'Tap to chat';
  }
</script>

<div class="sidebar">
  <!-- FIXED TOP - NOT MOVABLE -->
  <div class="sidebar-top-fixed">
    <div class="sidebar-header">
      <h1>Chat</h1>
      <div class="header-actions">
        <button class="icon-btn" onclick={(e)=>{e.stopPropagation(); onNewContact();}}>✎</button>
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
      <div class="search-box"><span class="search-icon">🔍</span><input bind:value={search} placeholder="Search or start new chat" /></div>
    </div>
    <div class="filters">
      {#each ['All','Unread','Favorites','Groups'] as f}
        <button class:active={activeFilter===f} onclick={()=>activeFilter=f}>{f}</button>
      {/each}
    </div>
  </div>

  <!-- ONLY CONTACTS MOVING TOP TO BOTTOM -->
  <div class="chat-list">
    {#each displayGroups as g (g.id)}
      <div class="chat-row" class:selected={selectedGroup?.id===g.id} role="button" tabindex="0"
        onclick={(e)=>handleGroupClick(g,e)} ontouchstart={()=>onTouchStart(g)} ontouchend={onTouchEnd} oncontextmenu={(e)=>onContextMenu(e,g)} onkeydown={(e)=>{ if(e.key==='Enter') onSelectGroup(g)}}>
        <div class="avatar group"><span>👥</span></div>
        <div class="info">
          <div class="top"><span class="name">{g.name}</span><span class="time">{g.last_time||''}</span></div>
          <div class="bottom"><span class="sub">{g.last_message || 'Tap to open group'}</span>{#if g.unread_count>0}<span class="badge">{g.unread_count}</span>{/if}</div>
        </div>
      </div>
    {/each}

    {#each displayContacts as c (c.id)}
      <div class="chat-row wa-row" class:selected={selectedContact?.id===c.id} class:disabled={c.status==='pending'} role="button" tabindex="0"
        onclick={(e)=>handleContactClick(c,e)} ontouchstart={()=>onTouchStart(c)} ontouchend={onTouchEnd} ontouchmove={onTouchEnd} oncontextmenu={(e)=>onContextMenu(e,c)} onkeydown={(e)=>{ if(e.key==='Enter') handleContactClick(c,e)}}>
        <div class="avatar" class:self-avatar={c.isSelf} onclick={(e)=>triggerAvatarUpload(c,e)}>
          {#if c.avatar_url}<img src={c.avatar_url} alt="" />{:else if c.isSelf}<span>💾</span>{:else}<span>{getInitials(c.name||c.email)}</span>{/if}
        </div>
        <div class="info">
          <div class="top">
            <span class="name">{c.name||c.email}{#if c.isSelf} <small style="color:#00a884;">(You)</small>{/if}</span>
            <span class="time">{c.last_time||''}</span>
          </div>
          <div class="bottom">
            {#if c.status==='pending'}<span class="sub pending">⏳ Invite pending</span>
            {:else if c.status==='invite_received'}
              <span class="sub">Invitation</span>
              <span class="invite-mini">
                <button class="mini-accept" onclick={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'accepted'}}) }}>Accept</button>
                <button class="mini-reject" onclick={(e)=>{ e.stopPropagation(); onHandleInvite({detail:{inviteId:c.id, action:'rejected'}}) }}>Reject</button>
              </span>
            {:else}<span class="sub">{getLastMessage(c)}</span>{/if}
            {#if c.unread_count>0 && c.status!=='pending' && c.status!=='invite_received'}<span class="badge">{c.unread_count>99?'99+':c.unread_count}</span>{/if}
          </div>
        </div>
        {#if showDeleteMenu===c.id}
          <div class="action-sheet" use:clickOutside={()=>showDeleteMenu=null}>
            <button class="sheet-btn delete" onclick={(e)=>{ e.stopPropagation(); confirmDelete(); }}>🗑️ Delete</button>
            <button class="sheet-btn" onclick={(e)=>{ e.stopPropagation(); showDeleteMenu=null; }}>Cancel</button>
          </div>
        {/if}
      </div>
    {/each}

    {#if displayContacts.length===0 && displayGroups.length===0}
      <div class="no-chat"><div>💬</div><p>No chats</p><button class="accept" onclick={()=>{search=''; activeFilter='All';}}>Clear filter</button></div>
    {/if}
  </div>
</div>

<style>
.sidebar{
  width:100%; max-width:430px;
  height:100%; max-height:100%;
  background:#111b21;
  display:flex; flex-direction:column;
  overflow:hidden;
}
.sidebar-top-fixed{
  flex-shrink:0;
  background:#111b21;
  z-index:5;
}
.sidebar-header{height:59px;background:#202c33;display:flex;justify-content:space-between;align-items:center;padding:0 16px;color:#fff;}
.sidebar-header h1{margin:0;font-size:19px;font-weight:700;}
.header-actions{display:flex;gap:4px;align-items:center;}
.icon-btn{background:transparent;border:none;color:#aebac1;font-size:20px;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.icon-btn:hover{background:#374045;}
.menu-container{position:relative;}
.dropdown{position:absolute;right:0;top:40px;background:#233138;border-radius:8px;z-index:99;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.6);min-width:200px;border:1px solid #2a3942;}
.dropdown button{display:block;width:100%;background:transparent;border:none;color:#e9edef;padding:12px 16px;text-align:left;cursor:pointer;font-size:14.5px;}
.dropdown button:hover{background:#2a3942;}
.dropdown button.logout{color:#f15c6d;border-top:1px solid #2a3942;}
.search-wrap{padding:7px 12px;background:#111b21;}
.search-box{background:#202c33;border-radius:8px;padding:0 12px;display:flex;align-items:center;gap:10px;height:35px;}
.search-icon{color:#8696a0;font-size:13px;}
.search-box input{background:transparent;border:none;color:#d1d7db;width:100%;outline:none;font-size:14px;}
.filters{display:flex;gap:8px;padding:8px 12px;background:#111b21;border-bottom:1px solid #1f2c34;overflow-x:auto;scrollbar-width:none;white-space:nowrap;}
.filters::-webkit-scrollbar{display:none;}
.filters button{background:#182229;color:#8696a0;border:none;border-radius:18px;padding:6px 12px;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0;}
.filters button.active{background:#0a332c;color:#53bdeb;font-weight:600;}

/* CONTACTS ONLY SCROLL TOP TO BOTTOM */
.chat-list{
  flex:1; min-height:0;
  overflow-y:auto; overflow-x:hidden;
  -webkit-overflow-scrolling:touch;
  background:#111b21;
}

/* WHATSAPP STYLE ROW */
.chat-row{
  display:flex; align-items:center;
  padding:0 12px;
  cursor:pointer;
  position:relative;
  min-height:72px;
}
.chat-row:hover{background:#202c33;}
.chat-row.selected{background:#2a3942;}
.chat-row.disabled{opacity:0.5;cursor:default;}
.avatar{
  width:49px; height:49px; border-radius:50%;
  background:#2a3942; color:#fff;
  display:flex; align-items:center; justify-content:center;
  margin:8px 12px 8px 0;
  font-weight:600; flex-shrink:0; font-size:16px;
  overflow:hidden;
}
.avatar img{width:100%;height:100%;object-fit:cover;}
.avatar.group{background:#00a884;}
.avatar.self-avatar{background:#00a884;cursor:pointer;}
.info{flex:1; min-width:0; padding:12px 0; border-top:1px solid #222d34;}
.top{display:flex; justify-content:space-between; align-items:center; gap:8px;}
.name{color:#e9edef;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;font-weight:400;}
.chat-row.selected.name{font-weight:500;}
.time{color:#8696a0;font-size:12px;flex-shrink:0;}
.bottom{display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:4px;}
.sub{color:#8696a0;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.sub.pending{color:#f1c40f;}
.badge{background:#00a884;color:#111b21;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;padding:0 6px;flex-shrink:0;}
.invite-mini{display:flex;gap:6px;}
.mini-accept{background:#00a884;color:#111b21;border:none;border-radius:12px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;}
.mini-reject{background:#2a3942;color:#e9edef;border:none;border-radius:12px;padding:4px 10px;font-size:11px;cursor:pointer;}
.action-sheet{position:absolute;right:10px;top:55px;background:#233138;border-radius:10px;z-index:20;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.6);min-width:150px;border:1px solid #2a3942;}
.sheet-btn{display:block;width:100%;background:transparent;border:none;color:#e9edef;padding:12px 16px;text-align:left;cursor:pointer;font-size:14px;border-bottom:1px solid #2a3942;}
.sheet-btn.delete{color:#f15c6d;}
.accept{background:#00a884;color:#111b21;border:none;border-radius:16px;padding:6px 14px;font-size:12.5px;font-weight:700;cursor:pointer;}
.no-chat{color:#8696a0;text-align:center;padding:70px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;}
.no-chat div{font-size:40px;opacity:0.4;}
</style>