<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import { createBrowserClient } from '@supabase/ssr';
	import { PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY } from '$env/static/public';
	import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
	import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
	import MessageList from "$lib/components/chat/MessageList.svelte";
	import ChatInput from "$lib/components/chat/ChatInput.svelte";
	import TemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
	import TemplateForm from "$lib/components/templates/form/TemplateForm.svelte";

	let { data } = $props();
	const chatDB = createBrowserClient(PUBLIC_SUPABASE_CHAT_URL, PUBLIC_SUPABASE_CHAT_ANON_KEY);

	let currentUser = $state<any>(data?.user?? null);
	let groups = $state<any[]>(data?.groups?? []);
	let contacts = $state<any[]>([]);
	let messages = $state<any[]>([]);
	let selectedGroup = $state<any>(null);
	let selectedContact = $state<any>(null);
	let selectedRoomId = $state<string | null>(null);
	let selectedGroupId = $state<string | null>(null);
	let groupMembers = $state<any[]>([]);
	let isLoadingMessages = $state(false);
	let onlineUsers = $state(new Set<string>());
	let showGroupForm = $state(false);
	let showContactForm = $state(false);
	let showTemplateModal = $state(false);
	let showTemplateForm = $state(false);
	let selectedTemplate = $state<any>(null);
	let groupName = $state("");
	let contactEmail = $state("");
	let invitingUser = $state(false);
	let uploadingFiles = $state<File[]>([]);
	let messagesChannel: any = $state(null);
	let presenceChannel: any = $state(null);
	let templates = $state<any[]>([]);
	let templateLoading = $state(false);

	let replyingTo = $state<any>(null);
	let showForwardModal = $state(false);
	let forwardMessage = $state<any>(null);
	let longPressTimer: any = $state(null);
	let selectedMessageForOptions = $state<any>(null);
	let showMessageOptions = $state(false);
	let messageOptionsPos = $state({ x: 0, y: 0 });
	let isMobileView = $state(false);

	function getCurrentUserId(){ return currentUser?.id?? ''; }

	function clickOutside(node: HTMLElement, callback: () => void) {
		if (!browser) return { destroy() {} };
		const handleClick = (e: MouseEvent) => { if (!node.contains(e.target as Node)) callback(); }
		document.addEventListener('click', handleClick, true)
		return { destroy() { document.removeEventListener('click', handleClick, true) } }
	}

	function checkMobile(){
		if (!browser) return;
		isMobileView = window.innerWidth < 768;
	}

	onMount(async () => {
		if (!browser) return;
		checkMobile();
		window.addEventListener('resize', checkMobile);
		const { data: { user } } = await chatDB.auth.getUser();
		if (!user) return;
		currentUser = user;
		await Promise.all([loadGroups(), loadContacts(), setupPresence(), loadTemplates()]);
	});

	onDestroy(async () => {
		if (browser) {
			window.removeEventListener('resize', checkMobile);
		}
		await cleanupRealtime();
	});

	async function loadTemplates(){
		templateLoading=true;
		try{
			const res = await fetch(`/api/templates?t=${Date.now()}`, { cache:"no-store" });
			if(!res.ok){ templates=[]; return; }
			const json = await res.json();
			let list = json.templates || json.data || json || [];
			if(!Array.isArray(list)) list=[];
			templates = list.map((t:any)=>({...t, data: typeof t.data==='string'? JSON.parse(t.data) : t.data }));
		}catch{ templates=[]; } finally{ templateLoading=false; }
	}

	function onOpenTemplate(){
		if(!selectedContact &&!selectedGroup){
			alert("Select a contact first to share template");
			return;
		}
		loadTemplates();
		showTemplateForm=false;
		showTemplateModal = true;
	}

	function handleUseTemplate(e:any){
		const t = e.detail?.template || e.detail;
		if(!t) return;
		try{
			selectedTemplate = JSON.parse(JSON.stringify(t));
			if(typeof selectedTemplate.data==='string'){
				try{ selectedTemplate.data = JSON.parse(selectedTemplate.data); }catch{}
			}
		}catch{
			selectedTemplate = {...t, data: typeof t.data==='string'? JSON.parse(t.data||'{}') : (t.data||{}) };
		}
		showTemplateModal=false;
		setTimeout(()=>{ showTemplateForm=true; }, 120);
	}

	function handleCreateTemplate(){
		showTemplateModal=false;
		showTemplateForm=false;
		if(browser) window.open("/templates","_blank");
	}

	async function sendTemplateReport(e:any){
		const { template, values } = e.detail;
		if(!template) return;
		if(!selectedContact &&!selectedGroup){
			alert("Select contact to share template");
			return;
		}
		let displayLines = [`📋 *${template.name}*`, ``];
		Object.entries(values).forEach(([k,v])=>{
			displayLines.push(`${k}: ${v || '-'}`);
		});
		const display = displayLines.join('\n');
		const installData = {
			type:'TEMPLATE_REPORT',
			template_id: template.id,
			template_name: template.name,
			template_code: template.template_code,
			values: values,
			shared_with: selectedContact?.id || selectedGroupId,
			contact_based: true
		};
		const fullContent = `${display}\n\n__TEMPLATE_DATA__\n${JSON.stringify(installData)}`;
		showTemplateForm=false;
		await sendMessage({ detail: { content: fullContent } } as any);
		selectedTemplate=null;
	}

	async function loadGroups() {
		const userId = getCurrentUserId(); if(!userId) return;
		const { data } = await chatDB.from("chat_group_members").select(`chat_groups(id,name,description,avatar_url)`).eq("user_id", userId);
		groups = (data?? []).map((m: any) => m.chat_groups).filter(Boolean);
	}
	async function loadContacts() {
	  const userId = getCurrentUserId(); if(!userId) return;
	  try {
	    const { data: rooms } = await chatDB.from("rooms").select(`id, user1_id, user2_id, user1:profiles!rooms_user1_fkey(id,name,email,avatar_url), user2:profiles!rooms_user2_fkey(id,name,email,avatar_url)`).or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
	    let mapped: any[] = (rooms?? []).map((room: any) => {
	      const other = room.user1_id === userId? room.user2 : room.user1;
	      if(!other?.id) { const otherId = room.user1_id === userId? room.user2_id : room.user1_id; if(!otherId) return null; return { id: otherId, name: "User", email: "", avatar_url: null, room_id: room.id, status: 'accepted' }; }
	      return {...other, room_id: room.id, status: 'accepted' };
	    }).filter(Boolean);
	    const { data: sent } = await chatDB.from('contact_invites').select('id, email, status').eq('invited_by', userId).neq('status', 'accepted');
	    sent?.forEach((i: any) => { if(!mapped.find(c => c.email?.toLowerCase() === i.email?.toLowerCase())){ mapped.push({ id: i.id, invite_id: i.id, email: i.email, name: i.email.split('@')[0], room_id: null, status: i.status }); } });
	    if(currentUser?.email){
	      const { data: rec } = await chatDB.from('contact_invites').select('id, email, status, invited_by, inviter:profiles!contact_invites_invited_by_fkey(id,name,email,avatar_url)').eq('email', currentUser.email.toLowerCase()).eq('status', 'pending');
	      rec?.forEach((i: any) => { if(mapped.find(c => c.email?.toLowerCase() === i.email?.toLowerCase())) return; mapped.push({ id: i.id, actual_user_id: i.inviter?.id || i.invited_by, invite_id: i.id, email: i.email, name: i.inviter?.name || i.email.split('@')[0], avatar_url: i.inviter?.avatar_url || null, room_id: null, status: 'invite_received', invited_by: i.invited_by }); });
	    }
	    if(currentUser &&!mapped.find((c:any) => c.id === userId)){ mapped.unshift({ id: userId, name: "You (Saved Messages)", email: currentUser.email, room_id: null, status: 'accepted' }); }
	    contacts = mapped;
	  } catch(e){ console.error(e); }
	}
	async function setupPresence() {
		const userId = getCurrentUserId(); if(!userId) return;
		if(presenceChannel) await chatDB.removeChannel(presenceChannel);
		presenceChannel = chatDB.channel("online-users", { config: { presence: { key: userId } } });
		presenceChannel.on("presence", { event: "sync" }, () => { onlineUsers = new Set(Object.keys(presenceChannel!.presenceState())); }).subscribe(async (s) => { if(s==="SUBSCRIBED") await presenceChannel!.track({ user_id: userId }); });
	}
	function isUserOnline(id: string){ return onlineUsers.has(id); }
	async function cleanupRealtime(){
		const ch = [messagesChannel, presenceChannel].filter(Boolean);
		messagesChannel = null; presenceChannel = null;
		if(ch.length) await Promise.allSettled(ch.map((c:any) => chatDB.removeChannel(c)));
	}
	async function loadMessages({ roomId, groupId }: any){
	  if(isLoadingMessages) return; isLoadingMessages=true;
	  try{
	    let query = chatDB.from("messages").select("*").order("created_at", {ascending:true});
	    if(groupId) query = query.eq("group_id", groupId);
	    else if(roomId) query = query.eq("room_id", roomId);
	    else query = query.eq("sender_id", getCurrentUserId()).eq("receiver_id", getCurrentUserId());
	    const { data, error } = await query;
	    if(error){ console.error(error); messages=[]; }
	    else messages=(data?? []).map((m:any)=>({...m, is_own:m.sender_id===getCurrentUserId()}));
	  } finally { isLoadingMessages=false; }
	}
	async function subscribeToMessages({ roomId, groupId }: any){
	  if(messagesChannel) await chatDB.removeChannel(messagesChannel);
	  const channelName = groupId? `group-${groupId}` : roomId? `room-${roomId}` : `self-${getCurrentUserId()}`;
	  messagesChannel=chatDB.channel(channelName)
	.on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},(payload)=>{
	      const newMsg = payload.new as any;
	      if(groupId && newMsg.group_id===groupId) { if(!messages.find(m=>m.id===newMsg.id)) messages = [...messages, {...newMsg, is_own:newMsg.sender_id===getCurrentUserId()}]; }
	      else if(roomId && newMsg.room_id===roomId) { if(!messages.find(m=>m.id===newMsg.id)) messages = [...messages, {...newMsg, is_own:newMsg.sender_id===getCurrentUserId()}]; }
	      else if(!roomId &&!groupId && newMsg.sender_id===getCurrentUserId() && newMsg.receiver_id===getCurrentUserId()) { if(!messages.find(m=>m.id===newMsg.id)) messages = [...messages, {...newMsg, is_own:true}]; }
	    }).subscribe();
	}

	async function sendMessage(event: any){
	  const detail = event.detail || event;
	  let content = (detail.content || "").trim();
	  if(!content &&!(detail.files?.length)) return;
	  if(replyingTo){
		  content = `> ${replyingTo.content?.slice(0,100)}\n${content}`;
	  }
	  const uid = getCurrentUserId();
	  const tempId = 'temp_'+Date.now();
	  const optimistic = { id: tempId, sender_id: uid, content, room_id: selectedRoomId, group_id: selectedGroupId, receiver_id: selectedContact? (selectedContact.actual_user_id || selectedContact.id) : null, created_at: new Date().toISOString(), is_own: true, reply_to: replyingTo?.id || null };
	  messages = [...messages, optimistic];
	  const payload: any = {
		  sender_id: uid,
		  content: content,
		  room_id: selectedRoomId || null,
		  group_id: selectedGroupId || null,
		  receiver_id: selectedGroupId? null : (selectedContact?.actual_user_id || selectedContact?.id || uid),
		  reply_to: replyingTo?.id || null
	  };
	  replyingTo = null;
	  const { data, error } = await chatDB.from("messages").insert(payload).select().single();
	  if(error){ console.error("Send failed:", error); messages = messages.filter(m=>m.id!==tempId); alert("Send failed: " + error.message); }
	  else if(data){ messages = messages.map(m=> m.id===tempId? {...data, is_own:true} : m); }
	}

	async function getOrCreateRoom(otherId: string){
		if(!otherId) return null;
		const currentUserId = getCurrentUserId();
		if(!currentUserId || otherId === currentUserId) return null;
		try{ const { data }=await chatDB.rpc("get_or_create_room",{p_user1:getCurrentUserId(),p_user2:otherId}); const r=Array.isArray(data)?data[0]:data; if(r?.id) return r.id; if(typeof r === 'string') return r; }catch(e){ console.warn("rpc failed", e); }
		const { data: existing } = await chatDB.from("rooms").select("id").or(`and(user1_id.eq.${getCurrentUserId()},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${getCurrentUserId()})`).maybeSingle();
		if(existing?.id) return existing.id;
		const { data: newRoom, error } = await chatDB.from("rooms").insert({user1_id:getCurrentUserId(), user2_id:otherId}).select("id").single();
		if(error){ console.error(error); return null; }
		return newRoom?.id || null;
	}

	async function handleContactLoad(contact:any){
		const currentUserId = getCurrentUserId();
		const contactUserId = contact.actual_user_id || contact.id;
		if(contactUserId === currentUserId){
			selectedRoomId = null;
			selectedGroupId = null;
			selectedGroup = null;
			await loadMessages({roomId:null});
			await subscribeToMessages({roomId:null});
			return;
		}
		let roomId = contact.room_id || null;
		if(!roomId){
			roomId = await getOrCreateRoom(contact.actual_user_id||contact.id);
			if(roomId){
				selectedRoomId=roomId;
				contacts = contacts.map(c=> c.id===contact.id? {...c, room_id: roomId} : c);
			}
		}
		if(roomId){
			selectedRoomId=roomId;
			selectedGroupId=null;
			selectedGroup=null;
			await loadMessages({roomId});
			await subscribeToMessages({roomId});
		}
	}

	function onSelectGroup(group:any){
		selectedContact=null;
		selectedRoomId=null;
		selectedGroup={...group};
		selectedGroupId=group.id;
		loadGroupDetails(group.id);
	}

	async function loadGroupDetails(groupId:string){
		const { data }=await chatDB.from("chat_group_members").select(`users:user_id(id,name,email,avatar_url)`).eq("group_id",groupId);
		groupMembers=(data?? []).map((m:any)=>m.users).filter(Boolean);
		await loadMessages({groupId});
		await subscribeToMessages({groupId});
	}

	function handleMessageLongPress(msg:any, event:any){
		longPressTimer = setTimeout(()=>{
			selectedMessageForOptions = msg;
			if(event.touches){
				messageOptionsPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
			} else {
				messageOptionsPos = { x: event.clientX, y: event.clientY };
			}
			showMessageOptions = true;
		}, 500);
	}
	function handleMessagePressEnd(){
		if(longPressTimer) clearTimeout(longPressTimer);
	}
	function handleReply(msg:any){
		replyingTo = msg;
		showMessageOptions = false;
	}
	function handleForward(msg:any){
		forwardMessage = msg;
		showForwardModal = true;
		showMessageOptions = false;
	}
	async function handleForwardToContact(contact:any){
		if(!forwardMessage) return;
		const roomId = contact.room_id || await getOrCreateRoom(contact.actual_user_id || contact.id);
		if(!roomId) return;
		await chatDB.from("messages").insert({
			sender_id: getCurrentUserId(),
			content: `Forwarded: ${forwardMessage.content}`,
			room_id: roomId,
			receiver_id: contact.actual_user_id || contact.id
		});
		showForwardModal = false;
		forwardMessage = null;
		alert("Forwarded to " + contact.name);
	}

	function handleBackToList(){
		selectedContact = null;
		selectedGroup = null;
		selectedRoomId = null;
		selectedGroupId = null;
		messages = [];
	}

	async function handleInvite(event: any){ const { inviteId, action }=event.detail; await chatDB.from('contact_invites').update({status:action}).eq('id',inviteId); if(action==='accepted'){ const inv=contacts.find((c:any)=>c.id===inviteId); const oid=(inv as any)?.actual_user_id||(inv as any)?.invited_by; if(oid && oid!== getCurrentUserId()) await getOrCreateRoom(oid); } await loadContacts(); }
	async function createContact(){ if(!contactEmail.trim()) return; invitingUser=true; try{ const email=contactEmail.trim().toLowerCase(); await chatDB.from('contact_invites').insert({email, invited_by:getCurrentUserId(), status:'pending', token:crypto.randomUUID()}); showContactForm=false; contactEmail=""; await loadContacts(); } finally{ invitingUser=false; } }
	async function createGroup(){ if(!groupName.trim()) return; const { data: g }=await chatDB.from("chat_groups").insert({name:groupName.trim(), created_by:getCurrentUserId()}).select().single(); if(g){ await chatDB.from("chat_group_members").insert({group_id:g.id, user_id:getCurrentUserId()}); groupName=""; showGroupForm=false; await loadGroups(); } }
