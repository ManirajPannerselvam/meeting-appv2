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

function safeOpen(fn:()=>void){
  const now=Date.now();
  if(now-lastOpenAt<300) return;
  lastOpenAt=now;
  fn();
}

function goBottom(tab:'chat'|'report'|'user'){
  (chat as any).bottomTab = tab;
  if(tab==='chat'){
    goto('/chat');
  } else if(tab==='report'){
    goto('/reports'); // <-- your C:\...\src\routes\reports page
  } else if(tab==='user'){
    goto('/settings'); // or '/user' if you have that route
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
  const onResize = () => chat.checkMobile();
  window.addEventListener('resize', onResize, {passive:true});
  Promise.allSettled([chat.loadContacts(true), chat.loadGroups()]);
  return ()=> window.removeEventListener('resize', onResize);
});

$effect(()=>{
  if(chat.filteredMessages.length && scrollEl){
    requestAnimationFrame(()=>{
      if(scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    });
  }
});

let displayedMessages = $derived.by(()=>{
  const msgs = chat.filteredMessages;
  if(chat.chatMode==='chat') return msgs.slice(-20);
  if(chat.chatMode==='report') return msgs.filter((m:any)=> /report|yield|daily/i.test(m.content||'')).slice(-20);
  if(chat.chatMode==='meeting'){
    if(chat.selectedMeeting){
      const code = (chat.selectedMeeting.code||chat.selectedMeeting.title||'').toLowerCase().slice(0,50);
      return msgs.filter((m:any)=> {
        const c = (m.content||'').toLowerCase();
        return c.includes(code) || m.group_id===chat.selectedMeeting.id;
      }).slice(-20);
    }
    return msgs.slice(-20);
  }
  return msgs.slice(-20);
});

let displayInfo = $derived(`${chat.chatMode} - ${displayedMessages.length} msgs`);
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
        onSettings={()=>goto('/settings')}
        onLogout={()=>{ if(confirm('Logout?')) goto('/logout'); }}
      />
    </div>
    <nav class="bottom-fixed" aria-label="Bottom navigation">
  <button type="button" class:active={(chat as any).bottomTab==='chat'} onclick={()=>goBottom('chat')}>
    <span class="b-icon">💬</span><small>Chat</small>
  </button>
  <button type="button" class:active={(chat as any).bottomTab==='report'} onclick={()=>goBottom('report')}>
    <span class="b-icon">📋</span><small>Report</small>
  </button>
  <button type="button" class:active={(chat as any).bottomTab==='user'} onclick={()=>goBottom('user')}>
    <span class="b-icon">👤</span><small>User</small>
  </button>
</nav>

  </div>
  <section class="chat-area" class:show-mobile={chat.isMobileView && (chat.selectedContact || chat.selectedGroup)}>
    {#if chat.selectedContact || chat.selectedGroup}
      <div class="chat-header-fixed"><ChatHeader title={(chat.selectedContact?.name??chat.selectedGroup?.name??'').slice(0,30)} subtitle={chat.selectedContact? "Tap avatar" : `${chat.groupMembers.length} members`} avatarUrl={chat.selectedContact?.avatar_url??chat.selectedGroup?.avatar_url??''} showBack={chat.isMobileView} isGroup={!!chat.selectedGroup} onBack={chat.handleBackToList} onAction={(e)=>chat.handleHeaderAction(e.detail)} /></div>
      
      <div class="filter-fixed">
        <div class="top-tabs">
          <button class="tab" class:active={chat.chatMode==='chat'} onclick={()=>chat.chatMode='chat'}>Chat</button>
          <button class="tab" class:active={chat.chatMode==='report'} onclick={()=>chat.chatMode='report'}>Reports</button>
          <button class="tab" class:active={chat.chatMode==='meeting'} onclick={()=>chat.chatMode='meeting'}>Meetings</button>
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
            if(!t) return;
            chat.selectedMeeting = {
              id: (t.template_code || t.template_name || e.detail.message?.id||'').toString().slice(0,50),
              title: (t.template_name || 'Daily Yield').toString().slice(0,50),
              agenda: `Station: ${t.station}\nInput: ${t.input}\nOutput: ${t.output}\nYield: ${t.yield_percent}%`.slice(0,200),
              code: (t.template_code||'').toString().slice(0,30),
              _template: t
            };
            openMeetingPopup();
          }}
        />
      </div>
      {#if chat.replyingTo}<div class="reply-preview"><span>{(chat.replyingTo.content||'').slice(0,40)}...</span><button onclick={()=>chat.replyingTo=null}>✕</button></div>{/if}
      
      <div class="chat-input-fixed">
        <div class="meet-quick">
          <button type="button" class="meet-chip" onclick={openMeetingsList}>Meetings</button>
          <button type="button" class="meet-chip blue" onclick={openTemplatePopup}>+Reports</button>
          <button type="button" class="meet-chip green" onclick={openMeetingPopup}>+Meeting</button>
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
        id: t.template_code || t.id,
        title: t.name,
        code: t.template_code||t.code,
        _template: t
      };
      chat.showMeetingPopup=true;
    }}
  />
{/if}

{#if chat.showAvatarModal}
<div class="modal-bg" role="dialog" aria-modal="true">
  <button class="modal-bg-btn" onclick={()=>chat.showAvatarModal=false} aria-label="close"></button>
  <div class="modal detail-modal">
    <div class="detail-head">
      <img src={chat.avatarTarget?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((chat.avatarTarget?.name||'U').slice(0,2))}&background=00a884&color=fff&size=128`} alt="" />
      <h3>{(chat.avatarTarget?.name||'Details').slice(0,24)}</h3>
      <small>{(chat.avatarTarget?.email||'').slice(0,40)}</small>
      <p>{(chat.avatarTarget?.last_message||'No messages').slice(0,60)}</p>
    </div>
    <div class="detail-btns">
      <button class="btn-chat" onclick={()=>{ const t=chat.avatarTarget; chat.showAvatarModal=false; if(t._type==='group') chat.onSelectGroup(t); else chat.handleContactLoad(t); }}>Open Chat</button>
      <button class="btn-del" onclick={async()=>{ if(confirm(`Delete ${chat.avatarTarget?.name}?`)){ await chat.handleDeleteContact(chat.avatarTarget); chat.showAvatarModal=false; }}}>Delete</button>
      <button class="btn-cancel" onclick={()=>chat.showAvatarModal=false}>Cancel</button>
    </div>
  </div>
</div>
{/if}

{#if chat.showContactForm}
<div class="modal-bg" role="dialog" aria-modal="true"><button class="modal-bg-btn" onclick={()=>chat.showContactForm=false}></button>
<div class="modal small-modal"><h3>Add Contact</h3><input bind:value={chat.contactEmail} placeholder="Email" maxlength="100" /><div class="row2"><button class="btn-cancel" onclick={()=>chat.showContactForm=false}>Cancel</button><button class="btn-chat" onclick={async()=>{ await chat.inviteContact(); }}>Invite</button></div></div>
</div>
{/if}

{#if chat.showGroupForm}
<div class="modal-bg" role="dialog" aria-modal="true"><button class="modal-bg-btn" onclick={()=>chat.showGroupForm=false}></button>
<div class="modal small-modal"><h3>New Group</h3><input bind:value={chat.groupName} placeholder="Group name" maxlength="50" /><div class="row2"><button class="btn-cancel" onclick={()=>chat.showGroupForm=false}>Cancel</button><button class="btn-chat" onclick={async()=>{ await chat.createGroup(); }}>Create</button></div></div>
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
.modal-bg-btn{position:absolute;inset:0;background:transparent;border:none;}
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