<script lang="ts">
  let {
    groups = [],
    contacts = [],
    allChats = [],
    selectedGroup = null,
    selectedContact = null,
    onSelectContact = (c:any)=>{},
    onSelectGroup = (g:any)=>{},
    onNewGroup = ()=>{},
    onNewContact = ()=>{},
    onDeleteContact = (e:any)=>{},
    onArchived = ()=>{},
    onStarred = ()=>{},
    onAvatarClick = (e:any)=>{},
    onSettings = ()=>{},
    onLogout = ()=>{}
  }: any = $props();

  let search = $state("");
  let filtered = $derived.by(()=>{
    const s=search.toLowerCase().trim().slice(0,30);
    if(!s) return (allChats||[]).slice(0,20);
    return allChats.filter((c:any)=> `${c.name||''} ${c.email||''}`.toLowerCase().includes(s)).slice(0,20);
  });

  function handleOpenChat(item:any){
    if(item._type==='group') onSelectGroup(item);
    else onSelectContact(item);
  }
  function handleAvatar(e:Event, item:any, isGroup:boolean){
    e.stopPropagation();
    onAvatarClick({detail:{contact:item, type: isGroup?'group':'contact'}});
  }
  function handleRowKey(e:KeyboardEvent, item:any){
    if(e.key==='Enter' || e.key===' '){
      e.preventDefault();
      handleOpenChat(item);
    }
  }
  function safeName(n:string){ return String(n||'U').slice(0,20).replace(/[<>]/g,''); }
</script>

<div class="chat-sidebar">
  <div class="top-bar">
    <div class="title-block">
      <h2>Chats</h2>
      <span class="count">{allChats.length}</span>
    </div>
    <div class="top-actions">
      <button class="action-btn primary" onclick={onNewContact} title="Add Contact" aria-label="Add Contact">+</button>
      <button class="action-btn secondary" onclick={onNewGroup} title="Add Group" aria-label="Add Group">G</button>
      <div class="divider"></div>
      <button class="action-btn icon" onclick={onSettings} title="Settings">⚙</button>
      <button class="action-btn icon logout" onclick={onLogout} title="Logout">⎋</button>
    </div>
  </div>

  <div class="search-wrap">
    <div class="search-box">
      <span class="s-icon">🔍</span>
      <input bind:value={search} placeholder="Search 20 max..." maxlength="30" aria-label="Search chats" />
    </div>
  </div>

  <div class="chat-list" role="list">
    {#each filtered as chatItem (chatItem.id)}
      {@const isGroup = chatItem._type==='group'}
      {@const isPending = chatItem.status==='pending'}
      {@const isSelected = isGroup ? selectedGroup?.id===chatItem.id : selectedContact?.id===chatItem.id}
      <div class="chat-row" class:selected={isSelected} class:pending={isPending}
           role="button" tabindex="0"
           onclick={()=>handleOpenChat(chatItem)}
           onkeydown={(e)=>handleRowKey(e, chatItem)}>

        <button class="avatar-btn" onclick={(e)=>handleAvatar(e, chatItem, isGroup)} aria-label="View details">
          <img src={chatItem.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName(chatItem.name).slice(0,2))}&background=${isPending?'f59e0b':isGroup?'7c3aed':'00a884'}&color=fff&size=64`} alt="" loading="lazy" />
          {#if isPending}<span class="badge pending">!</span>
          {:else if isGroup}<span class="badge group">G</span>
          {:else}<span class="badge online"></span>{/if}
        </button>

        <div class="chat-info">
          <div class="name-line">
            <b class:pending-text={isPending}>{safeName(chatItem.name)}</b>
            <small class="time">{chatItem.last_message_at ? new Date(chatItem.last_message_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</small>
          </div>
          <div class="last-msg" class:pending-msg={isPending}>
            {#if isPending}<span class="pending-pill">Pending</span>{:else}{(chatItem.last_message||'Tap').slice(0,28)}{/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <b>No chats</b>
        <small>Add via +</small>
      </div>
    {/each}
  </div>
</div>

<style>
.chat-sidebar{display:flex;flex-direction:column;height:100%;background:#fff;color:#0f172a;font-family:Inter,system-ui,sans-serif;}
/* COMPACT - NO GAP */
.top-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#fff;border-bottom:1px solid #f1f5f9;flex-shrink:0;}
.title-block{display:flex;align-items:center;gap:6px;} .title-block h2{margin:0;font-size:15px;font-weight:800;letter-spacing:-.2px;}
.count{font-size:10px;font-weight:700;color:#00a884;background:#e7fce3;padding:1px 6px;border-radius:10px;display:inline-block;line-height:1.4;}
.top-actions{display:flex;gap:4px;align-items:center;}
.action-btn{width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;transition:.12s;}
.action-btn.primary{background:#00a884;color:#fff;} .action-btn.secondary{background:#7c3aed;color:#fff;}
.action-btn.icon{background:#f8fafc;border:1px solid #f1f5f9;color:#334155;font-size:12px;} .action-btn.logout{color:#ef4444;}
.divider{width:1px;height:14px;background:#e2e8f0;margin:0 1px;}
.search-wrap{padding:6px 8px;background:#fff;flex-shrink:0;}
.search-box{display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;padding:6px 10px;border-radius:10px;}
.search-box:focus-within{background:#fff;border-color:#00a884;box-shadow:0 0 0 2px rgba(0,168,132,.1);}
.s-icon{font-size:11px;color:#94a3b8;}
.search-box input{background:transparent;border:none;outline:none;color:#0f172a;flex:1;font-size:11px;width:100%;}
.chat-list{flex:1;overflow-y:auto;padding:4px 4px;display:flex;flex-direction:column;gap:1px;}
.chat-row{display:flex;align-items:center;gap:8px;padding:6px 6px;border-radius:10px;cursor:pointer;transition:.1s;border:1px solid transparent;}
.chat-row:hover{background:#f8fafc;border-color:#f1f5f9;}
.chat-row.selected{background:#f0fdf4;border-color:#bbf7d0;}
.chat-row.pending{background:#fffbeb;border-color:#fde68a;}
.avatar-btn{position:relative;flex-shrink:0;border:none;background:transparent;padding:0;cursor:pointer;border-radius:8px;}
.avatar-btn img{width:36px;height:36px;border-radius:8px;object-fit:cover;display:block;}
.badge{position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;}
.badge.online{background:#22c55e;} .badge.pending{background:#f59e0b;color:#fff;} .badge.group{background:#7c3aed;color:#fff;font-size:7px;}
.chat-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}
.name-line{display:flex;justify-content:space-between;align-items:center;gap:4px;}
.name-line b{font-size:12px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;}
.name-line b.pending-text{color:#92400e;} .time{font-size:9px;color:#94a3b8;background:#f8fafc;padding:1px 4px;border-radius:4px;flex-shrink:0;}
.last-msg{font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pending-pill{font-size:9px;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 6px;border-radius:10px;}
.pending-msg{color:#92400e;}
.empty-state{display:flex;flex-direction:column;align-items:center;padding:24px 12px;gap:4px;color:#94a3b8;text-align:center;}
.empty-icon{width:36px;height:36px;border-radius:8px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;font-size:16px;}
.empty-state b{font-size:12px;color:#334155;} .empty-state small{font-size:10px;}
</style>