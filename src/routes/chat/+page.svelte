<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import { getChatClient, supabaseTemplates } from '$lib/supabase';
	const chatDB = getChatClient();
	import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
	import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
	import MessageList from "$lib/components/chat/MessageList.svelte";
	import ChatInput from "$lib/components/chat/ChatInput.svelte";
	import TemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
	import TemplateForm from "$lib/components/templates/form/TemplateForm.svelte";
	import { goto, preloadData } from "$app/navigation";

	let { data } = $props();
	let currentUser = $state<any>(data?.user?? null);
	let groups = $state<any[]>(data?.groups?? []);
	let contacts = $state<any[]>([]);
	let messages = $state<any[]>([]);
	let newMessage = $state("");
	let selectedGroup = $state<any>(null);
	let selectedContact = $state<any>(null);
	let selectedRoomId = $state<string | null>(null);
	let selectedGroupId = $state<string | null>(null);
	let groupMembers = $state<any[]>([]);
	let commonGroups = $state<any[]>([]);
	let isLoadingMessages = $state(false);
	let loadingMore = $state(false);
	let hasMore = $state(true);
	let scrollEl: HTMLElement | null = $state(null);
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
	let profileChannel: any = $state(null);
	let globalChannel: any = $state(null);
	let invitesChannel: any = $state(null);
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
	let showDetailModal = $state(false);
	let detailData: any = $state(null);
	let showAvatarModal = $state(false);
	let avatarTarget: any = $state(null);
	let avatarType = $state<'contact'|'group'>('contact');
	let avatarUploading = $state(false);
	let avatarPreview = $state<string | null>(null);
	let mutedRooms = $state<Set<string>>(new Set<string>([]));
	let chatMode = $state<'chat'|'template'|'meeting'>('chat');
	let openMode = $state(false);
	let openList = $state(false);
	let selectedMeeting = $state<any>(null);
	let meetings = $state<any[]>([{id:'1', title:'Daily Standup', date:'Today 10 AM'},{id:'2', title:'Client Call', date:'Tomorrow 2 PM'}]);
	let bottomTab = $state('chat');
	let lastSent = $state(0);
	let sendingLock = $state(false);
	let showInviteModal = $state(false);
	let selectedInvite = $state<any>(null);
	let showIncomingModal = $state(false);
	let selectedIncoming = $state<any>(null);
	let showArchived = $state(false);
	let showStarred = $state(false);
	let showSettingsModal = $state(false);
	let showAddMembersModal = $state(false);
	let groupToAddMembers = $state<any>(null);
	let addMemberLoading = $state(false);
	const roomCache = new Map<string,string>();
	let realtimeCleaned = $state(false);

	function goBottom(tab:string){
	  bottomTab=tab;
	  const target = tab==='chat'? '/chat' : tab==='report'? '/reports' : '/settings';
	  goto(target, { keepFocus:true, noScroll:true, replaceState: tab==='chat' });
	}
	function isTemplateMsg(m:any){ return m.content?.includes('__TEMPLATE_DATA__') || m.content?.startsWith('📋'); }
	function isMeetingMsg(m:any){ return m.content?.includes('__MEETING_DATA__'); }
	function getMeta(m:any){ try{ let p = m.content?.split('__TEMPLATE_DATA__'); if(p?.length>1) return JSON.parse(p[1]); }catch{} return null; }
	function sanitize(str:string){ if(!str) return ""; return str.toString().slice(0,4000).trim().replace(/<script.*?>.*?<\/script>/gi,'').replace(/javascript:/gi,'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
	function evalFormulaChat(formulaStr: string, vals: Record<string,any>): string { if(!formulaStr || formulaStr.length>200) return "0.00"; try{ let expr = formulaStr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/—/g,'-'); expr = expr.replace(/\{([^}]+)\}/g, (_, k)=>{ let v = vals[k]?? vals[k.toLowerCase()]?? "0"; let num = Number(String(v).replace(/[^0-9.\-]/g,'')); if(isNaN(num)) return "0"; return String(Math.max(-1e9, Math.min(1e9,num))); }); expr = expr.replace(/%/g,''); if(/[^0-9+\-*/().\s]/.test(expr)) return "0.00"; if(expr.length>120 || expr.includes('**')) return "0.00"; return Number(Function('"use strict";return ('+expr+')')()).toFixed(2); }catch{ return "0.00"; } }
	function calcAllFormulas(template: any, vals: Record<string,any>){ let out = {...vals}; let fields = template?.fields || template?.data?.fields || selectedTemplate?.data?.fields || []; for(let f of fields){ if(f.type==='formula' && f.formula){ out[f.field_name] = evalFormulaChat(f.formula, out); } } return out; }
	let filteredMessages = $derived.by(()=>{
		if(chatMode==='template'){ let list = messages.filter(isTemplateMsg); if(selectedTemplate){ return list.filter((m:any)=>{ let meta = getMeta(m); if(meta?.template_id===selectedTemplate.id) return true; return m.content?.includes(selectedTemplate.template_code); }); } return list; }
		if(chatMode==='meeting'){ return messages.filter(isMeetingMsg); }
		if(showStarred) return messages.filter((m:any)=> m.is_starred); if(showArchived) return []; return messages.filter((m:any)=>!isTemplateMsg(m) &&!isMeetingMsg(m));
	});
	function getCurrentUserId(){ return currentUser?.id || data?.user?.id || ''; }
	function clickOutside(node: HTMLElement, callback: () => void) { if (!browser) return { destroy() {} }; const handleClick = (e: MouseEvent) => { const t = e.target as HTMLElement; if(t.closest('.context-menu-fixed')||t.closest('.dd')) return; if (!node.contains(e.target as Node)) setTimeout(callback, 10); }; document.addEventListener('mousedown', handleClick, true); return { destroy() { document.removeEventListener('mousedown', handleClick, true) } } }
	function checkMobile(){ if (!browser) return; isMobileView = window.innerWidth < 768; }
	function scrollToBottom(force=false){ if(!browser) return; requestAnimationFrame(()=>{ const el = scrollEl || document.querySelector('.messages-scroll') as HTMLElement; if(el) el.scrollTo({ top: el.scrollHeight, behavior: force? 'auto':'smooth' }); }); }
	function setupScrollListener(){ if(!browser) return; scrollEl = document.querySelector('.messages-scroll') as HTMLElement; if(!scrollEl) return; let ticking=false; scrollEl.addEventListener('scroll', ()=>{ if(ticking) return; ticking=true; requestAnimationFrame(()=>{ if(scrollEl && scrollEl.scrollTop < 80 &&!loadingMore &&!isLoadingMessages && hasMore){ loadMessages({ roomId: selectedRoomId, groupId: selectedGroupId, older:true }); } ticking=false; }); }, { passive:true }); }
	function updateLastMessageInList(msg:any){ if(!msg) return; const short = msg.content?.split('__')[0]?.slice(0,45); if(msg.group_id){ groups = groups.map(g=> g.id===msg.group_id? {...g, last_message: short, last_message_at: msg.created_at} : g); } else if(msg.room_id){ contacts = contacts.map(c=> c.room_id===msg.room_id? {...c, last_message: short, last_message_at: msg.created_at } : c); } }
	async function handleHeaderAction(action: string){
		const uid = getCurrentUserId(); if(!uid) return;
		if(action === 'info'){ if(selectedGroup) openAvatarModal(selectedGroup,'group'); else if(selectedContact) openAvatarModal(selectedContact,'contact'); return; }
		if(action === 'mute'){ const id = selectedRoomId || selectedGroupId || selectedContact?.id; if(!id) return; if(mutedRooms.has(id)) mutedRooms.delete(id); else mutedRooms.add(id); mutedRooms = new Set(mutedRooms); if(browser) localStorage.setItem('mutedRooms', JSON.stringify([...mutedRooms])); return; }
		if(action === 'clear'){ if(!confirm("Clear chat only for you?")) return; const list = selectedGroupId? await chatDB.from("messages").select("id,deleted_by").eq("group_id", selectedGroupId).limit(200) : await chatDB.from("messages").select("id,deleted_by").eq("room_id", selectedRoomId).limit(200); for(const m of list.data||[]){ await chatDB.from("messages").update({ deleted_by: [...(m.deleted_by||[]), uid] }).eq("id", m.id); } messages = []; return; }
		if(action === 'exit'){ if(!selectedGroup) return; if(!confirm(`Exit group "${selectedGroup.name}"?`)) return; await chatDB.from("chat_group_members").delete().eq("group_id", selectedGroupId).eq("user_id", uid); groups = groups.filter(g=> g.id!== selectedGroupId); messages = []; selectedGroup = null; selectedGroupId = null; return; }
		if(action === 'block'){ if(!selectedContact || selectedContact.isSelf) return; if(!confirm(`Block ${selectedContact.name}?`)) return; contacts = contacts.filter(c=> c.id!== selectedContact.id); messages = []; selectedContact = null; selectedRoomId = null; return; }
	}
	function handleArchivedAction(){ showArchived=!showArchived; showStarred=false; }
	function handleStarredAction(){ showStarred=!showStarred; showArchived=false; }
	function handleSettingsAction(){ showSettingsModal=true; }
	async function openAvatarModal(target: any, type: 'contact'|'group'){
	  avatarTarget = target; avatarType = type; avatarPreview = target?.avatar_url || null; showAvatarModal = true; commonGroups = [];
	  if(type==='group' && target?.id){ loadGroupDetails(target.id); }
	  else if(type==='contact' && target?.actual_user_id){
	    try{
	      const uid = getCurrentUserId(); const otherId = target.actual_user_id; if(!uid ||!otherId) return;
	      const { data: myGroups } = await chatDB.from("chat_group_members").select("group_id").eq("user_id", uid).limit(200);
	      const myGroupIds = (myGroups||[]).map((m:any)=>m.group_id);
	      if(myGroupIds.length){
	        const { data: otherGroups } = await chatDB.from("chat_group_members").select("group_id").eq("user_id", otherId).in("group_id", myGroupIds).limit(200);
	        const commonIds = (otherGroups||[]).map((m:any)=>m.group_id);
	        if(commonIds.length){
	          const { data: gData } = await chatDB.from("chat_groups").select("id,name,avatar_url").in("id", commonIds).limit(50);
	          commonGroups = gData||[];
	        }
	      }
	    }catch{}
	  }
	}

	onMount(async () => {
		if (!browser) return;
		checkMobile(); window.addEventListener('resize', checkMobile);
		try{ mutedRooms = new Set(JSON.parse(localStorage.getItem('mutedRooms') || '[]')); }catch{}
		try{
		  const cached = localStorage.getItem('recent_contacts_cache_v2');
		  if(cached){
		    const parsed = JSON.parse(cached);
		    if(Array.isArray(parsed) && parsed.length) contacts = parsed.filter((c:any)=>!c._ts);
		  }
		}catch{}
		const { data: { user } } = await chatDB.auth.getUser();
		if(user){ currentUser = {...(data?.user||{}),...user, avatar_url: user.user_metadata?.avatar_url || data?.user?.avatar_url || null }; } else if(data?.user?.id){ currentUser = data.user; }
		const uid = getCurrentUserId(); if(!uid) return;
		await Promise.allSettled([ loadContacts(true), loadGroups() ]);
		setTimeout(()=>{ try{ preloadData('/reports'); preloadData('/settings'); }catch{} }, 600);
		await cleanupRealtime();
		setTimeout(()=>{ if(realtimeCleaned) return; setupPresence(); setupProfileLive(); setupGlobalListener(); setupInvitesListener(); }, 600);
		if(browser && 'Notification' in window && Notification.permission==='default'){ Notification.requestPermission(); }
	});
	onDestroy(async () => { realtimeCleaned = true; if (browser) window.removeEventListener('resize', checkMobile); await cleanupRealtime(); });

	async function cleanupRealtime(){
	  realtimeCleaned = false;
	  const ch = [messagesChannel, presenceChannel, profileChannel, globalChannel, invitesChannel].filter(Boolean);
	  messagesChannel = null; presenceChannel = null; profileChannel = null; globalChannel = null; invitesChannel=null;
	  if(ch.length) { try{ await Promise.allSettled(ch.map((c:any) => chatDB.removeChannel(c))); }catch{} }
	}

	function setupProfileLive(){
	  if(profileChannel) return;
	  const uid = getCurrentUserId(); if(!uid) return;
	  profileChannel = chatDB.channel(`profiles-live-${uid}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
	 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles', filter: `id=neq.${uid}`},(payload)=>{
	      const p = payload.new as any; if(!p?.id) return;
	      contacts = contacts.map(c=> (c.actual_user_id===p.id || c.id===p.id)? {...c, avatar_url: p.avatar_url?.slice(0,300), name: (p.name||c.name)?.toString().slice(0,50)} : c);
	      if(selectedContact && (selectedContact.actual_user_id===p.id || selectedContact.id===p.id)){ selectedContact = {...selectedContact, avatar_url: p.avatar_url?.slice(0,300), name: p.name?.slice(0,50) || selectedContact.name}; }
	      if(currentUser?.id===p.id){ currentUser = {...currentUser, avatar_url: p.avatar_url?.slice(0,300)}; }
	    }).subscribe();
	}
	function setupInvitesListener(){
	  if(invitesChannel) return;
	  const uid = getCurrentUserId(); if(!uid) return;
	  const emailLower = (currentUser?.email || data?.user?.email || '').toLowerCase().slice(0,100);
	  if(!emailLower) return;
	  invitesChannel = chatDB.channel(`invites-${uid}-${Date.now()}`)
	 .on('postgres_changes',{event:'*',schema:'public',table:'contact_invites', filter: `email=eq.${emailLower}`},()=>{ loadContacts(true); })
	 .subscribe();
	}
	async function setupGlobalListener(){
	  if(globalChannel) return;
	  const uid = getCurrentUserId(); if(!uid) return;
	  globalChannel = chatDB.channel(`global-${uid}-${Date.now()}`)
		.on('postgres_changes',{event:'INSERT',schema:'public',table:'messages', filter: `receiver_id=eq.${uid}`}, async (payload)=>{
		  const msg:any = payload.new; if(!msg?.id || msg.sender_id===uid) return;
		  try{ await chatDB.from('messages').update({status:'delivered', delivered_at: new Date().toISOString()}).eq('id', msg.id).eq('status','sent'); }catch{}
		  const short = sanitize(msg.content).split('__')[0].slice(0,40);
		  const isOpen = (msg.room_id && msg.room_id===selectedRoomId) || (msg.group_id && msg.group_id===selectedGroupId);
		  contacts = contacts.map(c=>{
		    if(c.room_id===msg.room_id || (msg.group_id && c.id===msg.group_id) || c.actual_user_id===msg.sender_id){
		      return {...c, last_message: short, last_message_at: msg.created_at, unread: isOpen? 0 : (c.unread||0)+1};
		    }
		    return c;
		  });
		  if(!isOpen && browser && Notification.permission==='granted'){ try{ new Notification('New message', { body: short }); }catch{} }
		  if(isOpen &&!messages.some(m=>m.id===msg.id)){ messages = [...messages, {...msg, status:'delivered', is_own:false}]; scrollToBottom(); setTimeout(()=> markAsRead(), 300); }
		})
		.on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages', filter: `receiver_id=eq.${uid}`}, (payload)=>{
		  const upd:any = payload.new; if(!upd?.id) return; messages = messages.map(m=> m.id===upd.id? {...m, status:upd.status, delivered_at:upd.delivered_at, read_at:upd.read_at} : m);
		}).subscribe();
	}
	async function setupPresence() {
	  if(presenceChannel) return;
	  const userId = getCurrentUserId(); if(!userId) return;
	  presenceChannel = chatDB.channel(`online-users-${userId}-${Date.now()}`, { config: { presence: { key: userId } } });
	  presenceChannel.on("presence", { event: "sync" }, () => { try{ onlineUsers = new Set(Object.keys(presenceChannel!.presenceState())); }catch{} }).subscribe(async (s:any) => { if(s==="SUBSCRIBED") await presenceChannel!.track({ user_id: userId }); });
	}
	function isUserOnline(id: string){ return onlineUsers.has(id); }
	async function loadGroups() { const userId = getCurrentUserId(); if(!userId) return; try{ let { data } = await chatDB.from("chat_group_members").select(`chat_groups(id,name,description,avatar_url)`).eq("user_id", userId).limit(100); let list = (data?? []).map((m: any) => m.chat_groups).filter(Boolean); groups = list; }catch{} }
	async function loadContacts(force=false) {
	    const userId = getCurrentUserId(); if(!userId){ contacts = []; return; }
	    const myEmail = (currentUser?.email || data?.user?.email || "").toLowerCase();
	    let mapped: any[] = [{ id: userId, actual_user_id: userId, name: "You (Saved Messages)", email: currentUser?.email || "You", avatar_url: currentUser?.avatar_url || null, room_id: null, status: 'accepted', isSelf: true, last_message: "Message yourself", unread:0, last_message_at: new Date().toISOString() }];
	    try{
	        const { data: accepted } = await chatDB.from("contact_invites").select("id,email,status,invited_by").eq("invited_by", userId).in("status", ["accepted","pending"]).limit(100);
	        for(const inv of accepted||[]){
	            if(mapped.find(m=>m.email?.toLowerCase()===inv.email.toLowerCase())) continue;
	            const { data: prof } = await chatDB.from("profiles").select("id,name,email,avatar_url").ilike("email", inv.email).maybeSingle();
	            if(prof){ mapped.push({ id: prof.id, actual_user_id: prof.id, name: prof.name||prof.email.split('@')[0], email: prof.email, avatar_url: prof.avatar_url, room_id: roomCache.get(prof.id)||null, status: inv.status, isInvite: inv.status==='pending', isOutgoing: true, inviteData: inv, last_message: inv.status==='pending'?'⏳ Invite pending':'Tap to chat', last_message_at: new Date().toISOString(), unread:0 }); }
	            else { mapped.push({ id: inv.id, actual_user_id: null, name: inv.email.split('@')[0]+' (invite)', email: inv.email, avatar_url: null, room_id: null, status: inv.status, isInvite: true, isOutgoing: true, inviteData: inv, last_message: '⏳ Invite pending', last_message_at: null, unread:0 }); }
	        }
	    }catch{}
	    try{
	        if(myEmail){
	            const { data: incoming } = await chatDB.from("contact_invites").select("id,email,status,invited_by").ilike("email", myEmail).eq("status","pending").limit(50);
	            for(const inv of incoming||[]){
	                if(mapped.find(m=>m.actual_user_id===inv.invited_by)) continue;
	                const { data: prof } = await chatDB.from("profiles").select("id,name,email,avatar_url").eq("id", inv.invited_by).maybeSingle();
	                mapped.push({ id: `incoming_${inv.id}`, actual_user_id: inv.invited_by, name: prof?.name||"New Invite", email: prof?.email||"", avatar_url: prof?.avatar_url||null, room_id: null, status: 'incoming', isIncomingInvite: true, inviteData: inv, inviterProfile: prof, last_message: `📩 Tap to Accept`, last_message_at: null, unread:0 });
	            }
	            const { data: acceptedIn } = await chatDB.from("contact_invites").select("id,email,status,invited_by").ilike("email", myEmail).eq("status","accepted").limit(100);
	            for(const inv of acceptedIn||[]){
	                if(mapped.find(m=>m.actual_user_id===inv.invited_by)) continue;
	                const { data: prof } = await chatDB.from("profiles").select("id,name,email,avatar_url").eq("id", inv.invited_by).maybeSingle();
	                if(prof) mapped.push({ id: prof.id, actual_user_id: prof.id, name: prof.name||"Contact", email: prof.email, avatar_url: prof.avatar_url, room_id: roomCache.get(inv.invited_by)||null, status: 'accepted', last_message: "Tap to chat", last_message_at: new Date().toISOString(), unread:0 });
	            }
	        }
	    }catch{}
	    const self = mapped.find(m=>m.isSelf); const others = mapped.filter(m=>!m.isSelf).sort((a,b)=> new Date(b.last_message_at||0).getTime() - new Date(a.last_message_at||0).getTime());
	    contacts = self? [self,...others] : others;
	    try{
	      if(browser){
	        const safe = contacts.slice(0,30).map((c:any)=>({id:c.id, actual_user_id:c.actual_user_id, name:String(c.name).slice(0,80), email:c.email, avatar_url:c.avatar_url, room_id:c.room_id, last_message_at:c.last_message_at}));
	        localStorage.setItem('recent_contacts_cache_v2', JSON.stringify(safe));
	      }
	    }catch{}
	}
	function resizeTo128(file: File): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const img = new Image(); const url = URL.createObjectURL(file);
			img.onload = () => { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128; const ctx = canvas.getContext('2d')!; const scale = Math.max(128 / img.width, 128 / img.height); const w = img.width * scale, h = img.height * scale; ctx.fillStyle='#fff'; ctx.fillRect(0,0,128,128); ctx.drawImage(img, (128-w)/2, (128-h)/2, w, h); canvas.toBlob((b) => b? resolve(b) : reject('blob fail'), 'image/webp', 0.8); URL.revokeObjectURL(url); }; img.onerror = reject; img.src = url;
		});
	}
	async function onAvatarFileChange(e: any){
		const file = e.detail?.file || e.target?.files?.[0]; const contact = e.detail?.contact || avatarTarget;
		if(!file) return; if(file.size > 5*1024*1024){ alert("Max 5MB"); return; } if(!file.type.startsWith('image/')){ alert("Image only"); return; }
		if(contact &&!contact.isSelf && contact.id!==getCurrentUserId() && avatarType!=='group'){ alert("You can only change your own photo"); return; }
		avatarPreview = URL.createObjectURL(file);
		try{ avatarUploading = true; const blob = await resizeTo128(file); const fileName = `${avatarType}_${contact?.id}_${Date.now()}.webp`; const formData = new FormData(); formData.append('file', blob); formData.append('fileName', fileName); const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData }); const json = await res.json(); if(!res.ok) throw new Error(json.error || 'Upload failed'); const publicUrl = json.url; const realId = contact.actual_user_id || contact.id; await chatDB.from('profiles').update({ avatar_url: publicUrl }).eq('id', realId); contacts = contacts.map(c=> c.id===contact.id? {...c, avatar_url: publicUrl} : c); if(selectedContact?.id === contact.id) selectedContact = {...selectedContact, avatar_url: publicUrl}; if(contact?.isSelf) currentUser = {...currentUser, avatar_url: publicUrl}; showAvatarModal = false; }catch(err:any){ alert("Upload failed: "+err.message); } finally{ avatarUploading = false; }
	}
	async function loadTemplates(){
		templateLoading=true; let localList:any[]=[]; try{ if(browser){ const raw = localStorage.getItem("templates"); if(raw) localList = JSON.parse(raw); } }catch{} templates = localList.map((t:any)=>({...t, data: typeof t.data==='string'? JSON.parse(t.data) : t.data }));
		try{ const uid = getCurrentUserId(); const res = await fetch(`/api/templates?t=${Date.now()}&user_id=${uid}`, { cache:"no-store" }); if(res.ok){ const json = await res.json(); let apiList = json.templates || json.data || json || []; if(Array.isArray(apiList) && apiList.length>0){ apiList = apiList.map((t:any)=>({...t, data: typeof t.data==='string'? JSON.parse(t.data) : t.data })); const map = new Map(); [...localList,...apiList].forEach((t:any)=>{ const k = String(t.id||t.template_code||t.name); if(!map.has(k)) map.set(k, t); }); templates = Array.from(map.values()); } } }catch{} finally{ templateLoading=false; }
	}
	function onOpenTemplate(){ showTemplateModal = true; showTemplateForm = false; loadTemplates(); }
	function handleUseTemplate(e:any){ const t = e.detail?.template || e.detail; if(!t) return; selectedTemplate = {...t, data: typeof t.data==='string'? JSON.parse(t.data) : (t.data||{}) }; showTemplateModal=false; setTimeout(()=>{ showTemplateForm=true; }, 120); }
	function handleCreateTemplate(){ showTemplateModal=false; showTemplateForm=false; const contactId = selectedContact?.actual_user_id || selectedContact?.id || ''; const groupId = selectedGroupId || ''; if(browser) window.location.href=`/templates/create?contact_id=${contactId}&group_id=${groupId}`; }
	function handleOpenDetail(tpl: any, msg: any){ let fields = tpl?.fields || tpl?.data?.fields || tpl?.values?.fields || msg?.fields || []; if(fields.length===0){ let meta = getMeta(msg); if(meta?.fields) fields = meta.fields; } detailData = { template_name: tpl.template_name || tpl.template_code || tpl.name || 'Production Report', template_code: tpl.template_code || tpl.t_code, values: tpl.values || tpl.data || {}, fields: fields, t_code: tpl.template_code || tpl.t_code, user_name: msg.sender_name || msg.sender_id || 'User', created_at: msg.created_at, }; showDetailModal = true; }
	async function sendTemplateReport(e:any){
		const { template, values } = e.detail; if(!template) return; const calculatedValues = calcAllFormulas(template, values); let realFields = template?.fields || template?.data?.fields || []; let displayLines = [`📋 *${sanitize(template.name)}*`, ``]; realFields.forEach((f:any)=>{ let key = f.field_name || f.name; let label = f.label || key; let val = calculatedValues[key]?? ""; if(val==="") return; displayLines.push(`${sanitize(label)}: ${sanitize(String(val))}`); }); const display = displayLines.join('\n'); const t_code = template.template_code || template.code || template.t_code; const installData = { type:'TEMPLATE_REPORT', template_id: template.id, template_name: template.name, template_code: t_code, values: calculatedValues, fields: realFields, created_at: new Date().toISOString() }; const fullContent = `${display}\n\n__TEMPLATE_DATA__\n${JSON.stringify(installData)}`; try{ const { data: { user: chatUser } } = await chatDB.auth.getUser(); const realUid = chatUser?.id || getCurrentUserId(); const payload:any = { t_code: sanitize(t_code), reference_template_id: template.id, data: {...calculatedValues, template_code: t_code, template_name: template.name, template_id: template.id, owner_id: realUid, user_id: realUid, created_at: new Date().toISOString() }, ts: new Date().toISOString() }; await supabaseTemplates.from("records").insert(payload); }catch(err:any){ alert("Save failed: "+err?.message); return; } showTemplateForm=false; await sendMessage({ detail: { content: fullContent } } as any); selectedTemplate=null;
	}
	async function loadMessages({ roomId, groupId, older=false }: any){
	  if(older && loadingMore) return; if(!older && isLoadingMessages) return;
	  if(older) loadingMore = true; else isLoadingMessages=true;
	  try{
	    const uid = getCurrentUserId();
	    let query = chatDB.from("messages").select("id,content,sender_id,room_id,group_id,receiver_id,created_at,status,deleted_by").order("created_at", {ascending:false}).limit(20);
	    if(older && messages.length){ const oldest = messages[0]?.created_at; if(oldest) query = query.lt("created_at", oldest); }
	    if(groupId) query = query.eq("group_id", groupId); else if(roomId) query = query.eq("room_id", roomId); else query = query.eq("sender_id", uid).eq("receiver_id", uid);
	    const { data, error } = await query;
	    if(error ||!data || data.length===0){ if(older) hasMore=false; else messages=[]; return; }
	    if(data.length < 20) hasMore=false; else hasMore=true;
	    const seen = new Set(messages.map((m:any)=>m.id));
	    const filtered = data.reverse().filter((m:any)=>!(m.deleted_by||[]).includes(uid)).filter((m:any)=>!seen.has(m.id)).map((m:any)=>({...m, is_own:m.sender_id===uid}));
	    if(older){ if(!filtered.length) return; const el = scrollEl || document.querySelector('.messages-scroll') as HTMLElement; const oldH = el?.scrollHeight || 0; messages = [...filtered,...messages]; requestAnimationFrame(()=>{ if(el) el.scrollTop = el.scrollHeight - oldH + 20; }); }
	    else { messages = filtered; setTimeout(()=>{ scrollToBottom(true); setupScrollListener(); }, 80); await markDelivered(); setTimeout(()=> markAsRead(), 300); }
	    if(!older) await subscribeToMessages({ roomId, groupId });
	  } finally { isLoadingMessages=false; loadingMore=false; }
	}
	async function markDelivered(){ const uid = getCurrentUserId(); const toMark = messages.filter((m:any)=> m.sender_id!==uid && m.status==='sent').slice(0,10); for(const m of toMark){ try{ await chatDB.from("messages").update({ status:'delivered', delivered_at: new Date().toISOString() }).eq('id', m.id); }catch{} } }
	async function markAsRead(){ const uid = getCurrentUserId(); if(!uid || (!selectedRoomId &&!selectedGroupId)) return; const toMark = messages.filter((m:any)=> m.sender_id!==uid && m.status!=='read').slice(0,20); if(!toMark.length) return; for(const m of toMark){ try{ await chatDB.from("messages").update({ status:'read', read_at: new Date().toISOString() }).eq('id', m.id); }catch{} } messages = messages.map((m:any)=> m.sender_id!==uid? {...m, status:'read'} : m); if(selectedRoomId) contacts = contacts.map(c=> c.room_id===selectedRoomId? {...c, unread:0} : c); }
	async function subscribeToMessages({ roomId, groupId }: any){
	  if(messagesChannel){ try{ await chatDB.removeChannel(messagesChannel); }catch{} messagesChannel=null; }
	  if(!roomId &&!groupId) return;
	  const realName = groupId? `group-${groupId}-${Date.now()}` : `room-${roomId}-${Date.now()}`;
	  messagesChannel=chatDB.channel(realName)
		.on("broadcast", { event: "new_msg" }, (payload:any)=>{ const newMsg = payload.payload as any; if(newMsg.sender_id===getCurrentUserId()) return; if(messages.some(m=>m.id===newMsg.id)) return; messages = [...messages, {...newMsg, is_own:false}]; updateLastMessageInList(newMsg); scrollToBottom(); setTimeout(()=> markAsRead(), 200); })
		.on("postgres_changes",{event:"INSERT",schema:"public",table:"messages", filter: groupId? `group_id=eq.${groupId}` : `room_id=eq.${roomId}` },async (payload)=>{ const newMsg = payload.new as any; const uid = getCurrentUserId(); if((newMsg.deleted_by||[]).includes(uid)) return; if(messages.some(m=>m.id===newMsg.id)) return; if(newMsg.sender_id!==uid){ try{ await chatDB.from("messages").update({ status:'delivered' }).eq('id', newMsg.id).eq('status','sent'); }catch{} } messages = [...messages, {...newMsg, is_own:newMsg.sender_id===uid}]; updateLastMessageInList(newMsg); scrollToBottom(); if(newMsg.sender_id!==uid) setTimeout(()=>markAsRead(),200); })
		.on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages", filter: groupId? `group_id=eq.${groupId}` : `room_id=eq.${roomId}`}, (payload)=>{ const updated = payload.new as any; messages = messages.map((m:any)=> m.id===updated.id? {...m, status: updated.status} : m); }).subscribe();
	}
	async function handleSendLocation(e:any){ const { latitude, longitude, url } = e.detail || {}; if(!latitude ||!longitude) return; await sendMessage({ detail: { content: `📍 Location: ${url} __LOCATION_DATA__${JSON.stringify({latitude, longitude})}` } } as any); }
	async function sendMessage(eventOrContent: any = null) {
	  if(sendingLock) return; if(Date.now() - lastSent < 150) return;
	  let content = ""; if (typeof eventOrContent === 'string') content = eventOrContent; else if (eventOrContent?.detail?.content!== undefined) content = eventOrContent.detail.content; else if (eventOrContent?.content!== undefined) content = eventOrContent.content; else content = newMessage;
	  content = sanitize(content); if (!content) return; newMessage = ""; const myId = getCurrentUserId(); if (!myId) return;
	  sendingLock = true; lastSent = Date.now();
	  const tempId = `temp_${Date.now()}`; const optimistic = { id: tempId, content, sender_id: myId, room_id: selectedRoomId, group_id: selectedGroupId, receiver_id: selectedContact?.actual_user_id || selectedContact?.id || myId, created_at: new Date().toISOString(), status: 'sent', is_own: true };
	  messages = [...messages, optimistic]; updateLastMessageInList(optimistic); scrollToBottom(true);
	  try{ if(messagesChannel) messagesChannel.send({ type: 'broadcast', event: 'new_msg', payload: optimistic }); }catch{}
	  try{
	    const payload: any = { content, sender_id: myId, status: 'sent', room_id: selectedRoomId, group_id: selectedGroupId, receiver_id: selectedContact?.actual_user_id || selectedContact?.id || myId };
	    if(selectedGroupId) payload.room_id = null; if(selectedRoomId) payload.group_id = null; if(!selectedRoomId &&!selectedGroupId){ payload.room_id = null; payload.group_id = null; }
	    const { data: inserted, error } = await chatDB.from('messages').insert(payload).select("id,content,sender_id,room_id,group_id,receiver_id,created_at,status").single();
	    if (error) throw error; messages = messages.map((m:any) => m.id === tempId? {...inserted, is_own: true } : m); updateLastMessageInList(inserted);
	  }catch(err:any){ messages = messages.filter((m:any) => m.id!== tempId); newMessage = content; } finally { sendingLock = false; }
	}
	async function getOrCreateRoom(otherId: string){
		if(!otherId) return null; const uid = getCurrentUserId(); if(!uid || otherId===uid) return null; if(roomCache.has(otherId)) return roomCache.get(otherId)!;
		try{ const { data } = await chatDB.from("rooms").select("id").eq("user1_id", uid).eq("user2_id", otherId).maybeSingle(); if(data?.id){ roomCache.set(otherId, data.id); return data.id; } }catch{}
		try{ const { data } = await chatDB.from("rooms").select("id").eq("user1_id", otherId).eq("user2_id", uid).maybeSingle(); if(data?.id){ roomCache.set(otherId, data.id); return data.id; } }catch{}
		try{ const { data } = await chatDB.from("rooms").insert({user1_id:uid, user2_id:otherId}).select("id").single(); if(data?.id){ roomCache.set(otherId, data.id); return data.id; } }catch{}
		return null;
	}
	async function handleContactLoad(contact:any){
	  if(!contact) return; if(contact.isOutgoing || contact.isInvite){ selectedInvite = contact.inviteData || contact; showInviteModal = true; return; } if(contact.isIncomingInvite){ selectedIncoming = contact; showIncomingModal = true; return; }
	  const contactUserId = contact.actual_user_id || contact.id; if(!contactUserId) return; if(contactUserId === getCurrentUserId()){ selectedRoomId = null; selectedGroupId = null; selectedGroup = null; selectedContact = contact; hasMore=true; await loadMessages({roomId:null, groupId:null}); return; }
	  let roomId = contact.room_id || roomCache.get(contactUserId) || null; if(!roomId){ roomId = await getOrCreateRoom(contact.actual_user_id||contact.id); if(roomId){ contacts = contacts.map(c=> c.id===contact.id? {...c, room_id: roomId} : c); } }
	  if(roomId){ contacts = contacts.map(c=> c.room_id===roomId? {...c, unread:0} : c); selectedRoomId = roomId; selectedGroupId = null; selectedGroup = null; selectedContact = contact; hasMore=true; await loadMessages({roomId, groupId:null}); } else { selectedRoomId = null; selectedGroupId = null; selectedGroup = null; selectedContact = contact; hasMore=true; messages=[]; }
	}
	function onSelectGroup(group:any){ if(!group?.id) return; selectedContact=null; selectedRoomId=null; selectedGroup={...group}; selectedGroupId=group.id; hasMore=true; loadGroupDetails(group.id); }
	async function loadGroupDetails(groupId:string){ if(!groupId) return; try{ const { data }=await chatDB.from("chat_group_members").select(`users:user_id(id,name,email,avatar_url)`).eq("group_id",groupId).limit(200); groupMembers=(data?? []).map((m:any)=>m.users).filter(Boolean); }catch{} await loadMessages({roomId:null, groupId}); }
	function handleMessageLongPress(msg:any, event:any){ longPressTimer = setTimeout(()=>{ selectedMessageForOptions = msg; messageOptionsPos = { x: event.clientX||0, y: event.clientY||0 }; showMessageOptions = true; }, 500); }
	function handleMessagePressEnd(){ if(longPressTimer) clearTimeout(longPressTimer); }
	function handleReply(msg:any){ replyingTo = msg; showMessageOptions = false; }
	function handleForward(msg:any){ forwardMessage = msg; showForwardModal = true; showMessageOptions = false; }
	async function handleForwardToContact(contact:any){ if(!forwardMessage) return; const roomId = contact.room_id || await getOrCreateRoom(contact.actual_user_id || contact.id); if(!roomId) return; await chatDB.from("messages").insert({ sender_id: getCurrentUserId(), content: sanitize(`Forwarded: ${forwardMessage.content}`), room_id: roomId, receiver_id: contact.actual_user_id || contact.id, status:'sent' }); showForwardModal = false; forwardMessage = null; }
	function handleBackToList(){ selectedContact = null; selectedGroup = null; selectedRoomId = null; selectedGroupId = null; messages = []; chatMode='chat'; if(messagesChannel) { try{ chatDB.removeChannel(messagesChannel); }catch{} messagesChannel=null; } }
	async function handleInvite(event: any){ const { inviteId, action }=event.detail; if(!['accepted','rejected'].includes(action)) return; await chatDB.from('contact_invites').update({status:action}).eq('id',inviteId); await loadContacts(true); }
	async function handleDeleteContact(e:any){
	  const c = e.detail || e; if(!c) return; const isGroup = groups.some((g:any)=> g.id===c.id);
	  if(!confirm(isGroup? `Delete group "${c.name}"?` : `Delete "${c.name}"?`)) return;
	  if(isGroup){ await chatDB.from("chat_group_members").delete().eq("group_id", c.id); await chatDB.from("messages").delete().eq("group_id", c.id); await chatDB.from("chat_groups").delete().eq("id", c.id); groups = groups.filter((x:any)=> x.id!== c.id); if(selectedGroup?.id===c.id){ selectedGroup=null; selectedGroupId=null; messages=[]; } return; }
	  const realId = c.actual_user_id || c.id; const rId = c.room_id || roomCache.get(realId);
	  if(rId){ await chatDB.from("messages").delete().eq("room_id", rId); await chatDB.from("rooms").delete().eq("id", rId); }
	  if(c.inviteData?.id){ await chatDB.from("contact_invites").delete().eq("id", c.inviteData.id); }
	  roomCache.delete(realId); contacts = contacts.filter((x:any)=> x.id!== c.id && x.actual_user_id!==realId);
	  if(selectedContact?.id===c.id){ selectedContact=null; selectedRoomId=null; messages=[]; } showAvatarModal=false; await loadContacts(true);
	}
   	async function acceptIncoming(){ if(!selectedIncoming) return; const inv = selectedIncoming.inviteData; await chatDB.from('contact_invites').update({status:'accepted'}).eq('id', inv.id); const roomId = await getOrCreateRoom(inv.invited_by); showIncomingModal = false; await loadContacts(true); const c = contacts.find(x=>x.actual_user_id===inv.invited_by); if(c) await handleContactLoad({...c, room_id: roomId}); }
	async function rejectIncoming(){ if(!selectedIncoming) return; await chatDB.from('contact_invites').update({status:'rejected'}).eq('id', selectedIncoming.inviteData.id); showIncomingModal = false; await loadContacts(true); }
	async function createContact(){
	    const raw = contactEmail.trim().toLowerCase(); if(!raw) return; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)){ alert("Invalid email"); return; } if((currentUser?.email||"").toLowerCase()===raw){ alert("Cannot add yourself"); return; } invitingUser=true;
	    try{ const uid = getCurrentUserId(); const { error } = await chatDB.from('contact_invites').insert({email: raw, invited_by: uid, status: 'pending', token: crypto.randomUUID()}).select().single(); if(error) throw error; showContactForm=false; contactEmail=""; await loadContacts(true); }catch(e:any){ alert("Invite failed: "+(e.message||'').slice(0,80)); }finally{ invitingUser=false; }
	}
	async function createGroup(){
	  const clean = sanitize(groupName).slice(0,50); if(clean.length<3){ alert("Min 3 chars"); return; } const uid = getCurrentUserId(); if(!uid) return;
	  try{ const { data: g1 } = await chatDB.from("chat_groups").insert({name: clean}).select("id,name").single(); await chatDB.from("chat_group_members").insert({group_id: g1.id, user_id: uid}); groupName=""; showGroupForm=false; await loadGroups(); const ng = groups.find((gr:any)=>gr.id===g1.id); if(ng) onSelectGroup(ng); }catch(err:any){ alert("Create failed: "+(err.message||'')); }
	}
	async function openAddMembers(group:any){ groupToAddMembers = group; showAddMembersModal = true; }
	async function addMemberToGroup(contact:any){
	  if(!groupToAddMembers ||!contact?.actual_user_id) return; if(contact.isSelf || addMemberLoading) return; addMemberLoading = true;
	  try{ await chatDB.from("chat_group_members").insert({ group_id: groupToAddMembers.id, user_id: contact.actual_user_id }); if(selectedGroupId===groupToAddMembers.id) await loadGroupDetails(groupToAddMembers.id); showAddMembersModal = false; }catch(e:any){ if(e.code==='23505') alert("Already in group"); else alert("Add failed"); } finally { addMemberLoading = false; }
	}
</script>

<div class="main-container" class:mobile-chat-open={isMobileView && (selectedContact || selectedGroup)}>
	<div class="sidebar-wrapper" class:hidden-mobile={isMobileView && (selectedContact || selectedGroup)}>
		<div class="sidebar-scroll">
			<ChatSidebar {groups} {contacts} {selectedGroup} {selectedContact}
  onSelectContact={(c:any)=>{ const detail = c?.detail || c; if(!detail) return; selectedContact={...detail}; selectedGroup=null; selectedGroupId=null; selectedRoomId=detail.room_id||null; handleContactLoad(detail); }}
  onSelectGroup={(e:any)=>{ const g=e?.detail||e; if(g) onSelectGroup(g); }}
  onNewGroup={() => showGroupForm=true}
  onNewContact={() => showContactForm=true}
  onHandleInvite={handleInvite}
  onDeleteContact={handleDeleteContact}
  onLogout={async () => { await chatDB.auth.signOut(); if(browser) location.reload(); }}
  onArchived={handleArchivedAction}
  onStarred={handleStarredAction}
  onSettings={handleSettingsAction}
  onAvatarClick={(e:any)=>{ const c = e.detail?.contact || e.detail; const t = e.detail?.type || 'contact'; openAvatarModal(c,t); }}
  onUpdateAvatar={onAvatarFileChange}
/>
		</div>
		<nav class="bottom-fixed">
		  <button class:active={bottomTab==='chat'} onclick={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button>
		  <button class:active={bottomTab==='report'} onclick={()=>goBottom('report')}><span class="b-icon">📋</span><small>Report</small></button>
		  <button class:active={bottomTab==='user'} onclick={()=>goBottom('user')}><span class="b-icon">👤</span><small>User</small></button>
		</nav>
	</div>
	<section class="chat-area" class:show-mobile={isMobileView && (selectedContact || selectedGroup)}>
		{#if selectedContact || selectedGroup}
			<div class="chat-header-fixed"><ChatHeader title={selectedContact?.name?? selectedGroup?.name?? ''} subtitle={selectedContact? (isUserOnline(selectedContact?.actual_user_id||selectedContact?.id)? "Online" : "Tap for photo") : `${groupMembers.length} members`} avatarUrl={selectedContact?.avatar_url?? selectedGroup?.avatar_url?? ''} showBack={isMobileView} isGroup={!!selectedGroup} onBack={handleBackToList} onAction={(e)=>handleHeaderAction(e.detail)} /></div>
			<div class="filter-fixed"><div class="mode-row"><div class="dd-wrap" use:clickOutside={()=>openMode=false}><button class="mode-btn" onclick={(e)=>{e.stopPropagation(); openMode=!openMode}}><span>{chatMode==='chat'?'💬':chatMode==='template'?'📋':'📅'}</span><b>{chatMode==='chat'?'Chat':chatMode==='template'?'Template':'Meeting'}</b><span class="arr">{openMode?'▲':'▼'}</span></button>{#if openMode}<div class="dd"><button class:active={chatMode==='chat'} onclick={()=>{chatMode='chat'; openMode=false; openList=false; selectedTemplate=null; showArchived=false; showStarred=false;}}>💬 Chat</button><button class:active={chatMode==='template'} onclick={()=>{chatMode='template'; openMode=false;}}>📋 Template</button><button class:active={chatMode==='meeting'} onclick={()=>{chatMode='meeting'; openMode=false;}}>📅 Meeting</button></div>{/if}</div>{#if chatMode!=='chat'}<div class="dd-wrap second" use:clickOutside={()=>openList=false}><button class="list-btn" onclick={(e)=>{e.stopPropagation(); openList=!openList}}><span class="cut">{#if chatMode==='template'}{selectedTemplate?.name || 'Select Template'}{:else}{selectedMeeting?.title || 'Select Meeting'}{/if}</span><span class="arr">{openList?'▲':'▼'}</span></button>{#if openList}<div class="dd dd2">{#if chatMode==='template'}{#each templates as t}<button class:active={selectedTemplate?.id===t.id} onclick={()=>{selectedTemplate=t; openList=false;}}><b>{t.name}</b><small>{t.template_code}</small></button>{:else}<div class="empty">No templates</div>{/each}{:else}{#each meetings as m}<button class:active={selectedMeeting?.id===m.id} onclick={()=>{selectedMeeting=m; openList=false;}}><b>{m.title}</b><small>{m.date}</small></button>{:else}<div class="empty">No meetings</div>{/each}{/if}</div>{/if}</div>{#if chatMode==='template' && selectedTemplate}<button class="use-btn" onclick={()=>{handleUseTemplate({detail:{template:selectedTemplate}})}}>Use</button>{/if}{/if}</div></div>
			<div class="filter-info">Showing: {showArchived? 'Archived' : showStarred? 'Starred' : chatMode}{selectedTemplate? ` - ${selectedTemplate.name}`:''} | {filteredMessages.length}/{messages.length} {#if loadingMore}• Loading...{/if}</div>
			<div class="messages-scroll" bind:this={scrollEl}><MessageList messages={filteredMessages} {selectedContact} {selectedGroup} currentUser={currentUser} selectedUser={currentUser} {replyingTo} onReply={handleReply} onForward={handleForward} onLongPress={handleMessageLongPress} onPressEnd={handleMessagePressEnd} onOpenDetail={(e)=>handleOpenDetail(e.detail.template, e.detail.message)} /></div>
			{#if replyingTo}<div class="reply-preview"><span>Replying to: {replyingTo.content?.slice(0,50)}...</span><button onclick={()=>replyingTo=null}>✕</button></div>{/if}
			<div class="chat-input-fixed"><ChatInput {uploadingFiles} {groupMembers} onSendMessage={sendMessage} onOpenTemplate={onOpenTemplate} onSendLocation={handleSendLocation}/></div>
		{:else}<div class="empty-area"><div class="empty-icon">💬</div><h2>Chat</h2><p>Select a chat to start messaging</p></div>{/if}
	</section>
</div>

{#if showAvatarModal}
<div class="modal-bg"><button class="modal-bg-btn" onclick={()=>showAvatarModal=false} aria-label="close"></button>
<div class="modal" style="width:380px; max-height:90vh; overflow-y:auto; background:#111b21; border:1px solid #2a3942;">
  <div style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0; color:#e9edef;">{avatarType==='group'? '👥 Group Info' : avatarTarget?.isSelf? '💾 Your Profile' : '👤 Contact Info'}</h3><button style="background:#2a3942; border:none; color:#8696a0; width:32px; height:32px; border-radius:50%; cursor:pointer;" onclick={()=>showAvatarModal=false}>✕</button></div>
  <div style="display:flex; flex-direction:column; align-items:center; gap:10px; padding:10px 0 14px;">
    <img src={avatarPreview || avatarTarget?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarTarget?.name || 'User')}&background=00a884&color=fff&size=300`} alt="avatar" loading="lazy" decoding="async" style="width:170px;height:170px;border-radius:50%;object-fit:cover;border:4px solid #00a884;" />
    <b style="color:#e9edef; font-size:20px;">{avatarTarget?.name || 'User'}</b><span style="color:#8696a0; font-size:13px;">{avatarTarget?.email || ''}</span>
    {#if avatarType==='contact' && commonGroups.length>0}
      <div style="width:100%; margin-top:12px; background:#202c33; border-radius:8px; padding:10px;">
        <small style="color:#00a884; font-weight:700;">Common Groups ({commonGroups.length})</small>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          {#each commonGroups as g}
            <div style="display:flex; align-items:center; gap:8px; background:#2a3942; padding:6px 10px; border-radius:6px;">
              <img src={g.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=00a884&color=fff`} alt="" style="width:28px;height:28px;border-radius:50%;" />
              <span style="color:#e9edef; font-size:13px;">{g.name}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {#if avatarType==='group'}
      <div style="width:100%; margin-top:12px; background:#202c33; border-radius:8px; padding:10px;">
        <small style="color:#00a884; font-weight:700;">Members ({groupMembers.length})</small>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px; max-height:150px; overflow:auto;">
          {#each groupMembers as m}
            <div style="display:flex; align-items:center; gap:8px; background:#2a3942; padding:6px 10px; border-radius:6px;">
              <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name||'U')}&background=00a884&color=fff`} alt="" style="width:28px;height:28px;border-radius:50%;" />
              <span style="color:#e9edef; font-size:13px;">{m.name}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  <div class="modal-btns" style="margin-top:14px;"><button class="btn-secondary" onclick={()=>showAvatarModal=false}>Close</button>{#if avatarTarget?.isSelf || avatarType==='group'}<label class="btn-primary" style="text-align:center;cursor:pointer;">{#if avatarUploading}Uploading...{:else}Change Photo{/if}<input type="file" accept="image/*" hidden disabled={avatarUploading} onchange={onAvatarFileChange} /></label>{:else}<button class="btn-primary" onclick={()=>{ showAvatarModal=false; if(avatarTarget) handleContactLoad(avatarTarget); }}>💬 Message</button>{/if}</div>
</div></div>{/if}

{#if showContactForm}<div class="modal-bg"><button class="modal-bg-btn" onclick={()=>showContactForm=false} aria-label="close"></button><div class="modal"><h3>New Contact</h3><input class="modal-input" bind:value={contactEmail} placeholder="Contact Email" autocomplete="email" maxlength="100" /><div class="modal-btns"><button class="btn-primary" onclick={createContact}>{invitingUser?'Inviting...':'Invite'}</button><button class="btn-secondary" onclick={() => showContactForm=false}>Cancel</button></div></div></div>{/if}
{#if showGroupForm}<div class="modal-bg"><button class="modal-bg-btn" onclick={()=>showGroupForm=false} aria-label="close"></button><div class="modal"><h3>👥 Create Group</h3><input class="modal-input" bind:value={groupName} placeholder="Group Name" maxlength="50" /><div class="modal-btns"><button class="btn-secondary" onclick={()=>showGroupForm=false}>Cancel</button><button class="btn-primary" onclick={createGroup}>Create</button></div></div></div>{/if}
{#if showTemplateModal}<TemplatePopup templates={templates} loading={templateLoading} on:close={()=>showTemplateModal=false} on:use={handleUseTemplate} on:new={handleCreateTemplate} on:create={handleCreateTemplate} on:deleted={(e)=>{ templates=templates.filter(t=>t.id!==e.detail.template.id); }} />{/if}
{#if showTemplateForm && selectedTemplate}<div style="position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);"><TemplateForm template={selectedTemplate} on:close={()=>{ showTemplateForm=false; selectedTemplate=null; }} onsubmit={sendTemplateReport} /></div>{/if}

{#if showIncomingModal && selectedIncoming}
<div class="modal-bg"><button class="modal-bg-btn" onclick={()=>showIncomingModal=false} aria-label="close"></button><div class="modal"><h3>📩 New Invite</h3><p style="color:#e9edef;">{selectedIncoming.inviterProfile?.name || selectedIncoming.email} invited you</p><div class="modal-btns"><button class="btn-primary" onclick={acceptIncoming}>Accept</button><button class="btn-secondary" onclick={rejectIncoming}>Reject</button></div></div></div>
{/if}
{#if showInviteModal && selectedInvite}
<div class="modal-bg"><button class="modal-bg-btn" onclick={()=>showInviteModal=false} aria-label="close"></button><div class="modal"><h3>Invite Status</h3><p style="color:#e9edef;">Invite to {selectedInvite.email} is {selectedInvite.status}</p><div class="modal-btns"><button class="btn-secondary" onclick={()=>showInviteModal=false}>Close</button></div></div></div>
{/if}

<style>
	.main-container{display:flex;height:100dvh;max-height:100dvh;width:100vw;background:#111b21;overflow:hidden;font-family:Inter,Segoe UI,sans-serif;}
	.sidebar-wrapper{width:30%;min-width:300px;max-width:420px;display:flex;flex-direction:column;border-right:1px solid #222d34;background:#111b21;overflow:hidden;height:100dvh;}
	.sidebar-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;}
	.bottom-fixed{flex-shrink:0;height:68px;min-height:68px;background:#202c33;border-top:1px solid #2a3942;display:flex;justify-content:space-around;align-items:center;z-index:20;}
	.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;color:#8696a0;cursor:pointer;flex:1;padding:6px;}
	.bottom-fixed button.active{color:#00a884;}.b-icon{font-size:20px;line-height:1;}.bottom-fixed small{font-size:11px;font-weight:600;}
	.chat-area{flex:1;display:flex;flex-direction:column;background:#0b141a;min-width:0;height:100dvh;max-height:100dvh;overflow:hidden;}
	.chat-header-fixed{flex-shrink:0;z-index:10;}.filter-fixed{flex-shrink:0;background:#f0f2f5;border-bottom:1px solid #d1d7db;padding:6px 10px;z-index:9;}
	.mode-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}.dd-wrap{position:relative;}
	.mode-btn{background:white;border:1px solid #d1d7db;padding:6px 10px;border-radius:6px;display:flex;gap:6px;align-items:center;cursor:pointer;font-size:12px;}
	.list-btn{background:white;border:1px solid #d1d7db;padding:6px 10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;font-size:12px;min-width:180px;max-width:260px;}
	.cut{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;}.second{flex:1;min-width:150px;}.arr{color:#667781;font-size:10px;}
	.dd{position:absolute;left:0;top:38px;background:white;border:1px solid #d1d7db;border-radius:10px;z-index:300;min-width:220px;max-height:280px;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,0.15);}
	.dd2{width:100%;min-width:100%;}.dd button{width:100%;border:none;background:transparent;padding:8px 10px;text-align:left;display:flex;flex-direction:column;gap:2px;cursor:pointer;border-bottom:1px solid #f5f5f5;}
	.dd button:hover{background:#f0f2f5;}.dd button.active{background:#e7fce3;}.dd b{font-size:13px;color:#111b21;}.dd small{font-size:11px;color:#667781;}.empty{padding:12px;font-size:13px;color:#667781;}
	.use-btn{background:#00a884;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;}
	.filter-info{font-size:10px;color:#8696a0;padding:3px 12px;background:#202c33;flex-shrink:0;}
	.messages-scroll{ flex:1; min-height:0; overflow-y:auto; overflow-x:hidden; display:block; background:#0b141a; background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"); background-blend-mode:soft-light; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; touch-action:pan-y; }
	.chat-input-fixed{flex-shrink:0;background:#202c33;z-index:10;}
	.empty-area{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#222e35;color:#8696a0;gap:8px;}
	.empty-icon{font-size:64px;opacity:0.5;}.empty-area h2{color:#e9edef;font-size:32px;font-weight:300;margin:10px 0 0;}
	.reply-preview{display:flex;justify-content:space-between;align-items:center;background:#202c33;padding:8px 12px;border-left:4px solid #00a884;color:#8696a0;font-size:13px;flex-shrink:0;}
	.reply-preview button{background:none;border:none;color:#8696a0;cursor:pointer;font-size:16px;}
	.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;}
	.modal-bg-btn{position:absolute;inset:0;background:transparent;border:none;}
	.modal{background:#233138;padding:24px;border-radius:12px;width:400px;display:flex;flex-direction:column;gap:16px;position:relative;z-index:1;}
	.modal h3{color:#e9edef;margin:0;font-size:18px;}
	.modal-input{background:#2a3942;color:#e9edef;border:1px solid #374045;padding:12px;border-radius:8px;width:100%;outline:none;}
	.modal-btns{display:flex;gap:8px;}.btn-primary{flex:1;background:#00a884;color:#111b21;border:none;padding:11px;border-radius:8px;font-weight:700;cursor:pointer;}.btn-secondary{flex:1;background:#2a3942;color:#e9edef;border:none;padding:11px;border-radius:8px;cursor:pointer;}
	@media (max-width:768px){
		.sidebar-wrapper{width:100%;max-width:100%;}.sidebar-wrapper.hidden-mobile{display:none;}
		.chat-area{display:none;}.chat-area.show-mobile{display:flex;position:fixed;inset:0;z-index:50;width:100vw;height:100dvh;max-height:100dvh;}
		.mode-row{flex-direction:column;align-items:stretch;gap:6px;}.list-btn{max-width:100%;min-width:100%;}.second{width:100%;}.filter-fixed{padding:5px 8px;}
	}
</style>