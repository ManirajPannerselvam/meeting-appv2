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
let loadedTemplates:any[] = $state([]);

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
  const allowed = ['/chat','/reports','/settings','/user','/logout'];
  const base = url.split('?')[0].split('#')[0];
  if(!allowed.includes(base) && !base.startsWith('/meetings/') && !base.startsWith('/minutes/') && base!=='/reports') return;
  setTimeout(async()=>{ try{ await goto(url); }catch{ window.location.href=url; } }, 30);
}
function goBottom(tab:'chat'|'report'|'user'){
  if(tab==='user'){ safeGoto('/settings'); return; }
  if(tab==='report'){ safeGoto('/reports'); return; }
  (chat as any).bottomTab = 'chat';
  chat.chatMode = 'chat' as any;
  if(browser && window.location.pathname.startsWith('/reports')) safeGoto('/chat');
}
function openTemplatePopup(){ safeOpen(()=>{ chat.showMeetingPopup=false; chat.showMeetingListPopup=false; (chat as any).showTemplatePopup=true; }); }
function openMeetingPopup(){ safeOpen(()=>{ (chat as any).showTemplatePopup=false; chat.showMeetingListPopup=false; chat.showMeetingPopup=true; }); }
function openMeetingsList(){ safeOpen(()=>{ (chat as any).showTemplatePopup=false; chat.showMeetingPopup=false; chat.showMeetingListPopup=true; }); }
function loadLocalTemplates(){
  if(!browser) return;
  try{ const raw=localStorage.getItem("templates"); if(!raw){loadedTemplates=[];return;} const arr=JSON.parse(raw); loadedTemplates=Array.isArray(arr)?arr.slice(0,100):[]; }catch{ loadedTemplates=[]; }
}
onMount(()=>{
  if(!browser) return;
  chat.checkMobile(); loadLocalTemplates();
  const onResize = () => { try{ chat.checkMobile(); }catch{} };
  const onStorage = () => loadLocalTemplates();
  window.addEventListener('resize', onResize, {passive:true});
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', loadLocalTemplates);
  Promise.allSettled([chat.loadContacts(true), chat.loadGroups()]);
  return ()=>{ window.removeEventListener('resize', onResize); window.removeEventListener('storage', onStorage); window.removeEventListener('focus', loadLocalTemplates); };
});
$effect(()=>{ if(chat.filteredMessages.length && scrollEl){ requestAnimationFrame(()=>{ try{ if(scrollEl) scrollEl.scrollTop=scrollEl.scrollHeight; }catch{} }); } });
let headerLight = $derived.by(()=>{ const bt=(chat as any).bottomTab||'chat'; const cm=chat.chatMode; if(bt==='report'||cm==='report') return '#e3f2fd'; if(cm==='meeting') return '#ede9fe'; return '#e8f5e9'; });
let headerColor = $derived.by(()=>{ const bt=(chat as any).bottomTab||'chat'; const cm=chat.chatMode; if(bt==='report'||cm==='report') return '#0ea5e9'; if(cm==='meeting') return '#8b5cf6'; return '#00a884'; });
let displayedMessages = $derived.by(()=>{
  const msgs=chat.filteredMessages||[]; if(!Array.isArray(msgs)) return [];
  if(chat.chatMode==='report') return msgs.filter((m:any)=>{ const c=String(m.content||'').toLowerCase().slice(0,300); return c.startsWith('__report__')||c.includes('yield')||c.includes('station:')||c.includes('__template__'); }).slice(-30);
  if(chat.chatMode==='meeting') return msgs.filter((m:any)=>{ const c=String(m.content||'').toLowerCase(); return c.startsWith('__meeting__')||!!m.meeting_id||c.includes('meeting'); }).slice(-30);
  return msgs.slice(-30);
});
let displayInfo = $derived(`${sanitize(chat.chatMode,10)} • ${displayedMessages.length} • T:${loadedTemplates.length}`);
function onOverlay(e:MouseEvent, cb:()=>void){ if(e.target===e.currentTarget) cb(); }
</script>

