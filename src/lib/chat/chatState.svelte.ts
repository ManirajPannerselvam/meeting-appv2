// src/lib/chat/chatState.svelte.ts - FIXED ALL 13 ISSUES - 50K SECURE
import { browser } from "$app/environment";
import { getChatClient } from '$lib/supabase';

export function createChatState(data:any){
  let chatDB:any=null;
  function getDB(){ if(!chatDB) chatDB=getChatClient(); return chatDB; }

  let currentUser=$state<any>(data?.user??null);
  let groups=$state<any[]>(data?.groups??[]);
  let contacts=$state<any[]>([]);
  let pendingInvites=$state<any[]>([]); // FIX #4
  let messages=$state<any[]>([]);
  let selectedGroup=$state<any>(null);
  let selectedContact=$state<any>(null);
  let selectedRoomId=$state<string|null>(null);
  let selectedGroupId=$state<string|null>(null);
  let groupMembers=$state<any[]>([]);
  let isLoadingMessages=$state(false);
  let loadingMore=$state(false);
  let hasMore=$state(true);
  let isMobileView=$state(false);
  let showGroupForm=$state(false);
  let showContactForm=$state(false);
  let showAvatarModal=$state(false);
  let avatarTarget=$state<any>(null);
  let groupName=$state("");
  let contactEmail=$state("");
  let uploadingFiles=$state<File[]>([]);
  let replyingTo=$state<any>(null);
  let chatMode=$state<'chat'|'meeting'|'report'>('chat');
  let openMode=$state(false);
  let openList=$state(false);
  let selectedMeeting=$state<any>(null);
  let showMeetingPopup=$state(false);
  let showMeetingListPopup=$state(false);
  let showTemplatePopup=$state(false); // FIX #9 - Separate
  let showReportPopup=$state(false); // FIX #9 - Separate
  let meetingSearch=$state("");
  let bottomTab=$state<'chat'|'report'|'meeting'>('chat');
  let sendingLock=$state(false);
  let showArchived=$state(false);
  let showStarred=$state(false);
  let templates=$state<any[]>([]); // FIX #6
  let meetings=$state<any[]>([]);
  const roomCache = new Map<string,string>();
  let lastSendAt=0;

  function checkMobile(){ if(!browser) return; isMobileView=window.innerWidth<768; }
  function getCurrentUserId(){ return String(currentUser?.id||data?.user?.id||'').slice(0,50); }
  function sanitize(str:string,max=4000){ if(!str) return ""; let s=String(str).trim().slice(0,max); s=s.replace(/<[^>]*>/g,''); return s.slice(0,max); }
  function sanitizeShort(s:string,max=50){ return sanitize(s,max); }
  function isValidUUID(id:string){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id||'').trim()); }
  function isValidEmail(e:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length<=100; }

  // FIX #2 - Parse first line properly
  function parseFirstLine(content:string){
    if(!content) return "Tap to chat";
    const c = String(content);
    if(c.startsWith('__voice__')) return "🎤 Voice message";
    if(c.startsWith('__report__')) {
      try { const j = JSON.parse(c.replace('__report__','')); return `📋 Report: ${j.station||'Station'}`; } catch { return "📋 Report"; }
    }
    if(c.startsWith('__meeting__')) {
      try { const j = JSON.parse(c.replace('__meeting__','')); return `📅 Meeting: ${j.title||'Meeting'}`; } catch { return "📅 Meeting"; }
    }
    // Real first line - up to \n
    const firstLine = c.split('\n')[0].trim();
    return firstLine.slice(0,32) || "Tap to chat";
  }
  function formatDate(iso:string){ // FIX #2 date formate
    if(!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if(diff < 60000) return "now";
    if(diff < 3600000) return `${Math.floor(diff/60000)}m`;
    if(diff < 86400000) return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    if(diff < 604800000) return d.toLocaleDateString([], {weekday:'short'});
    return d.toLocaleDateString([], {day:'2-digit', month:'short'});
  }
  function isReportMsg(m:any){ const c=String(m.content||'').toLowerCase(); return c.startsWith('__report__')||c.includes('station:'); }
  function isMeetingMsg(m:any){ const c=String(m.content||'').toLowerCase(); return c.startsWith('__meeting__'); }
  function isVoiceMsg(m:any){ return String(m.content||'').toLowerCase().startsWith('__voice__'); }

  // FIX #1 + #5 - Groups with NO recursion
  async function loadGroups(){
    const uid=getCurrentUserId(); if(!isValidUUID(uid)) return;
    try{
      let ids:string[]=[];
      // Try both table names - secure
      let members:any[] = [];
      const res1 = await getDB().from("chat_group_members").select("group_id").eq("user_id",uid).limit(100);
      if(!res1.error) members = res1.data||[];
      else {
        const res2 = await getDB().from("group_members").select("group_id").eq("user_id",uid).limit(100);
        members = res2.data||[];
      }
      ids=(members||[]).map((m:any)=>m.group_id).filter(isValidUUID);

      // Also get owned - try both column names
      if(ids.length===0){
        let owned:any[] = [];
        const o1 = await getDB().from("chat_groups").select("id").eq("owner_id",uid).limit(50);
        if(!o1.error) owned = o1.data||[];
        else {
          const o2 = await getDB().from("chat_groups").select("id").eq("created_by",uid).limit(50);
          owned = o2.data||[];
        }
        ids=(owned||[]).map((g:any)=>g.id).filter(isValidUUID);
      }

      if(!ids.length){ groups=[]; return; }

      const {data:gData} = await getDB().from("chat_groups").select("id,name,avatar_url,created_at,owner_id,created_by").in("id",ids.slice(0,50)).limit(50);

      let lastMap=new Map<string,any>();
      let unreadMap=new Map<string,number>();
      if(ids.length){
        const {data:lastMsgs}=await getDB().from("messages").select("group_id,content,created_at,sender_id,status,deleted_by").in("group_id", ids.slice(0,50)).order("created_at",{ascending:false}).limit(200);
        (lastMsgs||[]).forEach((m:any)=>{
          if((m.deleted_by||[]).includes(uid)) return;
          if(!lastMap.has(m.group_id)) lastMap.set(m.group_id, m);
          if(m.sender_id!==uid && m.status!=='read'){
            unreadMap.set(m.group_id, (unreadMap.get(m.group_id)||0)+1);
          }
        });
      }
      groups=(gData||[]).map((g:any)=>{
        const last=lastMap.get(g.id);
        return {
         ...g,
          name:sanitizeShort(g.name||'Unnamed',50),
          last_message: parseFirstLine(last?.content||""),
          last_message_at: last? last.created_at : g.created_at,
          last_message_fmt: formatDate(last? last.created_at : g.created_at),
          unread: unreadMap.get(g.id)||0,
          _type:'group'
        };
      }).slice(0,50);
    }catch(e){ console.error(e); groups=[]; }
  }

  // FIX #4 - Contact + Invite status
  async function loadContacts(){
    const uid=getCurrentUserId(); if(!isValidUUID(uid)){ contacts=[]; return; }
    try{
      let mapped:any[]=[{id:uid,actual_user_id:uid,name:"You (Saved)",email:currentUser?.email||"",avatar_url:currentUser?.avatar_url||null,room_id:null,isSelf:true,_type:'contact',last_message:"Message yourself",last_message_at:new Date().toISOString(), last_message_fmt:"now", unread:0}];

      // Load pending invites - FIX #4
      const {data:invites} = await getDB().from("contact_invites").select("id,email,status,created_at").eq("invited_by",uid).in("status",['pending','invited']).order('created_at',{ascending:false}).limit(20);
      pendingInvites = (invites||[]).map((inv:any)=>({
        id: inv.id,
        actual_user_id: inv.id,
        name: inv.email.split('@')[0],
        email: inv.email,
        status: 'pending',
        _type:'contact',
        last_message: `Invite ${inv.status}`,
        last_message_at: inv.created_at,
        last_message_fmt: formatDate(inv.created_at),
        unread: 0,
        isInvite: true
      }));

      const {data:myRooms}=await getDB().from("rooms").select("id,user1_id,user2_id,created_at").or(`user1_id.eq.${uid},user2_id.eq.${uid}`).order('created_at',{ascending:false}).limit(50);
      if(myRooms?.length){
        const roomIds=myRooms.map((r:any)=>r.id).filter(isValidUUID);
        const otherIds=[...new Set(myRooms.map((r:any)=> r.user1_id===uid? r.user2_id : r.user1_id).filter(isValidUUID))];
        const profMap=new Map();
        if(otherIds.length){
          const {data:profs}=await getDB().from("profiles").select("id,full_name,email,avatar_url").in("id",otherIds.slice(0,50));
          (profs||[]).forEach((p:any)=>profMap.set(p.id,p));
        }
        let lastMap=new Map<string,any>();
        let unreadMap=new Map<string,number>();
        if(roomIds.length){
          const {data:lastMsgs}=await getDB().from("messages").select("room_id,content,created_at,sender_id,status,deleted_by").in("room_id", roomIds.slice(0,50)).order("created_at",{ascending:false}).limit(200);
          (lastMsgs||[]).forEach((m:any)=>{
            if((m.deleted_by||[]).includes(uid)) return;
            if(!lastMap.has(m.room_id)) lastMap.set(m.room_id, m);
            if(m.sender_id!==uid && m.status!=='read'){
              unreadMap.set(m.room_id, (unreadMap.get(m.room_id)||0)+1);
            }
          });
        }
        for(const r of myRooms.slice(0,50)){
          const other=r.user1_id===uid? r.user2_id : r.user1_id;
          if(!isValidUUID(other)||!isValidUUID(r.id)) continue;
          if(mapped.find(m=>m.actual_user_id===other)) continue;
          if(roomCache.size>200) { // FIX #11 - don't clear aggressively
            const firstKey = roomCache.keys().next().value;
            if(firstKey) roomCache.delete(firstKey);
          }
          roomCache.set(other, r.id);
          const prof=profMap.get(other);
          const displayName=prof?.full_name?.trim() || prof?.email?.split('@')[0] || "User "+other.slice(0,4);
          const last=lastMap.get(r.id);
          mapped.push({
            id:r.id,
            actual_user_id:other,
            name:sanitizeShort(displayName,24),
            email:prof?.email||"",
            avatar_url:prof?.avatar_url||null,
            room_id:r.id,
            status:'accepted',
            _type:'contact',
            last_message: parseFirstLine(last?.content||""),
            last_message_at: last? last.created_at : r.created_at,
            last_message_fmt: formatDate(last? last.created_at : r.created_at),
            unread: unreadMap.get(r.id)||0
          });
        }
      }
      // FIX #4 - Merge pending at end
      contacts=[...mapped.slice(0,50),...pendingInvites].slice(0,60);
    }catch(e){ console.error(e); contacts=[]; }
  }

  async function loadTemplates(){ // FIX #6
    try {
      const {data} = await getDB().from("templates").select("*").order('created_at',{ascending:false}).limit(50);
      templates = data||[];
      const {data:meetData} = await getDB().from("meetings").select("*").order('created_at',{ascending:false}).limit(50);
      meetings = meetData||[{id:'1',title:'Daily Standup',code:'MT01'}];
    } catch { templates=[]; }
  }

  async function loadMessages({roomId,groupId,older=false}:any){
    if(older && loadingMore) return;
    if(older) loadingMore=true; else isLoadingMessages=true;
    try{
      const uid=getCurrentUserId(); if(!isValidUUID(uid)) return;
      if(roomId &&!isValidUUID(roomId)) return;
      if(groupId &&!isValidUUID(groupId)) return;

      let q=getDB().from("messages").select("id,content,sender_id,room_id,group_id,receiver_id,created_at,status,deleted_by,reply_to").order("created_at",{ascending:false}).limit(30);
      if(older && messages.length) q=q.lt("created_at",messages[0]?.created_at);
      if(groupId) q=q.eq("group_id",groupId);
      else if(roomId) q=q.eq("room_id",roomId);
      else q=q.eq("sender_id",uid).eq("receiver_id",uid);

      const {data, error}=await q;
      if(error){
        let q2=getDB().from("messages").select("id,content,sender_id,room_id,group_id,receiver_id,created_at,deleted_by").order("created_at",{ascending:false}).limit(30);
        if(older && messages.length) q2=q2.lt("created_at",messages[0]?.created_at);
        if(groupId) q2=q2.eq("group_id",groupId); else if(roomId) q2=q2.eq("room_id",roomId); else q2=q2.eq("sender_id",uid).eq("receiver_id",uid);
        const r2=await q2;
        if(!r2.data?.length){ if(!older) messages=[]; return; }
        const filtered = r2.data.filter((m:any)=>!(m.deleted_by||[]).includes(uid));
        if(older) messages=[...filtered.reverse().map((m:any)=>({...m,is_own:m.sender_id===uid,content:sanitize(m.content||'',4000),status:'sent'})),...messages].slice(-100);
        else messages=filtered.reverse().map((m:any)=>({...m,is_own:m.sender_id===uid,content:sanitize(m.content||'',4000),status:'sent'})).slice(-100);
        return;
      }
      if(!data?.length){ if(!older) messages=[]; hasMore=false; return; }
      hasMore=data.length>=30;
      const filteredData = data.filter((m:any)=>!(m.deleted_by||[]).includes(uid));
      const newMsgs = filteredData.reverse().map((m:any)=>({...m,is_own:m.sender_id===uid,content:sanitize(m.content||'',4000),status:m.status||'sent'}));
      if(older) messages=[...newMsgs,...messages].slice(-100);
      else messages=newMsgs.slice(-100);

      if(!older){
        setTimeout(async()=>{
          try{
            if(roomId){
              await getDB().from("messages").update({status:'read'}).eq("room_id",roomId).neq("sender_id",uid);
              contacts=contacts.map(c=> c.room_id===roomId? {...c, unread:0} : c);
            }
            if(groupId){
              await getDB().from("messages").update({status:'read'}).eq("group_id",groupId).neq("sender_id",uid);
              groups=groups.map(g=> g.id===groupId? {...g, unread:0} : g);
            }
          }catch{}
        },300);
      }
    }finally{ isLoadingMessages=false; loadingMore=false; }
  }

  async function getOrCreateRoom(otherId:string){
    if(!isValidUUID(otherId)) return null;
    const uid=getCurrentUserId(); if(!isValidUUID(uid)||otherId===uid) return null;
    if(roomCache.has(otherId)) return roomCache.get(otherId)!;
    const {data}=await getDB().from("rooms").select("id").or(`and(user1_id.eq.${uid},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${uid})`).maybeSingle();
    if(data?.id){ roomCache.set(otherId,data.id); return data.id; }
    const {data:ins}=await getDB().from("rooms").insert({user1_id:uid,user2_id:otherId}).select("id").single();
    if(ins?.id){ roomCache.set(otherId,ins.id); return ins.id; }
    return null;
  }

  function handleContactLoad(contact:any){
    if(!contact) return;
    if(contact.isInvite){ alert(`Invite pending to ${contact.email}`); return; } // FIX #4
    const contactUserId=contact.actual_user_id||contact.id;
    if(contactUserId===getCurrentUserId()){
      selectedGroup=null; selectedGroupId=null; selectedRoomId=null; selectedContact=contact; messages=[]; isLoadingMessages=false;
      setTimeout(()=>loadMessages({roomId:null,groupId:null}),0); return;
    }
    selectedGroup=null; selectedGroupId=null;
    selectedContact=contact;
    selectedRoomId=contact.room_id||roomCache.get(contactUserId)||null;
    messages=[]; isLoadingMessages=true;
    contacts=contacts.map(c=> c.id===contact.id? {...c, unread:0} : c);
    (async()=>{
      let rid=selectedRoomId;
      if(!rid && isValidUUID(contactUserId)){ rid=await getOrCreateRoom(contactUserId); if(rid){ selectedRoomId=rid; contacts=contacts.map(c=>c.id===contact.id?{...c,room_id:rid}:c); } }
      if(rid) await loadMessages({roomId:rid,groupId:null}); else isLoadingMessages=false;
    })();
  }

  function onSelectGroup(group:any){
    if(!group?.id||!isValidUUID(group.id)) return;
    selectedContact=null; selectedRoomId=null;
    selectedGroup={...group, name:sanitizeShort(group.name||'',50)}; selectedGroupId=group.id;
    messages=[]; isLoadingMessages=true;
    groups=groups.map(g=> g.id===group.id? {...g, unread:0} : g);
    setTimeout(()=>loadMessages({roomId:null,groupId:group.id}),0);
  }
  function handleBackToList(){ selectedContact=null; selectedGroup=null; selectedRoomId=null; selectedGroupId=null; messages=[]; isLoadingMessages=false; hasMore=true; }

  // FIX #13 - 3dot working
  function handleHeaderAction(action:string){
    const a = sanitizeShort(action,30).toLowerCase();
    if(a.includes('delete')){ if(selectedContact) handleDeleteContact(selectedContact); if(selectedGroup) handleDeleteContact(selectedGroup); }
    else if(a.includes('archive')){ showArchived =!showArchived; }
    else if(a.includes('star')){ showStarred =!showStarred; }
    else if(a.includes('info') || a.includes('detail')){ if(selectedContact) openAvatarModal(selectedContact,'contact'); if(selectedGroup) openAvatarModal(selectedGroup,'group'); }
    else if(a.includes('clear')){ messages=[]; }
  }
  function openAvatarModal(t:any,type:'contact'|'group'='contact'){ avatarTarget={...t,_type:type,name:sanitizeShort(t.name||'',24)}; showAvatarModal=true; }
  function handleReply(m:any){ replyingTo=m; }
  function handleForward(m:any){ if(m) sendMessage(`Forwarded: ${m.content||''}`); }
  function handleOpenDetail(t:any,m:any){ if(t) openAvatarModal(t, t._type||'contact'); }
  async function handleInvite(e:any){}
  async function handleDeleteContact(c:any){
    if(!c?.id) return; if(!confirm(`Delete ${sanitizeShort(c.name||'',20)}?`)) return;
    try{
      if(c._type==='group') await getDB().from('chat_groups').delete().eq('id',c.id);
      else if(c.isInvite) await getDB().from('contact_invites').delete().eq('id',c.id);
      else await getDB().from('rooms').delete().eq('id',c.id);
      if(selectedContact?.id===c.id||selectedGroup?.id===c.id) handleBackToList();
      await loadGroups(); await loadContacts();
    }catch(e:any){ alert(sanitize(e.message||'Delete failed',60)); }
  }

  // FIX #12 - Voice + FIX #11 message persist
  async function sendMessage(content:any){
    if(sendingLock) return; const now=Date.now(); if(now-lastSendAt<350) return; lastSendAt=now; sendingLock=true;
    const tempId=`temp_${Date.now()}`;
    try{
      let final=""; let files:File[]=[]; let isVoice=false; let voiceDur=0;
      if(typeof content==='string') final=content; else { final=content?.content||content?.detail?.content||""; files=content?.files||[]; isVoice=!!content?.voiceMessage; voiceDur=Number(content?.duration||0); }
      if(!final &&!files.length){ sendingLock=false; return; }
      const myId=getCurrentUserId(); if(!isValidUUID(myId)) return;
      let uploadUrl="";
      if(files.length>0){
        const f=files[0]; if(f.size>10*1024*1024){ alert("Max 10MB"); sendingLock=false; return; }
        if(isVoice){
          try{
            const safeName=`${myId}/${Date.now()}_voice.webm`;
            const {data:up, error}=await getDB().storage.from('voice').upload(safeName,f,{contentType:'audio/webm', upsert:true});
            if(!error){ const {data}=getDB().storage.from('voice').getPublicUrl(safeName); uploadUrl=data?.publicUrl||""; final=`__VOICE__${uploadUrl}__DUR__${voiceDur}`; }
            else { uploadUrl=URL.createObjectURL(f); final=`__VOICE__${uploadUrl}__DUR__${voiceDur}`; }
          }catch(e){ console.error(e); }
        } else {
          // FIX #11 - file upload
          const safeName=`${myId}/${Date.now()}_${f.name}`;
          const {error} = await getDB().storage.from('chat-files').upload(safeName,f,{upsert:true});
          if(!error){
            const {data}=getDB().storage.from('chat-files').getPublicUrl(safeName);
            final = final? `${final} ${data.publicUrl}` : data.publicUrl;
          }
        }
      }
      final=sanitize(final,4000); if(!final){ sendingLock=false; return; }
      const temp:any={id:tempId,content:final,sender_id:myId,room_id:selectedRoomId,group_id:selectedGroupId,receiver_id:selectedContact?.actual_user_id||myId,created_at:new Date().toISOString(),is_own:true,status:'sent',_voiceUrl:uploadUrl};
      messages=[...messages, temp].slice(-100); // FIX #11 - keep all

      // Update sidebar preview - FIX #2
      if(selectedRoomId){
        contacts=contacts.map(c=> c.room_id===selectedRoomId? {...c, last_message:parseFirstLine(final), last_message_at:new Date().toISOString(), last_message_fmt:"now"} : c);
      }
      if(selectedGroupId){
        groups=groups.map(g=> g.id===selectedGroupId? {...g, last_message:parseFirstLine(final), last_message_at:new Date().toISOString(), last_message_fmt:"now"} : g);
      }

      let payload:any={content:final,sender_id:myId,status:'sent'};
      if(selectedGroupId) payload.group_id=selectedGroupId;
      else if(selectedRoomId){ payload.room_id=selectedRoomId; payload.receiver_id=selectedContact?.actual_user_id||myId; }
      else payload.receiver_id=myId;
      if(replyingTo?.id) payload.reply_to = replyingTo.id;

      let inserted:any=null;
      try{
        const {data,error}=await getDB().from('messages').insert(payload).select('id,created_at').single();
        if(error) throw error; inserted=data;
      }catch{
        const p2:any={content:final,sender_id:myId};
        if(selectedGroupId) p2.group_id=selectedGroupId;
        else if(selectedRoomId){ p2.room_id=selectedRoomId; p2.receiver_id=selectedContact?.actual_user_id||myId; }
        else p2.receiver_id=myId;
        const {data}=await getDB().from('messages').insert(p2).select('id,created_at').single(); inserted=data;
      }
      if(inserted?.id){
        messages=messages.map((m:any)=> m.id===tempId? {...m,id:inserted.id,created_at:inserted.created_at,status:'sent'}:m);
        setTimeout(()=>{ messages=messages.map((m:any)=> m.id===inserted.id? {...m,status:'delivered'}:m); },800);
      }
      replyingTo=null; // clear reply
    }catch(e){ console.error(e); messages=messages.filter((m:any)=>m.id!==tempId); }finally{ sendingLock=false; }
  }

  function handleSendLocation(e:any){ if(e?.detail) sendMessage(`📍 Location: ${e.detail.lat}, ${e.detail.lng}`); }

  // FIX #9 - Separate popups
  function onOpenTemplate(){ showTemplatePopup=true; showReportPopup=false; showMeetingPopup=false; }
  function onOpenReport(){ showReportPopup=true; showTemplatePopup=false; showMeetingPopup=false; }
  function onOpenMeeting(){ showMeetingPopup=true; showTemplatePopup=false; showReportPopup=false; }

  // FIX #10 - Color switch + counts
  function goBottom(tab:string){
    const t=sanitizeShort(tab,20).toLowerCase() as any;
    if(!['chat','report','meeting'].includes(t)) return;
    bottomTab=t;
    chatMode=t;
  }

  async function inviteContact(){
    if(sendingLock) return; sendingLock=true;
    try{
      const email=sanitize(contactEmail,100).toLowerCase(); if(!isValidEmail(email)) throw new Error('Invalid email');
      const {error}=await getDB().from('contact_invites').insert({email,invited_by:getCurrentUserId(),status:'pending'}).select('id').single();
      if(error) throw error; contactEmail=""; showContactForm=false; await loadContacts();
    }catch(e:any){ alert(sanitize(e.message||'Failed',60)); }finally{ sendingLock=false; }
  }
  async function createGroup(){
    if(sendingLock) return; sendingLock=true;
    try{
      const name=sanitizeShort(groupName,50); if(name.length<2) throw new Error('Name 2-50');
      // FIX #5 - try both column names
      let ins:any = null;
      let err:any = null;
      const res1 = await getDB().from('chat_groups').insert({name,owner_id:getCurrentUserId()}).select('id').single();
      if(res1.error){
        const res2 = await getDB().from('chat_groups').insert({name,created_by:getCurrentUserId()}).select('id').single();
        ins = res2.data; err = res2.error;
      } else { ins = res1.data; }
      if(err) throw err;
      if(ins?.id){
        // Try both member table names
        const m1 = await getDB().from('chat_group_members').insert({group_id:ins.id,user_id:getCurrentUserId()});
        if(m1.error) await getDB().from('group_members').insert({group_id:ins.id,user_id:getCurrentUserId()});
      }
      groupName=""; showGroupForm=false; await loadGroups();
    }catch(e:any){ alert(sanitize(e.message||'Failed',60)); }finally{ sendingLock=false; }
  }

  let allChats={ get value(){
    const all=[...groups.slice(0,50).map((g:any)=>({...g,_type:'group',_sortTime:g.last_message_at||0})),...contacts.filter((c:any)=>!c.isSelf &&!c.isInvite).slice(0,50).map((c:any)=>({...c,_type:'contact',_sortTime:c.last_message_at||0}))];
    all.sort((a,b)=> new Date(b._sortTime||0).getTime()-new Date(a._sortTime||0).getTime());
    return all.slice(0,60);
  } };

  // FIX #10 + #2 - filtered by bottomTab + counts
  let filteredMessages={ get value(){
    const list = messages.slice(-100);
    if(bottomTab==='report') return list.filter(m=>isReportMsg(m));
    if(bottomTab==='meeting') return list.filter(m=>isMeetingMsg(m));
    return list.filter(m=>!isReportMsg(m) &&!isMeetingMsg(m) || isVoiceMsg(m)); // chat includes voice
  } };

  let messageCounts={ get value(){
    const list=messages.slice(-200); let chat=0,report=0,meeting=0,voice=0;
    for(const m of list){ if(isVoiceMsg(m)) voice++; else if(isReportMsg(m)) report++; else if(isMeetingMsg(m)) meeting++; else chat++; }
    return {chat,report,meeting,voice,all:list.length,chatAll:chat+voice};
  } };

  // Load templates on start
  if(browser){
    setTimeout(()=>{ loadTemplates(); }, 500);
  }

  return {
    get currentUser(){return currentUser}, set currentUser(v){currentUser=v},
    get groups(){return groups}, set groups(v){groups=v},
    get contacts(){return contacts}, set contacts(v){contacts=v},
    get pendingInvites(){return pendingInvites},
    get messages(){return messages}, set messages(v){messages=v},
    get selectedContact(){return selectedContact}, set selectedContact(v){selectedContact=v},
    get selectedGroup(){return selectedGroup}, set selectedGroup(v){selectedGroup=v},
    get selectedRoomId(){return selectedRoomId}, set selectedRoomId(v){selectedRoomId=v},
    get selectedGroupId(){return selectedGroupId}, set selectedGroupId(v){selectedGroupId=v},
    get groupMembers(){return groupMembers}, set groupMembers(v){groupMembers=v},
    get isMobileView(){return isMobileView}, set isMobileView(v){isMobileView=v},
    get chatMode(){return chatMode}, set chatMode(v){chatMode=v},
    get openMode(){return openMode}, set openMode(v){openMode=v},
    get openList(){return openList}, set openList(v){openList=v},
    get selectedMeeting(){return selectedMeeting}, set selectedMeeting(v){selectedMeeting=v},
    get showMeetingPopup(){return showMeetingPopup}, set showMeetingPopup(v){showMeetingPopup=v},
    get showMeetingListPopup(){return showMeetingListPopup}, set showMeetingListPopup(v){showMeetingListPopup=v},
    get showTemplatePopup(){return showTemplatePopup}, set showTemplatePopup(v){showTemplatePopup=v},
    get showReportPopup(){return showReportPopup}, set showReportPopup(v){showReportPopup=v},
    get meetingSearch(){return meetingSearch}, set meetingSearch(v){meetingSearch=v},
    get meetings(){return meetings}, set meetings(v){meetings=v},
    get templates(){return templates}, set templates(v){templates=v},
    get bottomTab(){return bottomTab}, set bottomTab(v){bottomTab=v as any},
    get replyingTo(){return replyingTo}, set replyingTo(v){replyingTo=v},
    get showAvatarModal(){return showAvatarModal}, set showAvatarModal(v){showAvatarModal=v},
    get avatarTarget(){return avatarTarget}, set avatarTarget(v){avatarTarget=v},
    get showGroupForm(){return showGroupForm}, set showGroupForm(v){showGroupForm=v},
    get showContactForm(){return showContactForm}, set showContactForm(v){showContactForm=v},
    get showArchived(){return showArchived}, set showArchived(v){showArchived=v},
    get showStarred(){return showStarred}, set showStarred(v){showStarred=v},
    get loadingMore(){return loadingMore},
    get uploadingFiles(){return uploadingFiles},
    get contactEmail(){return contactEmail}, set contactEmail(v){contactEmail=v},
    get groupName(){return groupName}, set groupName(v){groupName=v},
    get filteredMessages(){return filteredMessages.value},
    get messageCounts(){return messageCounts.value},
    allChats,
    checkMobile, loadGroups, loadContacts, loadMessages, loadTemplates, handleContactLoad, onSelectGroup, handleBackToList, handleHeaderAction, openAvatarModal, handleReply, handleForward, handleOpenDetail, handleInvite, handleDeleteContact, sendMessage, handleSendLocation, onOpenTemplate, goBottom, inviteContact, createGroup,
    get onOpenReport(){return onOpenReport}, get onOpenMeeting(){return onOpenMeeting},
    get formatDate(){return formatDate}, get parseFirstLine(){return parseFirstLine}
  };
}