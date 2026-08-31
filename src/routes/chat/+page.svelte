<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { browser } from "$app/environment";
	import { supabase as chatDB, supabaseTemplates } from '$lib/supabase';
	import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
	import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
	import MessageList from "$lib/components/chat/MessageList.svelte";
	import ChatInput from "$lib/components/chat/ChatInput.svelte";
	import TemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
	import TemplateForm from "$lib/components/templates/form/TemplateForm.svelte";

	let { data } = $props();
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
	let meetings = $state<any[]>([
		{id:'1', title:'Daily Standup', date:'Today 10 AM'},
		{id:'2', title:'Client Call', date:'Tomorrow 2 PM'}
	]);
	let bottomTab = $state('chat');

	function isTemplateMsg(m:any){ return m.content?.includes('__TEMPLATE_DATA__') || m.content?.startsWith('📋'); }
	function isMeetingMsg(m:any){ return m.content?.includes('__MEETING_DATA__'); }
	function getMeta(m:any){
		try{
			let p = m.content?.split('__TEMPLATE_DATA__');
			if(p?.length>1) return JSON.parse(p[1]);
		}catch{}
		return null;
	}

	function evalFormulaChat(formulaStr: string, vals: Record<string,any>): string {
		if(!formulaStr) return "0.00";
		try{
			let expr = formulaStr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/—/g,'-');
			expr = expr.replace(/\{([^}]+)\}/g, (_, k)=>{
				let key = k.trim();
				let v = vals[key]?? vals[key.toLowerCase()]?? vals[key.toLowerCase().replace(/\s+/g,"_")]?? "0";
				let num = Number(String(v).replace(/[^0-9.\-]/g,''));
				return isNaN(num)? "0" : String(num);
			});
			expr = expr.replace(/%/g,'');
			if(/[^0-9+\-*/().\s]/.test(expr)) return "0.00";
			let r = Function('"use strict";return ('+expr+')')();
			if(r===undefined || isNaN(r) ||!isFinite(r)) return "0.00";
			return Number(r).toFixed(2);
		}catch{ return "0.00"; }
	}
	function calcAllFormulas(template: any, vals: Record<string,any>){
		let out = {...vals};
		let fields = template?.fields || template?.data?.fields || selectedTemplate?.data?.fields || [];
		for(let f of fields){
			if(f.type==='formula' && f.formula){
				out[f.field_name] = evalFormulaChat(f.formula, out);
			}
		}
		return out;
	}

	let filteredMessages = $derived.by(()=>{
		if(chatMode==='template'){
			let list = messages.filter(isTemplateMsg);
			if(selectedTemplate){
				return list.filter((m:any)=>{
					let meta = getMeta(m);
					if(meta){
						if(meta.template_id===selectedTemplate.id) return true;
						if(meta.template_code===selectedTemplate.template_code) return true;
						if(meta.template_name===selectedTemplate.name) return true;
					}
					return m.content?.includes(selectedTemplate.template_code) || m.content?.includes(selectedTemplate.name);
				});
			}
			return list;
		}
		if(chatMode==='meeting'){
			let list = messages.filter(isMeetingMsg);
			if(selectedMeeting) return list.filter((m:any)=> m.content?.includes(selectedMeeting.id) || m.content?.includes(selectedMeeting.title));
			return list;
		}
		return messages.filter((m:any)=>!isTemplateMsg(m) &&!isMeetingMsg(m));
	});

	function getCurrentUserId(){ return currentUser?.id || data?.user?.id || ''; }
	function clickOutside(node: HTMLElement, callback: () => void) {
		if (!browser) return { destroy() {} };
		const handleClick = (e: MouseEvent) => { if (!node.contains(e.target as Node)) setTimeout(callback, 10); }
		document.addEventListener('mousedown', handleClick, true)
		return { destroy() { document.removeEventListener('mousedown', handleClick, true) } }
	}
	function checkMobile(){ if (!browser) return; isMobileView = window.innerWidth < 768; }

	async function handleHeaderAction(action: string){
		const uid = getCurrentUserId();
		if(action === 'info'){ if(selectedGroup) openAvatarModal(selectedGroup,'group'); else if(selectedContact) openAvatarModal(selectedContact,'contact'); return; }
		if(action === 'mute'){ const id = selectedRoomId || selectedGroupId || selectedContact?.id; if(!id) return; if(mutedRooms.has(id)) mutedRooms.delete(id); else mutedRooms.add(id); mutedRooms = new Set(mutedRooms); if(browser) localStorage.setItem('mutedRooms', JSON.stringify([...mutedRooms])); return; }
		if(action === 'clear'){
			if(selectedGroup){ if(!confirm("Clear chat only for you?")) return; const { data: all } = await chatDB.from("messages").select("id,deleted_by").eq("group_id", selectedGroupId); for(const m of all||[]){ const del = [...(m.deleted_by||[]), uid]; await chatDB.from("messages").update({ deleted_by: del }).eq("id", m.id); } messages = []; }
			else { if(!confirm("Clear chat only for you?")) return; if(selectedRoomId){ const { data: all } = await chatDB.from("messages").select("id,deleted_by").eq("room_id", selectedRoomId); for(const m of all||[]){ const del = [...(m.deleted_by||[]), uid]; await chatDB.from("messages").update({ deleted_by: del }).eq("id", m.id); } } messages = []; } return;
		}
		if(action === 'exit'){ if(!selectedGroup) return; if(!confirm(`Exit group "${selectedGroup.name}"?`)) return; await chatDB.from("chat_group_members").delete().eq("group_id", selectedGroupId).eq("user_id", uid); groups = groups.filter(g=> g.id!== selectedGroupId); messages = []; selectedGroup = null; selectedGroupId = null; return; }
		if(action === 'block'){ if(!selectedContact || selectedContact.isSelf) return; if(!confirm(`Block ${selectedContact.name}?`)) return; contacts = contacts.filter(c=> c.id!== selectedContact.id); messages = []; selectedContact = null; selectedRoomId = null; return; }
	}

	onMount(async () => {
		if (!browser) return;
		checkMobile();
		window.addEventListener('resize', checkMobile);
		try{ mutedRooms = new Set(JSON.parse(localStorage.getItem('mutedRooms') || '[]')); }catch{}
		const { data: { user } } = await chatDB.auth.getUser();
		if(user){
			currentUser = {...(data?.user||{}),...user, avatar_url: user.user_metadata?.avatar_url || data?.user?.avatar_url || null };
			try{
				const { data: prof } = await chatDB.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
				if(prof?.avatar_url) currentUser = {...currentUser, avatar_url: prof.avatar_url};
			}catch{}
		} else if(data?.user?.id){
			currentUser = data.user;
		}
		const uid = getCurrentUserId(); if(!uid) return;
		await Promise.all([loadGroups(), loadContacts(), setupPresence()]);
	});
	onDestroy(async () => { if (browser) window.removeEventListener('resize', checkMobile); await cleanupRealtime(); });

	function resizeTo128(file: File): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const img = new Image(); const url = URL.createObjectURL(file);
			img.onload = () => {
				const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
				const ctx = canvas.getContext('2d')!; const scale = Math.max(128 / img.width, 128 / img.height);
				const w = img.width * scale, h = img.height * scale; const x = (128 - w) / 2, y = (128 - h) / 2;
				ctx.fillStyle = '#fff'; ctx.fillRect(0,0,128,128); ctx.drawImage(img, x, y, w, h);
				canvas.toBlob((b) => b? resolve(b) : reject('blob fail'), 'image/webp', 0.8); URL.revokeObjectURL(url);
			}; img.onerror = reject; img.src = url;
		});
	}
	function openAvatarModal(target: any, type: 'contact'|'group'){ avatarTarget = target; avatarType = type; avatarPreview = target?.avatar_url || null; showAvatarModal = true; }
	async function onAvatarFileChange(e: any){
		if(avatarType==='contact' &&!avatarTarget?.isSelf){
			alert("You can only view other user's photo");
			return;
		}
		const file = e.target.files?.[0]; if(!file) return; if(file.size > 5*1024*1024){ alert("Max 5MB"); return; }
		avatarPreview = URL.createObjectURL(file);
		try{
			avatarUploading = true; const blob = await resizeTo128(file);
			const fileName = `${avatarType}_${avatarTarget?.id}_${Date.now()}.webp`;
			const formData = new FormData(); formData.append('file', blob); formData.append('fileName', fileName);
			const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData }); const json = await res.json();
			if(!res.ok) throw new Error(json.error || 'Upload failed'); const publicUrl = json.url;
			if(avatarType === 'contact'){
				const realId = avatarTarget.actual_user_id || avatarTarget.id;
				await chatDB.from('profiles').update({ avatar_url: publicUrl }).eq('id', realId);
				contacts = contacts.map(c=> c.id===avatarTarget.id? {...c, avatar_url: publicUrl} : c);
				if(selectedContact?.id === avatarTarget.id) selectedContact = {...selectedContact, avatar_url: publicUrl};
				if(avatarTarget?.isSelf) currentUser = {...currentUser, avatar_url: publicUrl};
			}
			else { await chatDB.from('chat_groups').update({ avatar_url: publicUrl }).eq('id', avatarTarget.id); groups = groups.map(g=> g.id===avatarTarget.id? {...g, avatar_url: publicUrl} : g); if(selectedGroup?.id === avatarTarget.id) selectedGroup = {...selectedGroup, avatar_url: publicUrl}; }
			showAvatarModal = false;
		}catch(err:any){ alert("Upload failed: "+err.message); } finally{ avatarUploading = false; }
	}

	async function loadTemplates(){
	  templateLoading=true;
	  try{
	    const uid = getCurrentUserId();
	    const contactId = selectedContact?.actual_user_id || selectedContact?.id;
	    const groupId = selectedGroupId;
	    let url = `/api/templates?t=${Date.now()}&user_id=${uid}`;
	    if(contactId) url += `&contact_id=${contactId}`;
	    if(groupId) url += `&group_id=${groupId}`;
	    const res = await fetch(url, { cache:"no-store" });
	    let list:any[] = [];
	    if(res.ok){
	      const json = await res.json();
	      list = json.templates || json.data || json || [];
	      if(!Array.isArray(list)) list=[];
	    }
	    try{
	      const local = JSON.parse(localStorage.getItem("templates")||"[]");
	      local.forEach((t:any)=>{
	        if(!list.find((x:any)=> String(x.id)===String(t.id))){
	          list.push({...t, template_code: t.template_code||t.code, data: t.data||{ fields: t.fields||[] }});
	        }
	      });
	    }catch{}
	    templates = list.map((t:any)=>({...t, data: typeof t.data==='string'? JSON.parse(t.data) : t.data }));
	  }catch{
	    try{
	      const local = JSON.parse(localStorage.getItem("templates")||"[]");
	      templates = local.map((t:any)=>({...t, data: t.data||{ fields: t.fields||[] }}));
	    }catch{ templates=[]; }
	  } finally{ templateLoading=false; }
	}

	function onOpenTemplate(){
	  if(!selectedContact &&!selectedGroup){ alert("Select a contact first"); return; }
	  loadTemplates();
	  showTemplateForm=false;
	  showTemplateModal = true;
	}

	function handleUseTemplate(e:any){
		const t = e.detail?.template || e.detail; if(!t) return;
		try{ selectedTemplate = JSON.parse(JSON.stringify(t)); if(typeof selectedTemplate.data==='string'){ try{ selectedTemplate.data = JSON.parse(selectedTemplate.data); }catch{} } }catch{ selectedTemplate = {...t, data: typeof t.data==='string'? JSON.parse(t.data||'{}') : (t.data||{}) }; }
		showTemplateModal=false; setTimeout(()=>{ showTemplateForm=true; }, 120);
	}

	function handleCreateTemplate(){
	  showTemplateModal=false;
	  showTemplateForm=false;
	  const contactId = selectedContact?.actual_user_id || selectedContact?.id || '';
	  const groupId = selectedGroupId || '';
	  if(browser) window.location.href=`/templates/create?contact_id=${contactId}&group_id=${groupId}`;
	}

	function handleOpenDetail(tpl: any, msg: any){ detailData = { template_name: tpl.template_name || tpl.template_code || 'Production Report', template_code: tpl.template_code, values: tpl.values || tpl.data || {}, t_code: tpl.template_code, user_name: msg.sender_name || msg.profiles?.name || currentUser?.email || 'User', created_at: msg.created_at, }; showDetailModal = true; }

					async function sendTemplateReport(e:any){
		const { template, values } = e.detail; if(!template) return;
		const calculatedValues = calcAllFormulas(template, values);
		let displayLines = [`📋 *${template.name}*`, ``];
		Object.entries(calculatedValues).forEach(([k,v])=>{ displayLines.push(`${k}: ${v || '0.00'}`); });
		const display = displayLines.join('\n');
		const t_code = template.template_code || template.code || template.t_code;
		const installData = { type:'TEMPLATE_REPORT', template_id: template.id, template_name: template.name, template_code: t_code, values: calculatedValues, created_at: new Date().toISOString() };
		const fullContent = `${display}\n\n__TEMPLATE_DATA__\n${JSON.stringify(installData)}`;
		try{
		  // get uid from both projects - chatDB is where auth lives
		  const { data: { user: chatUser } } = await chatDB.auth.getUser();
		  const { data: { user: tmplUser } } = await supabaseTemplates.auth.getUser();
		  const realUid = chatUser?.id || tmplUser?.id || getCurrentUserId();
		  const email = chatUser?.email || tmplUser?.email || currentUser?.email || data?.user?.email || '';
		  const nowIso = new Date().toISOString();

		  // payload that matches real table: t_code, reference_template_id, data, ts, owner_id(uuid)
		  const payload:any = {
		    t_code: t_code,
		    reference_template_id: template.id,
		    data: {
		      ...calculatedValues,
		      t_code: t_code,
		      template_code: t_code,
		      template_name: template.name,
		      template_id: template.id,
		      reference_template_id: template.id,
		      owner_id: realUid,
		      user_id: realUid,
		      owner_email: email,
		      created_at: nowIso
		    },
		    ts: nowIso
		  };
		  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realUid)){
		    payload.owner_id = realUid;
		  }

		  console.log("Saving to templates DB:", payload.t_code, payload.reference_template_id, payload.owner_id);
		  const { data: inserted, error } = await supabaseTemplates.from("records").insert(payload).select().single();
		  if(error) throw error;
		  console.log("✅ VENT saved:", inserted.id);
		}catch(err:any){
		  console.error("FINAL fail", err?.message, err?.details, err?.hint);
		  alert("Save failed: "+err?.message+" - Run SQL policy fix in rfckn project");
		}
		showTemplateForm=false;
		await sendMessage({ detail: { content: fullContent } } as any);
		selectedTemplate=null;
	}

	async function loadGroups() { const userId = getCurrentUserId(); if(!userId) return; const { data } = await chatDB.from("chat_group_members").select(`chat_groups(id,name,description,avatar_url)`).eq("user_id", userId); groups = (data?? []).map((m: any) => m.chat_groups).filter(Boolean); }
	async function loadContacts() {
		const userId = getCurrentUserId(); if(!userId){ contacts = []; return; }
		let mapped: any[] = [{ id: userId, actual_user_id: userId, name: "You (Saved Messages)", email: currentUser?.email || data?.user?.email || "You", avatar_url: currentUser?.avatar_url || null, room_id: null, status: 'accepted', isSelf: true, last_message: "Message yourself" }];
		try{ const { data: rooms } = await chatDB.from("rooms").select("id, user1_id, user2_id").or(`user1_id.eq.${userId},user2_id.eq.${userId}`); if(rooms?.length){ for(const r of rooms){ const otherId = r.user1_id === userId? r.user2_id : r.user1_id; if(!otherId || otherId===userId) continue; if(mapped.find(m=>m.id===otherId)) continue; const { data: prof } = await chatDB.from("profiles").select("id,name,email,avatar_url").eq("id", otherId).maybeSingle(); mapped.push({ id: otherId, actual_user_id: otherId, name: prof?.name || prof?.email?.split('@')[0] || "User", email: prof?.email || "", avatar_url: prof?.avatar_url || null, room_id: r.id, status: 'accepted', isSelf: false, last_message: "Tap to chat" }); } } }catch(e){}
		try{ const { data: sent } = await chatDB.from('contact_invites').select('id, email, status').eq('invited_by', userId).neq('status', 'accepted'); sent?.forEach((i:any)=>{ if(!mapped.find(c=>c.email?.toLowerCase()===i.email?.toLowerCase())){ mapped.push({ id:i.id, invite_id:i.id, email:i.email, name:i.email.split('@')[0], room_id:null, status:i.status, last_message: "Invited" }); } }); }catch{}
		contacts = mapped;
	}
	async function setupPresence() { const userId = getCurrentUserId(); if(!userId) return; if(presenceChannel) await chatDB.removeChannel(presenceChannel); presenceChannel = chatDB.channel("online-users", { config: { presence: { key: userId } } }); presenceChannel.on("presence", { event: "sync" }, () => { onlineUsers = new Set(Object.keys(presenceChannel!.presenceState())); }).subscribe(async (s) => { if(s==="SUBSCRIBED") await presenceChannel!.track({ user_id: userId }); }); }
	function isUserOnline(id: string){ return onlineUsers.has(id); }
	async function cleanupRealtime(){ const ch = [messagesChannel, presenceChannel].filter(Boolean); messagesChannel = null; presenceChannel = null; if(ch.length) await Promise.allSettled(ch.map((c:any) => chatDB.removeChannel(c))); }
	async function loadMessages({ roomId, groupId }: any){
	  if(isLoadingMessages) return; isLoadingMessages=true;
	  try{ const uid = getCurrentUserId(); let query = chatDB.from("messages").select("*").order("created_at", {ascending:true}); if(groupId) query = query.eq("group_id", groupId); else if(roomId) query = query.eq("room_id", roomId); else query = query.eq("sender_id", uid).eq("receiver_id", uid); const { data, error } = await query; if(error){ messages=[]; } else messages=(data?? []).filter((m:any)=>!(m.deleted_by||[]).includes(uid)).map((m:any)=>({...m, is_own:m.sender_id===uid})); } finally { isLoadingMessages=false; }
	}
	async function subscribeToMessages({ roomId, groupId }: any){
	  if(messagesChannel) await chatDB.removeChannel(messagesChannel);
	  const channelName = groupId? `group-${groupId}` : roomId? `room-${roomId}` : `self-${getCurrentUserId()}`;
	  messagesChannel=chatDB.channel(channelName).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},(payload)=>{ const newMsg = payload.new as any; const uid = getCurrentUserId(); if((newMsg.deleted_by||[]).includes(uid)) return; if(groupId && newMsg.group_id===groupId) { if(!messages.find(m=>m.id===newMsg.id)) messages = [...messages, {...newMsg, is_own:newMsg.sender_id===uid}]; } else if(roomId && newMsg.room_id===roomId) { if(!messages.find(m=>m.id===newMsg.id)) messages = [...messages, {...newMsg, is_own:newMsg.sender_id===uid}]; } else if(!roomId &&!groupId && newMsg.sender_id===uid && newMsg.receiver_id===uid) { if(!messages.find(m=>m.id===newMsg.id)) messages = [...messages, {...newMsg, is_own:true}]; } }).subscribe();
	}
	async function sendMessage(event: any){
	  const detail = event.detail || event; let content = (detail.content || "").trim(); if(!content &&!(detail.files?.length)) return;
	  if(replyingTo){ content = `> ${replyingTo.content?.slice(0,100)}\n${content}`; }
	  const uid = getCurrentUserId(); const tempId = 'temp_'+Date.now();
	  const optimistic = { id: tempId, sender_id: uid, content, room_id: selectedRoomId, group_id: selectedGroupId, receiver_id: selectedContact? (selectedContact.actual_user_id || selectedContact.id) : null, created_at: new Date().toISOString(), is_own: true, reply_to: replyingTo?.id || null };
	  messages = [...messages, optimistic];
	  const payload: any = { sender_id: uid, content: content, room_id: selectedRoomId || null, group_id: selectedGroupId || null, receiver_id: selectedGroupId? null : (selectedContact?.actual_user_id || selectedContact?.id || uid), reply_to: replyingTo?.id || null };
	  replyingTo = null;
	  const { data, error } = await chatDB.from("messages").insert(payload).select().single();
	  if(error){ messages = messages.filter(m=>m.id!==tempId); } else if(data){ messages = messages.map(m=> m.id===tempId? {...data, is_own:true} : m); }
	}
	async function getOrCreateRoom(otherId: string){
		if(!otherId) return null; const currentUserId = getCurrentUserId(); if(!currentUserId || otherId === currentUserId) return null;
		try{ const { data }=await chatDB.rpc("get_or_create_room",{p_user1:getCurrentUserId(),p_user2:otherId}); const r=Array.isArray(data)?data[0]:data; if(r?.id) return r.id; if(typeof r === 'string') return r; }catch(e){}
		const { data: existing } = await chatDB.from("rooms").select("id").or(`and(user1_id.eq.${getCurrentUserId()},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${getCurrentUserId()})`).maybeSingle();
		if(existing?.id) return existing.id;
		const { data: newRoom } = await chatDB.from("rooms").insert({user1_id:getCurrentUserId(), user2_id:otherId}).select("id").single();
		return newRoom?.id || null;
	}
	async function handleContactLoad(contact:any){
		const currentUserId = getCurrentUserId(); const contactUserId = contact.actual_user_id || contact.id;
		if(contactUserId === currentUserId){ selectedRoomId = null; selectedGroupId = null; selectedGroup = null; await loadMessages({roomId:null}); await subscribeToMessages({roomId:null}); return; }
		let roomId = contact.room_id || null;
		if(!roomId){ roomId = await getOrCreateRoom(contact.actual_user_id||contact.id); if(roomId){ selectedRoomId=roomId; contacts = contacts.map(c=> c.id===contact.id? {...c, room_id: roomId} : c); } }
		if(roomId){ selectedRoomId=roomId; selectedGroupId=null; selectedGroup=null; await loadMessages({roomId}); await subscribeToMessages({roomId}); }
	}
	function onSelectGroup(group:any){ selectedContact=null; selectedRoomId=null; selectedGroup={...group}; selectedGroupId=group.id; loadGroupDetails(group.id); }
	async function loadGroupDetails(groupId:string){ const { data }=await chatDB.from("chat_group_members").select(`users:user_id(id,name,email,avatar_url)`).eq("group_id",groupId); groupMembers=(data?? []).map((m:any)=>m.users).filter(Boolean); await loadMessages({groupId}); await subscribeToMessages({groupId}); }
	function handleMessageLongPress(msg:any, event:any){ longPressTimer = setTimeout(()=>{ selectedMessageForOptions = msg; if(event.touches){ messageOptionsPos = { x: event.touches[0].clientX, y: event.touches[0].clientY }; } else { messageOptionsPos = { x: event.clientX, y: event.clientY }; } showMessageOptions = true; }, 500); }
	function handleMessagePressEnd(){ if(longPressTimer) clearTimeout(longPressTimer); }
	function handleReply(msg:any){ replyingTo = msg; showMessageOptions = false; }
	function handleForward(msg:any){ forwardMessage = msg; showForwardModal = true; showMessageOptions = false; }
	async function handleForwardToContact(contact:any){
		if(!forwardMessage) return; const roomId = contact.room_id || await getOrCreateRoom(contact.actual_user_id || contact.id); if(!roomId) return;
		await chatDB.from("messages").insert({ sender_id: getCurrentUserId(), content: `Forwarded: ${forwardMessage.content}`, room_id: roomId, receiver_id: contact.actual_user_id || contact.id });
		showForwardModal = false; forwardMessage = null;
	}
	function handleBackToList(){ selectedContact = null; selectedGroup = null; selectedRoomId = null; selectedGroupId = null; messages = []; chatMode='chat'; }
	async function handleInvite(event: any){ const { inviteId, action }=event.detail; await chatDB.from('contact_invites').update({status:action}).eq('id',inviteId); if(action==='accepted'){ const inv=contacts.find((c:any)=>c.id===inviteId); const oid=(inv as any)?.actual_user_id||(inv as any)?.invited_by; if(oid && oid!== getCurrentUserId()) await getOrCreateRoom(oid); } await loadContacts(); }
	async function createContact(){ if(!contactEmail.trim()) return; invitingUser=true; try{ const email=contactEmail.trim().toLowerCase(); await chatDB.from('contact_invites').insert({email, invited_by:getCurrentUserId(), status:'pending', token:crypto.randomUUID()}); showContactForm=false; contactEmail=""; await loadContacts(); } finally{ invitingUser=false; } }
	async function createGroup(){ if(!groupName.trim()) return; const { data: g }=await chatDB.from("chat_groups").insert({name:groupName.trim(), created_by:getCurrentUserId()}).select().single(); if(g){ await chatDB.from("chat_group_members").insert({group_id:g.id, user_id:getCurrentUserId()}); groupName=""; showGroupForm=false; await loadGroups(); } }
	function goBottom(tab:string){
		bottomTab=tab;
		if(tab==='dashboard' && browser) window.location.href='/dashboard';
		if(tab==='report' && browser) window.location.href='/reports';
		if(tab==='user' && browser) window.location.href='/settings';
	}