<div class="main-container" style="background:{headerLight};" class:mobile-chat-open={chat.isMobileView && (chat.selectedContact || chat.selectedGroup)}>
  <div class="sidebar-wrapper" class:hidden-mobile={chat.isMobileView && (chat.selectedContact || chat.selectedGroup)}>
    <div class="sidebar-scroll">
      <ChatSidebar groups={chat.groups} contacts={chat.contacts} allChats={chat.allChats.value} selectedGroup={chat.selectedGroup} selectedContact={chat.selectedContact}
        onSelectContact={(c:any)=>chat.handleContactLoad(c)} onSelectGroup={(g:any)=>chat.onSelectGroup(g)} onNewGroup={()=>chat.showGroupForm=true} onNewContact={()=>chat.showContactForm=true}
        onDeleteContact={(c:any)=>chat.handleDeleteContact(c)} onArchived={()=>chat.showArchived=!chat.showArchived} onStarred={()=>chat.showStarred=!chat.showStarred}
        onAvatarClick={(e:any)=>chat.openAvatarModal(e.detail?.contact||e.detail||e, e.detail?.type||'contact')} onSettings={()=>safeGoto('/settings')} onLogout={()=>{ if(confirm('Logout?')) safeGoto('/logout'); }} />
    </div>
    <!-- NAV LIKE YOUR SCREENSHOT -->
    <nav class="bottom-fixed" aria-label="Bottom navigation">
      <button type="button" class="nav-btn chat-active" onclick={()=>goBottom('chat')}>
        <span class="b-icon">💬</span><small>Chat</small>
      </button>
      <button type="button" class="nav-btn report-btn" onclick={()=>goBottom('report')}>
        <span class="b-icon">📋</span><small>Reports</small>
      </button>
      <button type="button" class="nav-btn user-btn" onclick={()=>goBottom('user')}>
        <span class="b-icon">👤</span><small>User</small>
      </button>
    </nav>
  </div>
  <section class="chat-area" class:show-mobile={chat.isMobileView && (chat.selectedContact || chat.selectedGroup)} style="background:{headerLight};">
    {#if chat.selectedContact || chat.selectedGroup}
      <div class="chat-header-fixed" style="border-bottom:3px solid {headerColor}; background:#fff;">
        <ChatHeader title={sanitize(chat.selectedContact?.name??chat.selectedGroup?.name??'',30)} subtitle={chat.selectedContact? "Tap avatar" : `${(chat.groupMembers||[]).length} members`} avatarUrl={sanitize(chat.selectedContact?.avatar_url??chat.selectedGroup?.avatar_url??'',200)} showBack={chat.isMobileView} isGroup={!!chat.selectedGroup} onBack={chat.handleBackToList} onAction={(e)=>chat.handleHeaderAction(e.detail)} />
      </div>
      <div class="filter-fixed" style="border-bottom:2px solid {headerColor}; background:{headerLight};">
        <div class="top-tabs">
          <button type="button" class="tab" class:active={chat.chatMode==='chat'} style={chat.chatMode==='chat' ? `background:${headerColor}; color:#fff;` : ''} onclick={()=>chat.chatMode='chat'}>💬 Chat</button>
          <button type="button" class="tab" class:active={chat.chatMode==='report'} style={chat.chatMode==='report' ? `background:#0ea5e9; color:#fff;` : ''} onclick={()=>chat.chatMode='report'}>📋 Reports</button>
          <button type="button" class="tab" class:active={chat.chatMode==='meeting'} style={chat.chatMode==='meeting' ? `background:#8b5cf6; color:#fff;` : ''} onclick={()=>chat.chatMode='meeting'}>📅 Meetings</button>
        </div>
        <span class="filter-info" style="color:{headerColor}; font-weight:800;">{displayInfo}</span>
      </div>
      <div class="messages-scroll" style="background:{headerLight};" bind:this={scrollEl}>
        <MessageList messages={displayedMessages} selectedContact={chat.selectedContact} selectedGroup={chat.selectedGroup} currentUser={chat.currentUser} replyingTo={chat.replyingTo} onReply={chat.handleReply} onForward={chat.handleForward}
          onOpenDetail={(e:any)=>{ const t=e?.detail?.template; if(!t||typeof t!=='object') return; chat.selectedMeeting={ id:sanitize(String(t.template_code||t.template_name||e.detail.message?.id||''),50), title:sanitize(String(t.template_name||'Daily Yield'),50), agenda:sanitize(`Station: ${t.station} Input: ${t.input} Output: ${t.output} Yield: ${t.yield_percent}%`,200), code:sanitize(String(t.template_code||''),30), _template:{ station:sanitize(String(t.station||''),20), input:Number(t.input)||0, output:Number(t.output)||0, yield_percent:Number(t.yield_percent)||0, template_name:sanitize(t.template_name||'',30), template_code:sanitize(t.template_code||'',12) } }; openMeetingPopup(); }} />
      </div>
      {#if chat.replyingTo}<div class="reply-preview" style="border-left-color:{headerColor}; background:#fff;"><span>{sanitize(chat.replyingTo.content||'',40)}...</span><button type="button" onclick={()=>chat.replyingTo=null}>✕</button></div>{/if}
      <div class="chat-input-fixed" style="border-top:2px solid {headerColor};">
        <div class="meet-quick"><button type="button" class="meet-chip" onclick={openMeetingsList}>📅 Meetings</button><button type="button" class="meet-chip blue" onclick={openTemplatePopup}>📋 +Reports ({loadedTemplates.length})</button><button type="button" class="meet-chip green" onclick={openMeetingPopup}>+Meeting</button></div>
        <ChatInput uploadingFiles={chat.uploadingFiles} groupMembers={chat.groupMembers} onSendMessage={chat.sendMessage} onOpenTemplate={openTemplatePopup} />
      </div>
    {:else}<div class="empty-area" style="background:{headerLight};"><div class="empty-icon">💬</div><h2>Chat</h2><p>Select contact • T:{loadedTemplates.length}</p></div>{/if}
  </section>
</div>

<ChatMeetingPopup chat={chat} />
{#if (chat as any).showTemplatePopup}
  <ReportTemplatePopup templates={loadedTemplates} loading={false} mode={chat.chatMode==='report' ? 'report' : 'template'} on:close={()=> (chat as any).showTemplatePopup=false}
    on:use={(e:any)=>{ const t=e.detail?.template; if(!t) return; (chat as any).showTemplatePopup=false; chat.selectedMeeting={ id:sanitize(String(t.template_code||t.id||''),50), title:sanitize(String(t.name||''),50), code:sanitize(String(t.template_code||t.code||''),30), _template:{ template_name:sanitize(String(t.name||''),30), template_code:sanitize(String(t.template_code||''),12) } }; chat.showMeetingPopup=true; }} />
{/if}
{#if chat.showAvatarModal}<div class="modal-bg" role="dialog" aria-modal="true" onclick={(e)=>onOverlay(e, ()=>chat.showAvatarModal=false)}><div class="modal detail-modal" onclick={(e)=>e.stopPropagation()}><div class="detail-head"><img src={chat.avatarTarget?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sanitize((chat.avatarTarget?.name||'U').slice(0,2),2))}&background=00a884&color=fff&size=128`} alt="" /><h3>{sanitize(chat.avatarTarget?.name||'Details',24)}</h3><small>{sanitize(chat.avatarTarget?.email||'',40)}</small><p>{sanitize(chat.avatarTarget?.last_message||'No messages',60)}</p></div><div class="detail-btns"><button type="button" class="btn-chat" onclick={()=>{ const t=chat.avatarTarget; chat.showAvatarModal=false; if(t._type==='group') chat.onSelectGroup(t); else chat.handleContactLoad(t); }}>Open Chat</button><button type="button" class="btn-del" onclick={async()=>{ if(confirm(`Delete ${sanitize(chat.avatarTarget?.name||'',20)}?`)){ await chat.handleDeleteContact(chat.avatarTarget); chat.showAvatarModal=false; }}}>Delete</button><button type="button" class="btn-cancel" onclick={()=>chat.showAvatarModal=false}>Cancel</button></div></div></div>{/if}
{#if chat.showContactForm}<div class="modal-bg" role="dialog" aria-modal="true" onclick={(e)=>onOverlay(e, ()=>chat.showContactForm=false)}><div class="modal small-modal" onclick={(e)=>e.stopPropagation()}><h3>Add Contact</h3><input bind:value={chat.contactEmail} placeholder="Email" maxlength="100" /><div class="row2"><button type="button" class="btn-cancel" onclick={()=>chat.showContactForm=false}>Cancel</button><button type="button" class="btn-chat" onclick={async()=>{ await chat.inviteContact(); }}>Invite</button></div></div></div>{/if}
{#if chat.showGroupForm}<div class="modal-bg" role="dialog" aria-modal="true" onclick={(e)=>onOverlay(e, ()=>chat.showGroupForm=false)}><div class="modal small-modal" onclick={(e)=>e.stopPropagation()}><h3>New Group</h3><input bind:value={chat.groupName} placeholder="Group name" maxlength="50" /><div class="row2"><button type="button" class="btn-cancel" onclick={()=>chat.showGroupForm=false}>Cancel</button><button type="button" class="btn-chat" onclick={async()=>{ await chat.createGroup(); }}>Create</button></div></div></div>{/if}

<style>
.main-container{display:flex;height:100dvh;max-height:100dvh;width:100vw;background:#e8f5e9;overflow:hidden;font-family:Inter,sans-serif;}
.sidebar-wrapper{width:30%;min-width:280px;max-width:380px;display:flex;flex-direction:column;border-right:1px solid #222d34;background:#fff;overflow:hidden;height:100dvh;}
.sidebar-scroll{flex:1;min-height:0;overflow-y:auto;}
/* BOTTOM NAV EXACT LIKE SCREENSHOT */
.bottom-fixed{flex-shrink:0;height:64px;min-height:64px;background:#0a0f12;display:flex;align-items:center;justify-content:space-between;z-index:20;padding:6px 8px;gap:8px;border-top:3px solid #00a884;}
.bottom-fixed .nav-btn{flex:1;height:50px;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:16px;transition:.18s;font-weight:800;position:relative;}
.bottom-fixed .nav-btn.chat-active{background:#e8f5e9;color:#0a7a3a;box-shadow:0 0 0 2px rgba(0,168,132,.15) inset;flex:1.4;}
.bottom-fixed .nav-btn.report-btn{background:transparent;color:#4a9bb8;}
.bottom-fixed .nav-btn.user-btn{background:transparent;color:#6b5a8a;}
.bottom-fixed .nav-btn .b-icon{font-size:18px;line-height:1;}
.bottom-fixed .nav-btn small{font-size:10px;letter-spacing:.2px;font-weight:800;}
.bottom-fixed .nav-btn.chat-active small{color:#0a7a3a;}
.bottom-fixed .nav-btn.report-btn small{color:#4a9bb8;}
.bottom-fixed .nav-btn.user-btn small{color:#8b7aaa;}
/* ACTIVE STATES WHEN ON REPORT/USER PAGE - you can toggle class via JS if needed */
.bottom-fixed .nav-btn.report-btn:active,
.bottom-fixed .nav-btn.report-btn.active-report{background:#e3f2fd!important;color:#0284c7!important;flex:1.4;box-shadow:0 0 0 2px rgba(14,165,233,.15) inset;}
.chat-area{flex:1;display:flex;flex-direction:column;min-width:0;height:100dvh;max-height:100dvh;overflow:hidden;}
.chat-header-fixed{flex-shrink:0;z-index:10;background:#fff;}
.filter-fixed{flex-shrink:0;padding:5px 8px;display:flex;align-items:center;justify-content:space-between;gap:0;}
.top-tabs{display:flex;gap:3px;background:#fff;border-radius:10px;padding:3px;box-shadow:0 1px 3px rgba(0,0,0,.08);}
.tab{background:transparent;border:none;padding:6px 14px;border-radius:8px;font-size:11px;font-weight:700;color:#64748b;cursor:pointer;line-height:1;transition:.15s;}
.filter-info{font-size:9px;font-weight:700;}
.messages-scroll{flex:1;min-height:0;overflow-y:auto;}
.chat-input-fixed{flex-shrink:0;background:#202c33;z-index:10;}
.reply-preview{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-left:4px solid #00a884;color:#334155;font-size:11px;font-weight:600;}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:12px;}
.modal{background:#fff;padding:16px;border-radius:16px;width:100%;max-width:340px;display:flex;flex-direction:column;gap:10px;}
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
.empty-area{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;gap:6px;}
.empty-icon{font-size:42px;opacity:0.6;}.empty-area h2{color:#0f172a;font-size:20px;font-weight:800;margin:6px 0 0;}
.meet-quick{display:flex;align-items:center;gap:0;padding:5px 6px;background:#1f2c34;border-top:1px solid #2a3942;}
.meet-chip{color:#fff;border:none;padding:6px 12px;border-radius:14px;font-weight:700;font-size:10px;cursor:pointer;white-space:nowrap;background:#334155;margin-right:6px;line-height:1;}
.meet-chip.blue{background:#0ea5e9;} .meet-chip.green{background:#16a34a;}
@media (max-width:768px){
.sidebar-wrapper{width:100%;max-width:100%;}.sidebar-wrapper.hidden-mobile{display:none;}
.chat-area{display:none;}.chat-area.show-mobile{display:flex;position:fixed;inset:0;z-index:50;width:100vw;height:100dvh;}
.detail-modal{max-width:88vw;}
}
</style>