<script lang="ts">
import { onMount } from "svelte";
import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
import MessageList from "$lib/components/chat/MessageList.svelte";
import ChatInput from "$lib/components/chat/ChatInput.svelte";
import ChatMeetingPopup from "$lib/components/chat/ChatMeetingPopup.svelte";
import ReportTemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
import { createChatState } from "$lib/chat/chatState.svelte.ts";

let { data } = $props();
let chat = createChatState(data);
let scrollEl: HTMLElement|null=$state(null);
let lastOpenAt = 0;

function sanitize(s:string, max=50){
  return String(s||'').slice(0,max).replace(/[<>\"'`$\\]/g,'').replace(/[\x00-\x1F\x7F]/g,'').trim();
}
function safeOpen(fn:()=>void){
  const now=Date.now();
  if(now-lastOpenAt<300) return;
  lastOpenAt=now;
  try{ fn(); }catch{}
}
function safeGoto(url:string){
  if(!browser) return;
  // 0 leakage - whitelist only
  const allowed = ['/chat','/reports','/settings','/user','/logout'];
  const base = url.split('?')[0].split('#')[0];
  if(!allowed.includes(base) && !base.startsWith('/meetings/') && !base.startsWith('/minutes/')) return;
  setTimeout(async()=>{
    try{ await goto(url); }catch{ window.location.href=url; }
  }, 30);
}

// FIXED - DO NOT GOTO for chat/report - instant switch, no unmount
function goBottom(tab:'chat'|'report'|'user'){
  if(tab==='user'){ safeGoto('/settings'); return; }
  if(tab==='chat' || tab==='report'){
    (chat as any).bottomTab = tab;
    // also keep chatMode in sync for filters
    // chatMode is top tabs, bottomTab is main list - don't navigate
    return;
  }
}

function openTemplatePopup(){
  safeOpen(()=>{
    chat.showMeetingPopup=false;
    chat.showMeetingListPopup=false;
    (chat as any).showTemplatePopup=true;
    (chat as any).bottomTab='report';
  });
}
function openMeetingPopup(){
  safeOpen(()=>{
    (chat as any).showTemplatePopup=false;
    chat.showMeetingListPopup=false;
    chat.showMeetingPopup=true;
  });
}
function openMeetingsList(){
  safeOpen(()=>{
    (chat as any).showTemplatePopup=false;
    chat.showMeetingListPopup=true;
  });
}

onMount(()=>{
  if(!browser) return;
  chat.checkMobile();
  const onResize = () => { try{ chat.checkMobile(); }catch{} };
  window.addEventListener('resize', onResize, {passive:true});
  Promise.allSettled([chat.loadContacts(true), chat.loadGroups()]);
  return ()=> window.removeEventListener('resize', onResize);
});

$effect(()=>{
  if(chat.filteredMessages.length && scrollEl){
    requestAnimationFrame(()=>{
      try{ if(scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight; }catch{}
    });
  }
});

// 50k optimized - use already filteredMessages from state (0 leakage, already limited 20)
let displayedMessages = $derived.by(()=>{
  const msgs = chat.filteredMessages || [];
  if(!Array.isArray(msgs)) return [];
  // top tabs filter on top of bottomTab filter
  if(chat.chatMode==='report'){
    return msgs.filter((m:any)=>{
      const c = String(m.content||'').toLowerCase().slice(0,300);
      return c.startsWith('__report__') || c.includes('yield') || c.includes('station:');
    }).slice(-20);
  }
  if(chat.chatMode==='meeting'){
    return msgs.filter((m:any)=>{
      const c = String(m.content||'').toLowerCase();
      return c.startsWith('__meeting__') || !!m.meeting_id;
    }).slice(-20);
  }
  return msgs.slice(-20); // chat mode shows all incl voice
});

let displayInfo = $derived(`${sanitize(chat.chatMode,10)} • ${displayedMessages.length} msgs • ${sanitize((chat as any).bottomTab,10)}`);
</script>

<div class="main-container" class:mobile-chat-open={chat.isMobileView && (chat.selectedContact || chat.selectedGroup)}>
  <div class="sidebar-wrapper" class:hidden-mobile={chat.isMobileView && (chat.selectedContact || chat.selectedGroup)}>
    <div class="sidebar-scroll">
      <ChatSidebar 
        groups={chat.groups} 
        contacts={chat.contacts} 
        allChats={chat.allChats.value} 
        selectedGroup={chat.selectedGroup} 
        selectedContact={chat.selectedContact}
        onSelectContact={(c:any)=>chat.handleContactLoad(c)}
        onSelectGroup={(g:any)=>chat.onSelectGroup(g)}
        onNewGroup={()=>chat.showGroupForm=true} 
        onNewContact={()=>chat.showContactForm=true}
        onDeleteContact={(c:any)=>chat.handleDeleteContact(c)}
        onArchived={()=>chat.showArchived=!chat.showArchived} 
        onStarred={()=>chat.showStarred=!chat.showStarred}
        onAvatarClick={(e:any)=>chat.openAvatarModal(e.detail?.contact||e.detail||e, e.detail?.type||'contact')}
        onSettings={()=>safeGoto('/settings')}
        onLogout={()=>{ if(confirm('Logout?')) safeGoto('/logout'); }}
      />
    </div>
    <nav class="bottom-fixed" aria-label="Bottom navigation">
      <button type="button" class:active={(chat as any).bottomTab==='chat'} on:click={()=>goBottom('chat')}>
        <span class="b-icon">💬</span><small>Chat</small>
      </button>
      <button type="button" class:active={(chat as any).bottomTab==='report'} on:click={()=>goBottom('report')}>
        <span class="b-icon">📋</span><small>Report</small>
      </button>
      <button type="button" class:active={(chat as any).bottomTab==='user'} on:click={()=>goBottom('user')}>
        <span class="b-icon">👤</span><small>User</small>
      </button>
    </nav>
  </div>
  <section class="chat-area" class:show-mobile={chat.isMobileView && (chat.selectedContact || chat.selectedGroup)}>
    {#if chat.selectedContact || chat.selectedGroup}
      <div class="chat-header-fixed">
        <ChatHeader 
          title={sanitize(chat.selectedContact?.name??chat.selectedGroup?.name??'',30)} 
          subtitle={chat.selectedContact? "Tap avatar" : `${(chat.groupMembers||[]).length} members`} 
          avatarUrl={sanitize(chat.selectedContact?.avatar_url??chat.selectedGroup?.avatar_url??'',200)} 
          showBack={chat.isMobileView} 
          isGroup={!!chat.selectedGroup} 
          onBack={chat.handleBackToList} 
          onAction={(e)=>chat.handleHeaderAction(e.detail)} />
      </div>
      
      <div class="filter-fixed">
        <div class="top-tabs">
          <button type="button" class="tab" class:active={chat.chatMode==='chat'} on:click={()=>chat.chatMode='chat'}>Chat</button>
          <button type="button" class="tab" class:active={chat.chatMode==='report'} on:click={()=>chat.chatMode='report'}>Reports</button>
          <button type="button" class="tab" class:active={chat.chatMode==='meeting'} on:click={()=>chat.chatMode='meeting'}>Meetings</button>
        </div>
        <span class="filter-info">{displayInfo}</span>
      </div>

      <div class="messages-scroll" bind:this={scrollEl}>
        <MessageList
          messages={displayedMessages}
          selectedContact={chat.selectedContact}
          selectedGroup={chat.selectedGroup}
          currentUser={chat.currentUser}
          replyingTo={chat.replyingTo}
          onReply={chat.handleReply}
          onForward={chat.handleForward}
          onOpenDetail={(e:any)=>{
            const t = e?.detail?.template;
            if(!t || typeof t!=='object') return;
            chat.selectedMeeting = {
              id: sanitize(String(t.template_code || t.template_name || e.detail.message?.id||''),50),
              title: sanitize(String(t.template_name || 'Daily Yield'),50),
              agenda: sanitize(`Station: ${t.station} Input: ${t.input} Output: ${t.output} Yield: ${t.yield_percent}%`,200),
              code: sanitize(String(t.template_code||''),30),
              _template: { station: sanitize(String(t.station||''),20), input: Number(t.input)||0, output: Number(t.output)||0, yield_percent: Number(t.yield_percent)||0, template_name: sanitize(t.template_name||'',30), template_code: sanitize(t.template_code||'',12) }
            };
            openMeetingPopup();
          }}
        />
      </div>
      {#if chat.replyingTo}<div class="reply-preview"><span>{sanitize(chat.replyingTo.content||'',40)}...</span><button type="button" on:click={()=>chat.replyingTo=null}>✕</button></div>{/if}
      
      <div class="chat-input-fixed">
        <div class="meet-quick">
          <button type="button" class="meet-chip" on:click={openMeetingsList}>Meetings</button>
          <button type="button" class="meet-chip blue" on:click={openTemplatePopup}>+Reports</button>
          <button type="button" class="meet-chip green" on:click={openMeetingPopup}>+Meeting</button>
        </div>
        <ChatInput uploadingFiles={chat.uploadingFiles} groupMembers={chat.groupMembers} onSendMessage={chat.sendMessage} onOpenTemplate={openTemplatePopup} />
      </div>
    {:else}<div class="empty-area"><div class="empty-icon">💬</div><h2>Chat</h2><p>Select contact</p></div>{/if}
  </section>
</div>

<ChatMeetingPopup chat={chat} />

{#if (chat as any).showTemplatePopup}
  <ReportTemplatePopup 
    templates={[]} 
    loading={false}
    on:close={()=> (chat as any).showTemplatePopup=false}
    on:use={(e:any)=>{
      const t=e.detail?.template;
      if(!t) return;
      (chat as any).showTemplatePopup=false;
      chat.selectedMeeting={
        id: sanitize(String(t.template_code || t.id || ''),50),
        title: sanitize(String(t.name||''),50),
        code: sanitize(String(t.template_code||t.code||''),30),
        _template: { template_name: sanitize(String(t.name||''),30), template_code: sanitize(String(t.template_code||''),12) }
      };
      chat.showMeetingPopup=true;
    }}
  />
{/if}

{#if chat.showAvatarModal}
<div class="modal-bg" role="dialog" aria-modal="true" on:click|self={()=>chat.showAvatarModal=false}>
  <div class="modal detail-modal" on:click|stopPropagation>
    <div class="detail-head">
      <img src={chat.avatarTarget?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sanitize((chat.avatarTarget?.name||'U').slice(0,2),2))}&background=00a884&color=fff&size=128`} alt="" />
      <h3>{sanitize(chat.avatarTarget?.name||'Details',24)}</h3>
      <small>{sanitize(chat.avatarTarget?.email||'',40)}</small>
      <p>{sanitize(chat.avatarTarget?.last_message||'No messages',60)}</p>
    </div>
    <div class="detail-btns">
      <button type="button" class="btn-chat" on:click={()=>{ const t=chat.avatarTarget; chat.showAvatarModal=false; if(t._type==='group') chat.onSelectGroup(t); else chat.handleContactLoad(t); }}>Open Chat</button>
      <button type="button" class="btn-del" on:click={async()=>{ if(confirm(`Delete ${sanitize(chat.avatarTarget?.name||'',20)}?`)){ await chat.handleDeleteContact(chat.avatarTarget); chat.showAvatarModal=false; }}}>Delete</button>
      <button type="button" class="btn-cancel" on:click={()=>chat.showAvatarModal=false}>Cancel</button>
    </div>
  </div>
</div>
{/if}

{#if chat.showContactForm}
<div class="modal-bg" role="dialog" aria-modal="true" on:click|self={()=>chat.showContactForm=false}>
<div class="modal small-modal" on:click|stopPropagation><h3>Add Contact</h3><input bind:value={chat.contactEmail} placeholder="Email" maxlength="100" /><div class="row2"><button type="button" class="btn-cancel" on:click={()=>chat.showContactForm=false}>Cancel</button><button type="button" class="btn-chat" on:click={async()=>{ await chat.inviteContact(); }}>Invite</button></div></div>
</div>
{/if}

{#if chat.showGroupForm}
<div class="modal-bg" role="dialog" aria-modal="true" on:click|self={()=>chat.showGroupForm=false}>
<div class="modal small-modal" on:click|stopPropagation><h3>New Group</h3><input bind:value={chat.groupName} placeholder="Group name" maxlength="50" /><div class="row2"><button type="button" class="btn-cancel" on:click={()=>chat.showGroupForm=false}>Cancel</button><button type="button" class="btn-chat" on:click={async()=>{ await chat.createGroup(); }}>Create</button></div></div>
</div>
{/if}

<style>
.main-container{display:flex;height:100dvh;max-height:100dvh;width:100vw;background:#111b21;overflow:hidden;font-family:Inter,sans-serif;}
.sidebar-wrapper{width:30%;min-width:280px;max-width:380px;display:flex;flex-direction:column;border-right:1px solid #222d34;background:#fff;overflow:hidden;height:100dvh;}
.sidebar-scroll{flex:1;min-height:0;overflow-y:auto;}
.bottom-fixed{flex-shrink:0;height:52px;min-height:52px;background:#fff;border-top:1px solid #f1f5f9;display:flex;justify-content:space-around;align-items:center;z-index:20;}
.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:1px;color:#94a3b8;cursor:pointer;flex:1;padding:4px;border-radius:8px;}
.bottom-fixed button.active{color:#00a884;background:#f0fdf4;}.b-icon{font-size:16px;}.bottom-fixed small{font-size:9px;font-weight:600;}
.chat-area{flex:1;display:flex;flex-direction:column;background:#0b141a;min-width:0;height:100dvh;max-height:100dvh;overflow:hidden;}
.chat-header-fixed{flex-shrink:0;z-index:10;}
.filter-fixed{flex-shrink:0;background:#fff;border-bottom:1px solid #f1f5f9;padding:3px 6px;display:flex;align-items:center;justify-content:space-between;gap:0;}
.top-tabs{display:flex;gap:0;background:#f1f5f9;border-radius:8px;padding:1px;}
.tab{background:transparent;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;color:#64748b;cursor:pointer;line-height:1;transition:.12s;}
.tab.active{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.08);}
.filter-info{font-size:9px;color:#64748b;font-weight:600;letter-spacing:.1px;}
.messages-scroll{flex:1;min-height:0;overflow-y:auto;background:#0b141a;}
.chat-input-fixed{flex-shrink:0;background:#202c33;z-index:10;}
.reply-preview{display:flex;justify-content:space-between;align-items:center;background:#f0fdf4;padding:4px 8px;border-left:3px solid #00a884;color:#334155;font-size:11px;}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px;}
.modal{background:#fff;padding:16px;border-radius:16px;width:100%;max-width:340px;display:flex;flex-direction:column;gap:10px;position:relative;z-index:1;}
.small-modal input{width:100%;padding:10px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;outline:none;font-size:13px;}
.detail-modal{max-width:320px;border-radius:20px;padding:0;overflow:hidden;gap:0;}
.detail-head{display:flex;flex-direction:column;align-items:center;padding:20px 16px 14px;gap:4px;}
.detail-head img{width:64px;height:64px;border-radius:14px;object-fit:cover;}
.detail-head h3{color:#0f172a;margin:6px 0 0;font-size:16px;font-weight:700;} .detail-head small{color:#64748b;font-size:11px;} .detail-head p{color:#64748b;font-size:11px;text-align:center;margin:4px 0 0;}
.detail-btns{display:flex;flex-direction:column;gap:6px;padding:10px;background:#f8fafc;}
.btn-chat{background:#00a884;color:#fff;border:none;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px;}
.btn-del{background:#fef2f2;color:#ef4444;border:1px solid #fecaca;padding:10px;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px;}
.btn-cancel{background:#fff;color:#334155;border:1px solid #e2e8f0;padding:10px;border-radius:10px;cursor:pointer;font-weight:600;font-size:12px;}
.row2{display:flex;gap:6px;} .row2 button{flex:1;}
.empty-area{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f8fafc;color:#94a3b8;gap:4px;}
.empty-icon{font-size:40px;opacity:0.5;}.empty-area h2{color:#0f172a;font-size:20px;font-weight:700;margin:6px 0 0;}
.meet-quick{display:flex;align-items:center;gap:0;padding:3px 4px;background:#1f2c34;border-top:1px solid #2a3942;}
.meet-chip{color:#fff;border:none;padding:4px 10px;border-radius:14px;font-weight:600;font-size:10px;cursor:pointer;white-space:nowrap;background:#334155;margin-right:4px;line-height:1;}
.meet-chip.blue{background:#0ea5e9;} .meet-chip.green{background:#16a34a;}
@media (max-width:768px){
.sidebar-wrapper{width:100%;max-width:100%;}.sidebar-wrapper.hidden-mobile{display:none;}
.chat-area{display:none;}.chat-area.show-mobile{display:flex;position:fixed;inset:0;z-index:50;width:100vw;height:100dvh;}
.detail-modal{max-width:88vw;}
}
</style>