</script>

<div class="main-container" class:mobile-chat-open={isMobileView && (selectedContact || selectedGroup)}>
	<div class="sidebar-wrapper" class:hidden-mobile={isMobileView && (selectedContact || selectedGroup)}>
		<ChatSidebar {groups} {contacts} {selectedGroup} {selectedContact}
		  onSelectContact={(c)=>{ selectedContact={...c}; selectedGroup=null; selectedGroupId=null; selectedRoomId=c.room_id||null; handleContactLoad(c); }}
		  onSelectGroup={onSelectGroup}
		  onNewGroup={() => showGroupForm=true}
		  onNewContact={() => showContactForm=true}
		  onHandleInvite={handleInvite}
		  onLogout={async () => { await chatDB.auth.signOut(); if(browser) location.reload(); }}
		/>
	</div>

	<section class="chat-area" class:show-mobile={isMobileView && (selectedContact || selectedGroup)}>
		{#if selectedContact || selectedGroup}
			<ChatHeader
				title={selectedContact?.name?? selectedGroup?.name?? ''}
				subtitle={selectedContact? (isUserOnline(selectedContact?.actual_user_id||selectedContact?.id)? "Online":"Tap to chat") : `${groupMembers.length} members`}
				avatarUrl={selectedContact?.avatar_url?? selectedGroup?.avatar_url?? ''}
				showBack={isMobileView}
				onBack={handleBackToList}
			/>
			<MessageList
				{messages}
				{selectedContact}
				{selectedGroup}
				currentUser={currentUser}
				selectedUser={currentUser}
				{replyingTo}
				onReply={handleReply}
				onForward={handleForward}
				onLongPress={handleMessageLongPress}
				onPressEnd={handleMessagePressEnd}
			/>

			{#if replyingTo}
				<div class="reply-preview">
					<span>Replying to: {replyingTo.content?.slice(0,50)}...</span>
					<button onclick={()=>replyingTo=null}>✕</button>
				</div>
			{/if}

			<ChatInput {uploadingFiles} on:sendMessage={sendMessage} on:openTemplate={onOpenTemplate} />
		{:else}
			<div class="empty-area"><div class="empty-icon">💬</div><h2>Chat</h2><p>Select a chat to start messaging</p><span>End-to-end encrypted</span></div>
		{/if}
	</section>
</div>

{#if showMessageOptions && selectedMessageForOptions}
	<button class="message-options-overlay" onclick={()=>showMessageOptions=false} aria-label="Close options"></button>
	<div class="message-options" style="left:{messageOptionsPos.x}px; top:{messageOptionsPos.y}px;" use:clickOutside={()=>showMessageOptions=false}>
		<button onclick={()=>handleReply(selectedMessageForOptions)}>↩️ Reply</button>
		<button onclick={()=>handleForward(selectedMessageForOptions)}>➡️ Forward</button>
		<button onclick={()=>{ if(browser){ navigator.clipboard.writeText(selectedMessageForOptions.content); } showMessageOptions=false; }}>📋 Copy</button>
	</div>
{/if}

{#if showForwardModal}
	<div class="modal-bg" onclick={()=>showForwardModal=false} role="presentation">
		<div class="modal large" onclick={(e)=>e.stopPropagation()} role="dialog" tabindex="-1">
			<h3>Forward to...</h3>
			<div class="forward-list">
				{#each contacts as contact}
					<button class="forward-item" onclick={()=>handleForwardToContact(contact)}>
						<span>{contact.name}</span>
					</button>
				{/each}
			</div>
			<button class="btn-secondary" onclick={()=>showForwardModal=false}>Cancel</button>
		</div>
	</div>
{/if}

{#if showContactForm}
<div class="modal-bg" onclick={()=>showContactForm=false} role="presentation">
  <div class="modal" onclick={(e)=>e.stopPropagation()} role="dialog" tabindex="-1">
    <h3>New Contact</h3>
    <label for="contact-email" class="sr-label">Contact Email</label>
    <input id="contact-email" class="modal-input" bind:value={contactEmail} placeholder="Contact Email" />
    <div class="modal-btns"><button class="btn-primary" onclick={createContact}>{invitingUser?'Inviting...':'Invite'}</button><button class="btn-secondary" onclick={() => showContactForm=false}>Cancel</button></div>
  </div>
</div>
{/if}

{#if showGroupForm}
<div class="modal-bg" onclick={()=>showGroupForm=false} role="presentation">
  <div class="modal" onclick={(e)=>e.stopPropagation()} role="dialog" tabindex="-1">
    <h3>Create Group</h3>
    <label for="group-name" class="sr-label">Group Name</label>
    <input id="group-name" class="modal-input" bind:value={groupName} placeholder="Group Name" />
    <div class="modal-btns"><button class="btn-primary" onclick={createGroup}>Create</button><button class="btn-secondary" onclick={() => showGroupForm=false}>Cancel</button></div>
  </div>
</div>
{/if}

{#if showTemplateModal}
  <TemplatePopup templates={templates} loading={templateLoading} on:close={()=>showTemplateModal=false} on:use={handleUseTemplate} on:new={handleCreateTemplate} on:create={handleCreateTemplate} on:deleted={(e)=>{ templates=templates.filter(t=>t.id!==e.detail.template.id); }} />
{/if}
{#if showTemplateForm && selectedTemplate}
  <div style="position:fixed; inset:0; z-index:10050; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4);">
    <TemplateForm template={selectedTemplate} on:close={()=>{ showTemplateForm=false; selectedTemplate=null; }} on:submit={sendTemplateReport} />
  </div>
{/if}

<style>
	.main-container{display:flex; height:100vh; width:100vw; background:#111b21; overflow:hidden; font-family: Inter, Segoe UI, sans-serif;}
	.sidebar-wrapper{width:30%; min-width:300px; max-width:420px; display:flex; flex-direction:column; border-right:1px solid #222d34;}
	.chat-area{flex:1; display:flex; flex-direction:column; background:#0b141a; min-width:0;}
	.empty-area{flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#222e35; color:#8696a0; gap:8px;}
	.empty-icon{ font-size:64px; opacity:0.5; }
	.empty-area h2{ color:#e9edef; font-size:32px; font-weight:300; margin:10px 0 0; }
	.empty-area p{ color:#8696a0; font-size:14px; margin:0; }
	.empty-area span{ color:#667781; font-size:12px; margin-top:20px; }
	.modal-bg{position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:9999;}
	.modal{background:#233138; padding:24px; border-radius:12px; width:400px; display:flex; flex-direction:column; gap:16px;}
	.modal.large{ width:420px; max-height:80vh; overflow-y:auto; }
	.modal h3{color:#e9edef; margin:0; font-size:18px;}
	.modal-input{background:#2a3942; color:#e9edef; border:1px solid #374045; padding:12px; border-radius:8px; width:100%; outline:none;}
	.modal-input:focus{ border-color:#00a884; }
	.modal-btns{display:flex; gap:8px;}.btn-primary{flex:1; background:#00a884; color:#111b21; border:none; padding:11px; border-radius:8px; font-weight:700; cursor:pointer;}.btn-secondary{flex:1; background:#2a3942; color:#e9edef; border:none; padding:11px; border-radius:8px; cursor:pointer;}
	.sr-label{ position:absolute; left:-9999px; }
	.reply-preview{display:flex; justify-content:space-between; align-items:center; background:#202c33; padding:8px 12px; border-left:4px solid #00a884; color:#8696a0; font-size:13px;}
	.reply-preview button{background:none; border:none; color:#8696a0; cursor:pointer; font-size:16px;}
	.message-options-overlay{position:fixed; inset:0; z-index:1000; background:transparent; border:none;}
	.message-options{position:fixed; z-index:1001; background:#233138; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.5); display:flex; flex-direction:column; overflow:hidden; min-width:160px;}
	.message-options button{padding:12px 16px; background:none; border:none; color:#e9edef; text-align:left; cursor:pointer; font-size:14px;}
	.message-options button:hover{background:#2a3942;}
	.forward-list{display:flex; flex-direction:column; gap:4px; max-height:300px; overflow-y:auto;}
	.forward-item{padding:10px; background:#2a3942; border:none; border-radius:6px; color:#e9edef; text-align:left; cursor:pointer;}
	.forward-item:hover{background:#33414c;}
	@media (max-width:768px){
		.sidebar-wrapper{width:100%; max-width:100%;}
		.sidebar-wrapper.hidden-mobile{display:none;}
		.chat-area{display:none;}
		.chat-area.show-mobile{display:flex; position:fixed; inset:0; z-index:10; width:100vw; height:100vh;}
	}
</style>