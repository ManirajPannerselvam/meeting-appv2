<script lang="ts">
  let {
    contacts = [] as any[],
    groups = [] as any[],
    allChats = [] as any[],
    selectedContact = null as any,
    selectedGroup = null as any,
    onSelectContact = (_c:any)=>{},
    onSelectGroup = (_g:any)=>{},
    onNewGroup = ()=>{},
    onNewContact = ()=>{},
    onLogout = ()=>{},
    onHandleInvite = (_e:any)=>{},
    onDeleteContact = (_c:any)=>{},
    onUpdateAvatar = (_e:any)=>{},
    onArchived = ()=>{},
    onStarred = ()=>{},
    onSettings = ()=>{},
    onAvatarClick = (_e:any)=>{}
  } = $props();

  let search = $state("");
  let searchDebounced = $state("");
  let showMainMenu = $state(false);
  let activeFilter = $state("All");
  let longPressTimer: any = $state(null);
  let showDeleteMenu: string | null = $state(null);
  let deleteTarget: any = $state(null);
  let contextPos = $state({x:0, y:0});
  let debounceT: any = null;

  function sanitizeSearch(s:string){ return (s||'').toString().slice(0,100).replace(/[<>\"'&]/g,''); }
  function sanitizeUrl(u:string){
    if(!u) return '';
    const v = u.trim().slice(0,500);
    if(v.startsWith('https://') || v.startsWith('data:image/')) return v;
    return '';
  }
  function getInitials(n:string){
    const clean = (n||'').toString().replace(/[^a-zA-Z0-9 ]/g,'').trim();
    return clean? clean.split(/\s+/).map((x:string)=>x[0]).join('').toUpperCase().slice(0,2) : 'U';
  }
  function formatTime(ts:any){
    if(!ts) return '';
    try{
      const d = new Date(ts);
      if(isNaN(d.getTime())) return '';
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      if(diff < 24*60*60*1000) return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      if(diff < 7*24*60*60*1000) return d.toLocaleDateString([], {weekday:'short'});
      return d.toLocaleDateString([], {day:'2-digit', month:'short'});
    }catch{ return ''; }
  }

  $effect(()=>{
    const v = search;
    clearTimeout(debounceT);
    debounceT = setTimeout(()=>{ searchDebounced = sanitizeSearch(v); }, 150);
  });

  // ✅ 50K FIX: Fast sort - limit before heavy sort
  let combinedList = $derived.by(()=>{
    // For 50k, take only 300 most recent from source before sort
    let source = allChats.length? allChats.slice(0, 300) : [
    ...groups.slice(0,100).map((g:any)=>({...g, _type:'group', _sortTime: g.last_message_at || g.created_at || 0})),
    ...contacts.filter((c:any)=>!c.isSelf).slice(0,200).map((c:any)=>({...c, _type:'contact', _sortTime: c.last_message_at || 0}))
    ];

    let list = [...source];

    // search - secure + fast
    if(searchDebounced.trim()){
      const s = searchDebounced.toLowerCase();
      const out:any[] = [];
      for(let i=0; i<list.length; i++){
        if(out.length>=100) break;
        const c = list[i];
        const name = (c.name||'').toLowerCase();
        const email = (c.email||'').toLowerCase();
        const last = (c.last_message||'').toLowerCase();
        if(name.includes(s) || email.includes(s) || last.includes(s)) out.push(c);
      }
      list = out;
    }

    // sort only filtered (max 300) - not 50k
    list.sort((a:any,b:any)=> {
      const at = a._sortTime? new Date(a._sortTime).getTime() : new Date(a.last_message_at||0).getTime();
      const bt = b._sortTime? new Date(b._sortTime).getTime() : new Date(b.last_message_at||0).getTime();
      return bt - at;
    });

    // filters
    if(activeFilter==='Unread') {
      const u:any[] = [];
      for(let c of list){ if(u.length>=100) break; if((c.unread||c.unread_count||0)>0) u.push(c); }
      list = u;
    }
    if(activeFilter==='Groups') {
      const g:any[] = [];
      for(let c of list){ if(g.length>=100) break; if(c._type==='group') g.push(c); }
      list = g;
    }
    if(activeFilter==='Favorites') {
      const f:any[] = [];
      for(let c of list){ if(f.length>=100) break; if(c.isFavorite || c.isPinned) f.push(c); }
      list = f;
    }
    return list.slice(0,100);
  });

  let filteredContacts = $derived.by(()=>{
    if(activeFilter==='Groups') return [];
    if(!searchDebounced.trim()) return contacts.slice(0,80);
    const s = searchDebounced.toLowerCase();
    const out:any[] = [];
    for(let c of contacts){
      if(out.length>=100) break;
      const name = (c.name||'').toLowerCase();
      const email = (c.email||'').toLowerCase();
      if(name.includes(s) || email.includes(s)) out.push(c);
    }
    return out;
  });

  let filteredGroups = $derived.by(()=>{
    if(!searchDebounced.trim()) return groups.slice(0,30);
    const s = searchDebounced.toLowerCase();
    const out:any[] = [];
    for(let g of groups){
      if(out.length>=50) break;
      if((g.name||'').toLowerCase().includes(s)) out.push(g);
    }
    return out;
  });

  let displayContacts = $derived.by(()=>{
    if(combinedList.length &&!searchDebounced && activeFilter==='All') return [];
    if(activeFilter==='Groups') return [];
    let list = [...filteredContacts];
    let selfIdx = list.findIndex((c:any)=>c.isSelf);
    if(selfIdx>0){ const self=list.splice(selfIdx,1)[0]; list.unshift(self); }
    if(activeFilter==='Unread') list=list.filter((c:any)=> (c.unread||c.unread_count||0)>0);
    if(activeFilter==='Favorites') list=list.filter((c:any)=> c.isFavorite || c.isPinned);
    if(selfIdx===-1 && activeFilter==='All' &&!searchDebounced){
      list.sort((a:any,b:any)=>{
        if(a.isSelf) return -1; if(b.isSelf) return 1;
        const at = a.last_message_at? new Date(a.last_message_at).getTime():0;
        const bt = b.last_message_at? new Date(b.last_message_at).getTime():0;
        return bt-at;
      });
    }
    return list.slice(0,80);
  });

  let displayGroups = $derived.by(()=>{
    if(combinedList.length &&!searchDebounced && activeFilter==='All') return [];
    if(activeFilter==='All') return filteredGroups.slice(0,30);
    if(activeFilter==='Groups') return filteredGroups.slice(0,80);
    if(activeFilter==='Unread') return filteredGroups.filter((g:any)=> (g.unread||g.unread_count||0)>0).slice(0,50);
    return [];
  });

  function clickOutside(node: HTMLElement, cb: () => void) {
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if(target.closest('.context-menu-fixed')) return;
      if (!node.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', handle, true);
    return { destroy() { document.removeEventListener('mousedown', handle, true); } };
  }
  function handleAvatarClick(c:any, e:MouseEvent, type:string){
    e.stopPropagation();
    onAvatarClick({detail:{contact:c, type}});
  }
  function handleContactClick(c:any, e: MouseEvent){
    e.stopPropagation();
    if(showDeleteMenu){ showDeleteMenu=null; return; }
    if(c._type==='group') onSelectGroup({detail: c});
    else onSelectContact({detail: c});
  }
  function handleGroupClick(g:any, e: MouseEvent){
    e.stopPropagation();
    if(showDeleteMenu){ showDeleteMenu=null; return; }
    onSelectGroup({detail: g});
  }
  function onTouchStart(c:any, e:TouchEvent){
    const touch = e.touches?.[0];
    if(touch) contextPos = {x: touch.clientX, y: touch.clientY};
    longPressTimer = setTimeout(()=>{
      deleteTarget=c; showDeleteMenu=c.id;
      if(navigator.vibrate) navigator.vibrate(50);
    },600);
  }
  function onTouchEnd(){ clearTimeout(longPressTimer); }
  function onContextMenu(e: MouseEvent, c:any){
    e.preventDefault(); e.stopPropagation();
    let x = e.clientX; let y = e.clientY;
    if(x > window.innerWidth - 170) x = window.innerWidth - 170;
    if(y > window.innerHeight - 100) y = window.innerHeight - 100;
    contextPos = {x, y}; deleteTarget=c; showDeleteMenu=c.id;
  }
  function confirmDelete(){
    if(!deleteTarget) return;
    const target = {...deleteTarget};
    showDeleteMenu = null; deleteTarget = null;
    onDeleteContact?.({detail: target});
  }
  function getLastMessage(c:any){
    if(c.isSelf) return c.last_message || 'Message yourself';
    if(c.isInvite || c.isOutgoing || c.status==='pending') return '⏳ Invite pending';
    if(c.isIncomingInvite || c.status==='invite_received' || c.status==='incoming') return '📩 Tap to Accept';
    const msg = (c.last_message||'').toString().slice(0,38).replace(/[<>]/g,'');
    if(msg) return msg;
    if(c.email) return c.email.slice(0,26);
    return 'Tap to chat';
  }
  function getUnread(c:any){
    const u = c.unread?? c.unread_count?? 0;
    return typeof u === 'number' && u>0? u : 0;
  }
</script>

<div class="sidebar">
  <div class="sidebar-top-fixed">
    <div class="sidebar-header">
      <h1>Chat</h1>
      <div class="header-actions">
        <button class="icon-btn" onclick={(e)=>{e.stopPropagation(); onNewContact();}} aria-label="new contact">✎</button>
        <div class="menu-container" use:clickOutside={()=>showMainMenu=false}>
          <button class="icon-btn" onclick={(e)=>{e.stopPropagation(); showMainMenu=!showMainMenu}} aria-label="menu">⋮</button>
          {#if showMainMenu}
            <div class="dropdown" onclick={(e)=>{e.stopPropagation()}}>
              <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onNewGroup(); }}>New group</button>
              <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onNewContact(); }}>New contact</button>
              <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onArchived(); }}>Archived</button>
              <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onStarred(); }}>Starred messages</button>
              <button onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onSettings(); }}>Settings</button>
              <button class="logout" onclick={(e)=>{ e.stopPropagation(); showMainMenu=false; onLogout(); }}>Log out</button>
            </div>
          {/if}
        </div>
      </div>
    </div>
    <div class="search-wrap">
      <div class="search-box"><span class="search-icon">🔍</span><input bind:value={search} placeholder="Search or start new chat" maxlength="100" autocomplete="off" spellcheck="false" /></div>
    </div>
    <div class="filters">
      {#each ['All','Unread','Favorites','Groups'] as f}
        <button class:active={activeFilter===f} onclick={()=>activeFilter=f}>{f}</button>
      {/each}
    </div>
  </div>

  <div class="chat-list">
    {#if combinedList.length && activeFilter==='All' &&!searchDebounced}
      {#each combinedList as c (c.id + '_' + c._type)}
        <div class="chat-row wa-row" class:selected={selectedContact?.id===c.id || selectedGroup?.id===c.id} role="button" tabindex="0"
          onclick={(e)=>handleContactClick(c,e)}
          ontouchstart={(e)=>onTouchStart(c,e)} ontouchend={onTouchEnd} ontouchmove={onTouchEnd}
          oncontextmenu={(e)=>onContextMenu(e,c)}
          onkeydown={(e)=>{ if(e.key==='Enter') handleContactClick(c,e)}}>
          <div class="avatar" class:group={c._type==='group'} class:self-avatar={c.isSelf} onclick={(e)=>handleAvatarClick(c,e,c._type==='group'?'group':'contact')}>
            {#if c.avatar_url}<img src={sanitizeUrl(c.avatar_url)} alt="" loading="lazy" decoding="async" />{:else if c._type==='group'}<span>👥</span>{:else if c.isSelf}<span>💾</span>{:else}<span>{getInitials(c.name||c.email)}</span>{/if}
          </div>
          <div class="info">
            <div class="top">
              <span class="name">{c.name||c.email}{#if c.isSelf} <small style="color:#00a884;">(You)</small>{/if}</span>
              <span class="time">{formatTime(c.last_message_at || c._sortTime)}</span>
            </div>
            <div class="bottom">
              {#if c.status==='pending' || c.isOutgoing || c.isInvite}
                <span class="sub pending">⏳ Invite pending</span>
              {:else if c.status==='invite_received' || c.isIncomingInvite || c.status==='incoming'}
                <span class="sub incoming">📩 Tap to Accept</span>
              {:else}<span class="sub">{getLastMessage(c)}</span>{/if}
              {#if getUnread(c)>0 && c.status!=='pending' &&!c.isOutgoing &&!c.isIncomingInvite}<span class="badge">{getUnread(c)>99?'99+':getUnread(c)}</span>{/if}
            </div>
          </div>
        </div>
      {/each}
    {:else}
      {#each displayGroups as g (g.id)}
        <div class="chat-row" class:selected={selectedGroup?.id===g.id} role="button" tabindex="0"
          onclick={(e)=>handleGroupClick(g,e)}
          ontouchstart={(e)=>onTouchStart(g,e)} ontouchend={onTouchEnd} ontouchmove={onTouchEnd}
          oncontextmenu={(e)=>onContextMenu(e,g)}
          onkeydown={(e)=>{ if(e.key==='Enter') handleGroupClick(g,e)}}>
          <div class="avatar group" onclick={(e)=>handleAvatarClick(g,e,'group')}>
            {#if g.avatar_url}<img src={sanitizeUrl(g.avatar_url)} alt="" loading="lazy" decoding="async" />{:else}<span>👥</span>{/if}
          </div>
          <div class="info">
            <div class="top"><span class="name">{g.name}</span><span class="time">{formatTime(g.last_message_at)}</span></div>
            <div class="bottom"><span class="sub">{g.last_message || 'Tap to open group'}</span>{#if getUnread(g)>0}<span class="badge">{getUnread(g)}</span>{/if}</div>
          </div>
        </div>
      {/each}

      {#each displayContacts as c (c.id)}
        <div class="chat-row wa-row" class:selected={selectedContact?.id===c.id} role="button" tabindex="0"
          onclick={(e)=>handleContactClick(c,e)}
          ontouchstart={(e)=>onTouchStart(c,e)} ontouchend={onTouchEnd} ontouchmove={onTouchEnd}
          oncontextmenu={(e)=>onContextMenu(e,c)}
          onkeydown={(e)=>{ if(e.key==='Enter') handleContactClick(c,e)}}>
          <div class="avatar" class:self-avatar={c.isSelf} onclick={(e)=>handleAvatarClick(c,e,'contact')}>
            {#if c.avatar_url}<img src={sanitizeUrl(c.avatar_url)} alt="" loading="lazy" decoding="async" />{:else if c.isSelf}<span>💾</span>{:else}<span>{getInitials(c.name||c.email)}</span>{/if}
          </div>
          <div class="info">
            <div class="top">
              <span class="name">{c.name||c.email}{#if c.isSelf} <small style="color:#00a884;">(You)</small>{/if}</span>
              <span class="time">{formatTime(c.last_message_at)}</span>
            </div>
            <div class="bottom">
              {#if c.status==='pending' || c.isOutgoing || c.isInvite}
                <span class="sub pending">⏳ Invite pending</span>
              {:else if c.status==='invite_received' || c.isIncomingInvite || c.status==='incoming'}
                <span class="sub incoming">📩 Tap to Accept</span>
              {:else}<span class="sub">{getLastMessage(c)}</span>{/if}
              {#if getUnread(c)>0 && c.status!=='pending' &&!c.isOutgoing &&!c.isIncomingInvite}<span class="badge">{getUnread(c)>99?'99+':getUnread(c)}</span>{/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

{#if showDeleteMenu}
  <div class="context-overlay" onclick={()=>{showDeleteMenu=null; deleteTarget=null;}} oncontextmenu={(e)=>{e.preventDefault(); showDeleteMenu=null;}}></div>
  <div class="context-menu-fixed" style="left:{contextPos.x}px; top:{contextPos.y}px;">
    <button class="sheet-btn delete" onclick={(e)=>{ e.stopPropagation(); confirmDelete(); }}>🗑️ Delete</button>
    <button class="sheet-btn" onclick={(e)=>{ e.stopPropagation(); showDeleteMenu=null; deleteTarget=null; }}>Cancel</button>
  </div>
{/if}

<style>
.sidebar{width:100%;max-width:430px;height:100%;max-height:100%;background:#111b21;display:flex;flex-direction:column;overflow:hidden;}
.sidebar-top-fixed{flex-shrink:0;background:#111b21;z-index:5;}
.sidebar-header{height:59px;background:#202c33;display:flex;justify-content:space-between;align-items:center;padding:0 16px;color:#fff;}
.sidebar-header h1{margin:0;font-size:19px;font-weight:700;}
.header-actions{display:flex;gap:4px;align-items:center;}
.icon-btn{background:transparent;border:none;color:#aebac1;font-size:20px;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.icon-btn:hover{background:#374045;}
.menu-container{position:relative;}
.dropdown{position:absolute;right:0;top:40px;background:#233138;border-radius:8px;z-index:9999;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.6);min-width:220px;border:1px solid #2a3942;}
.dropdown button{display:block;width:100%;background:transparent;border:none;color:#e9edef;padding:12px 16px;text-align:left;cursor:pointer;font-size:14.5px;}
.dropdown button:hover{background:#2a3942;}
.dropdown button.logout{color:#f15c6d;border-top:1px solid #2a3942;}
.search-wrap{padding:7px 12px;background:#111b21;}
.search-box{background:#202c33;border-radius:8px;padding:0 12px;display:flex;align-items:center;gap:10px;height:35px;}
.search-icon{color:#8696a0;font-size:13px;}
.search-box input{background:transparent;border:none;color:#d1d7db;width:100%;outline:none;font-size:14px;}
.filters{display:flex;gap:8px;padding:8px 12px;background:#111b21;border-bottom:1px solid #1f2c34;overflow-x:auto;scrollbar-width:none;white-space:nowrap;}
.filters button{background:#182229;color:#8696a0;border:none;border-radius:18px;padding:6px 12px;font-size:13px;cursor:pointer;}
.filters button.active{background:#0a332c;color:#53bdeb;font-weight:600;}
.chat-list{flex:1;min-height:0;overflow-y:auto;background:#111b21; contain: content; content-visibility:auto;}
.chat-row{display:flex;align-items:center;padding:0 12px;cursor:pointer;min-height:72px; position:relative; contain: layout style;}
.chat-row:hover{background:#202c33;}
.chat-row.selected{background:#2a3942;}
.avatar{width:49px;height:49px;border-radius:50%;background:#2a3942;color:#fff;display:flex;align-items:center;justify-content:center;margin:8px 12px 8px 0;font-weight:600;flex-shrink:0;overflow:hidden;cursor:pointer;}
.avatar img{width:100%;height:100%;object-fit:cover;}
.avatar.group{background:#00a884;}
.avatar.self-avatar{background:#00a884; border:2px solid #00a884;}
.info{flex:1;min-width:0;padding:12px 0;border-top:1px solid #222d34;}
.top{display:flex;justify-content:space-between;gap:8px;}
.name{color:#e9edef;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.time{color:#8696a0;font-size:12px; flex-shrink:0;}
.bottom{display:flex;justify-content:space-between;gap:8px;margin-top:4px;}
.sub{color:#8696a0;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.sub.pending{color:#f1c40f;}.sub.incoming{color:#00e676;}
.badge{background:#00a884;color:#111b21;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;padding:0 6px;}
.context-overlay{position:fixed; inset:0; z-index:9998; background:transparent;}
.context-menu-fixed{position:fixed; z-index:9999; background:#233138; border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.7); min-width:160px; border:1px solid #2a3942; animation: popIn 0.12s ease;}
@keyframes popIn{from{opacity:0; transform:scale(0.95);} to{opacity:1; transform:scale(1);}}
.sheet-btn{display:block;width:100%;background:transparent;border:none;color:#e9edef;padding:14px 18px;text-align:left;cursor:pointer; font-size:14px;}
.sheet-btn:hover{background:#2a3942;}
.sheet-btn.delete{color:#f15c6d; font-weight:600;}
</style>