</script>

<div class="main-container" class:mobile-chat-open={isMobileView && (selectedContact || selectedGroup)}>
	<div class="sidebar-wrapper" class:hidden-mobile={isMobileView && (selectedContact || selectedGroup)}>
		<div class="sidebar-scroll">
			<ChatSidebar {groups} {contacts} {selectedGroup} {selectedContact}
			  onSelectContact={(c)=>{ selectedContact={...c}; selectedGroup=null; selectedGroupId=null; selectedRoomId=c.room_id||null; handleContactLoad(c); }}
			  onSelectGroup={onSelectGroup}
			  onNewGroup={() => showGroupForm=true}
			  onNewContact={() => showContactForm=true}
			  onHandleInvite={handleInvite}
			  onLogout={async () => { await chatDB.auth.signOut(); if(browser) location.reload(); }}
			/>
		</div>
		<nav class="bottom-fixed">
			<button class:active={bottomTab==='dashboard'} onclick={()=>goBottom('dashboard')}><span class="b-icon">📊</span><small>Dashboard</small></button>
			<button class:active={bottomTab==='chat'} onclick={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button>
			<button class:active={bottomTab==='report'} onclick={()=>goBottom('report')}><span class="b-icon">📋</span><small>Report</small></button>
			<button class:active={bottomTab==='user'} onclick={()=>goBottom('user')}>{#if currentUser?.avatar_url}<img src={currentUser.avatar_url} class="b-avatar" alt="me" />{:else}<span class="b-icon">👤</span>{/if}<small>User</small></button>
		</nav>
	</div>
	<section class="chat-area" class:show-mobile={isMobileView && (selectedContact || selectedGroup)}>
		{#if selectedContact || selectedGroup}
			<div class="chat-header-fixed">
				<ChatHeader
					title={selectedContact?.name?? selectedGroup?.name?? ''}
					subtitle={selectedContact? (isUserOnline(selectedContact?.actual_user_id||selectedContact?.id)? "Online" : mutedRooms.has(selectedRoomId||selectedGroupId||selectedContact?.id||'')? "Muted" : "Tap for photo") : `${groupMembers.length} members`}
					avatarUrl={selectedContact?.avatar_url?? selectedGroup?.avatar_url?? ''}
					showBack={isMobileView}
					isGroup={!!selectedGroup}
					onBack={handleBackToList}
					onAction={handleHeaderAction}
				/>
			</div>
			<div class="filter-fixed">
			  <div class="mode-row">
			    <div class="dd-wrap" use:clickOutside={()=>openMode=false}>
			      <button class="mode-btn" onclick={(e)=>{e.stopPropagation(); openMode=!openMode}}>
			        <span>{chatMode==='chat'?'💬':chatMode==='template'?'📋':'📅'}</span>
					<b>{chatMode==='chat'?'Chat':chatMode==='template'?'Template':'Meeting'}</b>
					<span class="arr">{openMode?'▲':'▼'}</span>
			      </button>
			      {#if openMode}
			        <div class="dd" onclick={(e)=>{e.stopPropagation()}}>
			          <button class:active={chatMode==='chat'} onclick={()=>{chatMode='chat'; openMode=false; openList=false; selectedTemplate=null;}}>💬 Chat</button>
			          <button class:active={chatMode==='template'} onclick={()=>{chatMode='template'; openMode=false;}}>📋 Template</button>
			          <button class:active={chatMode==='meeting'} onclick={()=>{chatMode='meeting'; openMode=false;}}>📅 Meeting</button>
			        </div>
			      {/if}
			    </div>
			    {#if chatMode!=='chat'}
			      <div class="dd-wrap second" use:clickOutside={()=>openList=false}>
			        <button class="list-btn" onclick={(e)=>{e.stopPropagation(); openList=!openList}}>
			          <span class="cut">{#if chatMode==='template'}{selectedTemplate?.name || 'Select Template'}{:else}{selectedMeeting?.title || 'Select Meeting'}{/if}</span>
			          <span class="arr">{openList?'▲':'▼'}</span>
			        </button>
			        {#if openList}
			          <div class="dd dd2" onclick={(e)=>{e.stopPropagation()}}>
			            {#if chatMode==='template'}
			              {#each templates as t}<button class:active={selectedTemplate?.id===t.id} onclick={()=>{selectedTemplate=t; openList=false;}}><b>{t.name}</b><small>{t.template_code}</small></button>{:else}<div class="empty">No templates for this chat</div>{/each}
			            {:else}
			              {#each meetings as m}<button class:active={selectedMeeting?.id===m.id} onclick={()=>{selectedMeeting=m; openList=false;}}><b>{m.title}</b><small>{m.date}</small></button>{:else}<div class="empty">No meetings</div>{/each}
			            {/if}
			          </div>
			        {/if}
			      </div>
			      {#if chatMode==='template' && selectedTemplate}<button class="use-btn" onclick={()=>{handleUseTemplate({detail:{template:selectedTemplate}})}}>Use</button>{/if}
			    {/if}
			  </div>
			</div>
			<div class="filter-info">Showing: {chatMode}{selectedTemplate? ` - ${selectedTemplate.name}`:''} | {filteredMessages.length}/{messages.length} msgs</div>
			<div class="messages-scroll">
				<MessageList messages={filteredMessages} {selectedContact} {selectedGroup} currentUser={currentUser} selectedUser={currentUser} {replyingTo} onReply={handleReply} onForward={handleForward} onLongPress={handleMessageLongPress} onPressEnd={handleMessagePressEnd} onOpenDetail={handleOpenDetail} />
			</div>
			{#if replyingTo}<div class="reply-preview"><span>Replying to: {replyingTo.content?.slice(0,50)}...</span><button onclick={()=>replyingTo=null}>✕</button></div>{/if}
			<div class="chat-input-fixed">
				{#if chatMode==='chat'}<ChatInput {uploadingFiles} onSendMessage={sendMessage} onOpenTemplate={onOpenTemplate} />{/if}
			</div>
		{:else}
			<div class="empty-area"><div class="empty-icon">💬</div><h2>Chat</h2><p>Select a chat to start messaging</p></div>
		{/if}
	</section>
</div>

{#if showAvatarModal}
<div class="modal-bg" role="presentation"><button type="button" class="modal-bg-btn" onclick={()=>showAvatarModal=false}></button>
<div class="modal" role="dialog" tabindex="-1">
<h3>{avatarType==='group'? 'Group Photo' : avatarTarget?.isSelf? 'Your Photo' : 'Contact Photo'}</h3>
<div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
<img src={avatarPreview || 'https://via.placeholder.com/128'} alt="preview" style="width:128px;height:128px;border-radius:50%;object-fit:cover;border:3px solid #00a884;" />
{#if avatarUploading}<span style="color:#00a884;">Uploading...</span>{/if}
{#if avatarType==='contact' &&!avatarTarget?.isSelf}<small style="color:#8696a0;">View only - cannot edit other user</small>{/if}
</div>
<div class="modal-btns">
<button class="btn-secondary" onclick={()=>showAvatarModal=false}>Close</button>
{#if avatarType==='group' || avatarTarget?.isSelf}
<label class="btn-primary" style="text-align:center;cursor:pointer;">Choose<input type="file" accept="image/*" hidden onchange={onAvatarFileChange} /></label>
{/if}
</div>
</div>
</div>
{/if}

{#if showMessageOptions && selectedMessageForOptions}
	<button class="message-options-overlay" onclick={()=>showMessageOptions=false}></button><div class="message-options" style="left:{messageOptionsPos.x}px; top:{messageOptionsPos.y}px;" use:clickOutside={()=>showMessageOptions=false}><button onclick={()=>handleReply(selectedMessageForOptions)}>↩️ Reply</button><button onclick={()=>handleForward(selectedMessageForOptions)}>➡️ Forward</button><button onclick={()=>{ if(browser){ navigator.clipboard.writeText(selectedMessageForOptions.content); } showMessageOptions=false; }}>📋 Copy</button></div>
{/if}
{#if showForwardModal}<div class="modal-bg" role="presentation"><button type="button" class="modal-bg-btn" onclick={()=>showForwardModal=false}></button><div class="modal large" role="dialog" tabindex="-1"><h3>Forward to...</h3><div class="forward-list">{#each contacts as contact}<button class="forward-item" onclick={()=>handleForwardToContact(contact)}><span>{contact.name}</span></button>{/each}</div><button class="btn-secondary" onclick={()=>showForwardModal=false}>Cancel</button></div></div>{/if}
{#if showContactForm}<div class="modal-bg" role="presentation"><button type="button" class="modal-bg-btn" onclick={()=>showContactForm=false}></button><div class="modal" role="dialog" tabindex="-1"><h3>New Contact</h3><input class="modal-input" bind:value={contactEmail} placeholder="Contact Email" /><div class="modal-btns"><button class="btn-primary" onclick={createContact}>{invitingUser?'Inviting...':'Invite'}</button><button class="btn-secondary" onclick={() => showContactForm=false}>Cancel</button></div></div></div>{/if}
{#if showGroupForm}<div class="modal-bg" role="presentation"><button type="button" class="modal-bg-btn" onclick={()=>showGroupForm=false}></button><div class="modal" role="dialog" tabindex="-1"><h3>Create Group</h3><input class="modal-input" bind:value={groupName} placeholder="Group Name" /><div class="modal-btns"><button class="btn-primary" onclick={createGroup}>Create</button><button class="btn-secondary" onclick={() => showGroupForm=false}>Cancel</button></div></div></div>{/if}
{#if showTemplateModal}<TemplatePopup templates={templates} loading={templateLoading} on:close={()=>showTemplateModal=false} on:use={handleUseTemplate} on:new={handleCreateTemplate} on:create={handleCreateTemplate} on:deleted={(e)=>{ templates=templates.filter(t=>t.id!==e.detail.template.id); }} />{/if}
{#if showTemplateForm && selectedTemplate}<div style="position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);"><TemplateForm template={selectedTemplate} on:close={()=>{ showTemplateForm=false; selectedTemplate=null; }} on:submit={sendTemplateReport} /></div>{/if}
{#if showDetailModal && detailData}<div class="detail-bg" role="presentation"><button type="button" class="modal-bg-btn" onclick={()=>showDetailModal=false}></button><div class="detail-modal" role="dialog" tabindex="-1"><div class="detail-header"><h3>📋 {detailData.template_name}</h3><button class="detail-close" onclick={()=>showDetailModal=false}>✕</button></div><div class="detail-body">{#each Object.entries(detailData.values) as [k,v]}<div class="detail-row"><span class="d-label">{k.replace(/_/g,' ')}</span><b class="d-value">{String(v||'-')}</b></div>{/each}</div><div class="detail-actions"><button class="btn-secondary" onclick={()=>showDetailModal=false}>Close</button></div></div></div>{/if}

<style>
	.main-container{display:flex;height:100dvh;max-height:100dvh;width:100vw;background:#111b21;overflow:hidden;font-family:Inter,Segoe UI,sans-serif;}
	.sidebar-wrapper{width:30%;min-width:300px;max-width:420px;display:flex;flex-direction:column;border-right:1px solid #222d34;background:#111b21;overflow:hidden;height:100dvh;max-height:100dvh;}
	.sidebar-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;}
	.bottom-fixed{flex-shrink:0;height:68px;min-height:68px;background:#202c33;border-top:1px solid #2a3942;display:flex;justify-content:space-around;align-items:center;z-index:20;padding-bottom:env(safe-area-inset-bottom);}
	.bottom-fixed button{background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:3px;color:#8696a0;cursor:pointer;flex:1;padding:6px;}
	.bottom-fixed button.active{color:#00a884;}
	.b-icon{font-size:20px;line-height:1;}
	.b-avatar{width:26px;height:26px;border-radius:50%;object-fit:cover;border:2px solid #00a884;}
	.bottom-fixed small{font-size:11px;font-weight:600;}
	.chat-area{flex:1;display:flex;flex-direction:column;background:#0b141a;min-width:0;height:100dvh;max-height:100dvh;overflow:hidden;}
	.chat-header-fixed{flex-shrink:0;z-index:10;}
	.filter-fixed{flex-shrink:0;background:#f0f2f5;border-bottom:1px solid #d1d7db;padding:6px 10px;z-index:9;}
	.mode-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
	.dd-wrap{position:relative;}
	.mode-btn{background:white;border:1px solid #d1d7db;padding:6px 10px;border-radius:6px;display:flex;gap:6px;align-items:center;cursor:pointer;font-size:12px;white-space:nowrap;}
	.list-btn{background:white;border:1px solid #d1d7db;padding:6px 10px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;font-size:12px;min-width:180px;max-width:260px;}
	.cut{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-align:left;}
	.second{flex:1;min-width:150px;}
	.arr{color:#667781;font-size:10px;}
	.dd{position:absolute;left:0;top:38px;background:white;border:1px solid #d1d7db;border-radius:10px;z-index:300;min-width:220px;max-height:280px;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,0.15);}
	.dd2{width:100%;min-width:100%;}
	.dd button{width:100%;border:none;background:transparent;padding:8px 10px;text-align:left;display:flex;flex-direction:column;gap:2px;cursor:pointer;border-bottom:1px solid #f5f5f5;}
	.dd button:hover{background:#f0f2f5;}.dd button.active{background:#e7fce3;}
	.dd b{font-size:13px;color:#111b21;}.dd small{font-size:11px;color:#667781;}
	.empty{padding:12px;font-size:13px;color:#667781;}
	.use-btn{background:#00a884;color:white;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;}
	.filter-info{font-size:10px;color:#8696a0;padding:3px 12px;background:#202c33;flex-shrink:0;}
	.messages-scroll{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;}
	.chat-input-fixed{flex-shrink:0;background:#202c33;z-index:10;}
	.empty-area{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#222e35;color:#8696a0;gap:8px;}
	.empty-icon{font-size:64px;opacity:0.5;}.empty-area h2{color:#e9edef;font-size:32px;font-weight:300;margin:10px 0 0;}
	.reply-preview{display:flex;justify-content:space-between;align-items:center;background:#202c33;padding:8px 12px;border-left:4px solid #00a884;color:#8696a0;font-size:13px;flex-shrink:0;}
	.reply-preview button{background:none;border:none;color:#8696a0;cursor:pointer;font-size:16px;}
	.message-options-overlay{position:fixed;inset:0;z-index:1000;background:transparent;border:none;}
	.message-options{position:fixed;z-index:1001;background:#233138;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;flex-direction:column;overflow:hidden;min-width:160px;}
	.message-options button{padding:12px 16px;background:none;border:none;color:#e9edef;text-align:left;cursor:pointer;}
	.modal-bg,.detail-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;}
	.detail-bg{z-index:10060;}.modal-bg-btn{position:absolute;inset:0;background:transparent;border:none;}
	.modal{background:#233138;padding:24px;border-radius:12px;width:400px;display:flex;flex-direction:column;gap:16px;position:relative;z-index:1;}
	.modal.large{width:420px;max-height:80vh;overflow-y:auto;}.modal h3{color:#e9edef;margin:0;font-size:18px;}
	.modal-input{background:#2a3942;color:#e9edef;border:1px solid #374045;padding:12px;border-radius:8px;width:100%;outline:none;}
	.modal-btns{display:flex;gap:8px;}.btn-primary{flex:1;background:#00a884;color:#111b21;border:none;padding:11px;border-radius:8px;font-weight:700;cursor:pointer;}.btn-secondary{flex:1;background:#2a3942;color:#e9edef;border:none;padding:11px;border-radius:8px;cursor:pointer;}
	.forward-list{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto;}.forward-item{padding:10px;background:#2a3942;border:none;border-radius:6px;color:#e9edef;text-align:left;cursor:pointer;}
	.detail-modal{background:white;width:min(500px,92vw);max-height:85vh;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;position:relative;z-index:1;}
	.detail-header{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #e2e8f0;background:#f8fafc;}
	.detail-close{border:none;background:#e2e8f0;width:32px;height:32px;border-radius:50%;cursor:pointer;}
	.detail-body{padding:16px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;}
	.detail-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;background:#f8fafc;border-radius:10px;}
	.d-label{text-transform:capitalize;color:#64748b;font-size:13px;font-weight:600;}.d-value{color:#0f172a;font-size:13px;font-weight:700;}
	.detail-actions{padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;}
	@media (max-width:768px){
		.sidebar-wrapper{width:100%;max-width:100%;}
		.sidebar-wrapper.hidden-mobile{display:none;}
		.chat-area{display:none;}
		.chat-area.show-mobile{display:flex;position:fixed;inset:0;z-index:50;width:100vw;height:100dvh;max-height:100dvh;}
		.mode-row{flex-direction:column;align-items:stretch;gap:6px;}
		.list-btn{max-width:100%;min-width:100%;}
		.second{width:100%;}
		.filter-fixed{padding:5px 8px;}
	}
</style>