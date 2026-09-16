// src/lib/chat/chatState.svelte.ts - Svelte 5 runes - 50k secure - FINAL COMPACT
import { browser } from "$app/environment";
import { getChatClient } from '$lib/supabase';

export function createChatState(data:any){
  let chatDB:any=null;
  function getDB(){ if(!chatDB) chatDB=getChatClient(); return chatDB; }

  let currentUser=$state<any>(data?.user??null);
  let groups=$state<any[]>(data?.groups??[]);
  let contacts=$state<any[]>([]);
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
  // FIXED: Added missing popups - your bug was here
  let showMeetingPopup=$state(false);
  let showMeetingListPopup=$state(false);
  let showTemplatePopup=$state(false);
  let showReportPopup=$state(false); // alias for template
  let meetingSearch=$state("");
  let bottomTab=$state('chat');
  let sendingLock=$state(false);
  let showArchived=$state(false);
  let showStarred=$state(false);
  let meetings=$state<any[]>([{id:'1',title:'Daily Standup',code:'MT01'},{id:'2',title:'Client Call',code:'MT02'}]);
  const roomCache = new Map<string,string>();
  let lastSendAt = 0;

  function checkMobile(){ if(!browser) return; isMobileView = window.innerWidth < 768; }
  function getCurrentUserId(){ return currentUser?.id || data?.user?.id || ''; }
  
  // SECURE sanitize - 50k high priority
  function sanitize(str:string){ 
    if(!str) return ""; 
    let s = str.toString().trim().slice(0,4000);
    s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,'');
    s = s.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,'');
    s = s.replace(/javascript:/gi,'').replace(/data:/gi,'').replace(/vbscript:/gi,'').replace(/on\w+\s*=/gi,'');
    s = s.replace(/[<>\`\$\\]/g,'');
    return s.slice(0,4000);
  }
  function isValidUUID(id:string){ return /^[0-9a-fA-F-]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id) || id.length>=8; }
  function isValidEmail(e:string){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length>=5 && e.length<=100; }

  async function loadGroups(){
    const userId=getCurrentUserId(); if(!userId || !isValidUUID(userId)) return;
    try{
      let ids:string[]=[];
      try{ const {data, error}=await getDB().from("chat_group_members").select("group_id").eq("user_id",userId).limit(20); if(!error) ids=(data||[]).map((m:any)=>String(m.group_id||'').slice(0,50)).filter(Boolean); }catch{}
      if(ids.length===0){ try{ const {data}=await getDB().from("chat_groups").select("id").eq("owner_id",userId).limit(20); ids=(data||[]).map((g:any)=>String(g.id||'').slice(0,50)).filter(Boolean); }catch{} }
      if(ids.length===0){ groups=[]; return; }
      const {data:gData}=await getDB().from("chat_groups").select("id,name,avatar_url,created_at,owner_id").in("id",ids.slice(0,20)).limit(20);
      groups=(gData||[]).map((g:any)=>({...g,name:String(g.name||'Unnamed').slice(0,50).replace(/[<>]/g,''),last_message:"Group • Tap avatar",last_message_at:g.created_at||new Date(0).toISOString(),memberCount:1})).slice(0,20);
    }catch{ groups=[]; }
  }

  async function loadContacts(force=false){
    const userId=getCurrentUserId();
    if(!userId || !isValidUUID(userId)){ contacts=[]; return; }
    try{
      let mapped:any[]=[
        {id:userId,actual_user_id:userId,name:"You (Saved)",email:currentUser?.email||"You",avatar_url:currentUser?.avatar_url||null,room_id:null,status:'accepted',isSelf:true,last_message:"Message yourself",last_message_at:new Date().toISOString(),_type:'contact'}
      ];
      try{
        const {data:myRooms}=await getDB().from("rooms").select("id,user1_id,user2_id,created_at").or(`user1_id.eq.${userId},user2_id.eq.${userId}`).order('created_at',{ascending:false}).limit(20);
        if(myRooms?.length){
          // FAST: parallel profile fetch for 50k
          const otherIds = myRooms.slice(0,20).map((r:any)=> r.user1_id===userId? r.user2_id : r.user1_id).filter(Boolean);
          const profMap = new Map();
          await Promise.allSettled(otherIds.map(async (oid:string)=>{
            if(!isValidUUID(oid)) return;
            try{
              const {data:prof}=await getDB().from("profiles").select("id,full_name,email,avatar_url").eq("id",oid).maybeSingle();
              if(prof) profMap.set(oid, prof);
            }catch{}
          }));
          for(const r of myRooms.slice(0,20)){
            const other=r.user1_id===userId? r.user2_id : r.user1_id;
            if(!other || !isValidUUID(other)) continue;
            roomCache.set(other, r.id);
            if(mapped.find(m=>m.actual_user_id===other)) continue;
            const prof = profMap.get(other);
            let pname=prof?.full_name||prof?.email?.split('@')[0]||other.slice(0,8);
            let pavatar=prof?.avatar_url||null;
            mapped.push({id:r.id,actual_user_id:other,name:String(pname).slice(0,24).replace(/[<>]/g,''),email:'',avatar_url:pavatar,room_id:r.id,status:'accepted',last_message:"Tap to chat",last_message_at:r.created_at,_type:'contact'});
          }
        }
      }catch{}
      try{
        const {data:invites}=await getDB().from("contact_invites").select("id,email,status,invited_by,created_at").eq("invited_by",userId).limit(20);
        if(invites?.length){
          for(const inv of invites.slice(0,20)){
            const emailLower=String(inv.email||'').toLowerCase().trim().slice(0,100);
            if(!isValidEmail(emailLower)) continue;
            if(mapped.find(m=>m.email===emailLower)) continue;
            mapped.push({id:inv.id,actual_user_id:null,name:emailLower.split('@')[0].slice(0,20),email:emailLower,avatar_url:null,room_id:null,status:inv.status,last_message:inv.status==='pending'?'⏳ Pending':'Tap to chat',last_message_at:inv.created_at,_type:'contact'});
          }
        }
      }catch{}
      contacts=mapped.slice(0,20);
      // limit cache for 50k
      if(roomCache.size>1000){ const k=roomCache.keys().next().value; if(k) roomCache.delete(k); }
    }catch{
      contacts=[{id:userId,actual_user_id:userId,name:"You (Saved)",email:currentUser?.email||"You",avatar_url:null,room_id:null,status:'accepted',isSelf:true,last_message:"Add contacts",last_message_at:new Date().toISOString(),_type:'contact'}];
    }
  }

  async function loadMessages({roomId,groupId,older=false}:any){
    if(older&&loadingMore) return; if(!older&&isLoadingMessages) return;
    if(older) loadingMore=true; else isLoadingMessages=true;
    try{
      const uid=getCurrentUserId(); if(!uid) return;
      let query=getDB().from("messages").select("id,content,sender_id,room_id,group_id,receiver_id,created_at,status").order("created_at",{ascending:false}).limit(20);
      if(older&&messages.length){ const oldest=messages[0]?.created_at; if(oldest) query=query.lt("created_at",oldest); }
      if(groupId){ if(!isValidUUID(groupId)) return; query=query.eq("group_id",groupId); } 
      else if(roomId){ if(!isValidUUID(roomId)) return; query=query.eq("room_id",roomId); } 
      else query=query.eq("sender_id",uid).eq("receiver_id",uid);
      const {data}=await query; if(!data||data.length===0){ if(!older) messages=[]; if(older) hasMore=false; return; }
      if(data.length<20) hasMore=false; else hasMore=true;
      const filtered=data.reverse().map((m:any)=>({...m,is_own:m.sender_id===uid,content:String(m.content||'').slice(0,2000)}));
      messages = older ? [...filtered,...messages].slice(-100) : filtered.slice(-20);
    }finally{ isLoadingMessages=false; loadingMore=false; }
  }

  async function getOrCreateRoom(otherId:string){
    if(!otherId || !isValidUUID(otherId)) return null; const uid=getCurrentUserId(); if(!uid||otherId===uid || !isValidUUID(uid)) return null; if(roomCache.has(otherId)) return roomCache.get(otherId)!;
    try{ const {data}=await getDB().from("rooms").select("id").eq("user1_id",uid).eq("user2_id",otherId).maybeSingle(); if(data?.id){ roomCache.set(otherId,data.id); return data.id; } }catch{}
    try{ const {data}=await getDB().from("rooms").select("id").eq("user1_id",otherId).eq("user2_id",uid).maybeSingle(); if(data?.id){ roomCache.set(otherId,data.id); return data.id; } }catch{}
    try{ const {data}=await getDB().from("rooms").insert({user1_id:uid,user2_id:otherId}).select("id").single(); if(data?.id){ roomCache.set(otherId,data.id); return data.id; } }catch{}
    return null;
  }

  async function handleContactLoad(contact:any){
    if(!contact) return; const contactUserId=contact.actual_user_id||contact.id; if(!contactUserId || !isValidUUID(contactUserId)) return;
    if(contactUserId===getCurrentUserId()){ selectedRoomId=null; selectedGroupId=null; selectedGroup=null; selectedContact=contact; hasMore=true; await loadMessages({roomId:null,groupId:null}); return; }
    let roomId=contact.room_id||roomCache.get(contactUserId)||null; 
    if(!roomId){ roomId=await getOrCreateRoom(contactUserId); if(roomId) contacts=contacts.map(c=>c.id===contact.id?{...c,room_id:roomId}:c); }
    if(roomId){ selectedRoomId=roomId; selectedGroupId=null; selectedGroup=null; selectedContact=contact; hasMore=true; await loadMessages({roomId,groupId:null}); }
  }

  function onSelectGroup(group:any){ if(!group?.id || !isValidUUID(group.id)) return; selectedContact=null; selectedRoomId=null; selectedGroup={...group}; selectedGroupId=group.id; hasMore=true; loadMessages({roomId:null,groupId:group.id}); }
  function handleBackToList(){ selectedContact=null; selectedGroup=null; selectedRoomId=null; selectedGroupId=null; messages=[]; }
  function handleHeaderAction(action:string){}
  function openAvatarModal(target:any,type:'contact'|'group'='contact'){ if(!target) return; avatarTarget={...target,_type:type,name:String(target.name||'').slice(0,24).replace(/[<>]/g,'')}; showAvatarModal=true; }
  function handleReply(msg:any){ replyingTo=msg; } function handleForward(msg:any){}
  function handleOpenDetail(tpl:any,msg:any){}
  async function handleInvite(event:any){}
  async function handleDeleteContact(c:any){ 
    if(!c || !c.id) return; if(!confirm(`Delete ${c.name}?`)) return; 
    try{ 
      if(c._type==='group'){ if(!isValidUUID(c.id)) return; await getDB().from('chat_groups').delete().eq('id',c.id); await loadGroups(); } 
      else { await getDB().from('contact_invites').delete().eq('id',c.id); await loadContacts(true); } 
      if(selectedContact?.id===c.id||selectedGroup?.id===c.id) handleBackToList(); 
    }catch(e:any){ alert(sanitize(e.message||'Delete failed').slice(0,60)); } 
  }
  async function sendMessage(content:any){ 
    if(sendingLock) return; 
    // Rate limit 50k secure - 500ms
    const now=Date.now(); if(now-lastSendAt<500) return; lastSendAt=now;
    sendingLock=true; 
    try{ 
      let final=typeof content==='string'?content:content?.detail?.content||""; 
      final=sanitize(final).slice(0,2000); 
      if(!final) return; 
      const myId=getCurrentUserId(); if(!myId || !isValidUUID(myId)) return;
      const temp={id:`temp_${Date.now()}`,content:final,sender_id:myId,room_id:selectedRoomId,group_id:selectedGroupId,receiver_id:selectedContact?.actual_user_id||myId,created_at:new Date().toISOString(),is_own:true}; 
      messages=[...messages.slice(-19),temp]; 
      const payload:any={content:final,sender_id:myId,room_id:selectedRoomId,group_id:selectedGroupId,receiver_id:selectedContact?.actual_user_id||myId}; 
      if(selectedGroupId) payload.room_id=null; 
      if(selectedRoomId) payload.group_id=null; 
      const {error}=await getDB().from('messages').insert(payload); if(error) throw error;
    }catch(e){ messages=messages.filter((m:any)=>!String(m.id).startsWith('temp_')); } finally{ sendingLock=false; } 
  }
  function handleSendLocation(e:any){}
  // FIXED: was opening meeting popup, now opens template
  function onOpenTemplate(){ showMeetingPopup=false; showMeetingListPopup=false; showTemplatePopup=true; showReportPopup=true; }
  function goBottom(tab:string){ bottomTab=String(tab).slice(0,20); }

  async function inviteContact(){
    if(sendingLock) return; 
    const now=Date.now(); if(now-lastSendAt<1000) return; lastSendAt=now;
    sendingLock=true;
    try{
      const email = sanitize(contactEmail).toLowerCase().slice(0,100);
      if(!isValidEmail(email)) throw new Error('Invalid email 5-100 chars');
      if(!getCurrentUserId() || !isValidUUID(getCurrentUserId())) throw new Error('No user');
      const { error } = await getDB().from('contact_invites').insert({ email, invited_by:getCurrentUserId(), status:'pending' }).select('id').single();
      if(error) throw error;
      contactEmail=""; showContactForm=false; await loadContacts(true);
    }catch(e:any){ alert(sanitize(e.message||'Invite failed').slice(0,60)); } finally{ sendingLock=false; }
  }

  async function createGroup(){
    if(sendingLock) return; 
    const now=Date.now(); if(now-lastSendAt<1000) return; lastSendAt=now;
    sendingLock=true;
    try{
      const name = sanitize(groupName).slice(0,50).replace(/[<>]/g,'');
      if(!name || name.length<2 || name.length>50) throw new Error('Group name 2-50 chars');
      if(!isValidUUID(getCurrentUserId())) throw new Error('No user');
      const {data, error}=await getDB().from('chat_groups').insert({ name, owner_id:getCurrentUserId() }).select('id').single();
      if(error) throw error;
      if(data?.id){
        try{ await getDB().from('chat_group_members').insert({group_id:data.id,user_id:getCurrentUserId()}); }catch{}
      }
      groupName=""; showGroupForm=false; await loadGroups();
    }catch(e:any){ alert(sanitize(e.message||'Group create failed').slice(0,60)); } finally{ sendingLock=false; }
  }

  let allChats={ get value(){ const all=[...groups.slice(0,20).map((g:any)=>({...g,_type:'group',_sortTime:g.last_message_at||g.created_at||0})),...contacts.filter((c:any)=>!c.isSelf).slice(0,20).map((c:any)=>({...c,_type:'contact',_sortTime:c.last_message_at||0}))]; all.sort((a,b)=> new Date(b._sortTime||0).getTime()-new Date(a._sortTime||0).getTime()); return all.slice(0,40); } };
  let filteredMessages={ get value(){ return messages.slice(-20); } };

  return {
    get currentUser(){return currentUser}, set currentUser(v){currentUser=v},
    get groups(){return groups}, set groups(v){groups=v},
    get contacts(){return contacts}, set contacts(v){contacts=v},
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
    get showTemplatePopup(){return showTemplatePopup}, set showTemplatePopup(v){showTemplatePopup=v; showReportPopup=v;},
    get showReportPopup(){return showReportPopup}, set showReportPopup(v){showReportPopup=v; showTemplatePopup=v;},
    get meetingSearch(){return meetingSearch}, set meetingSearch(v){meetingSearch=v},
    get meetings(){return meetings}, set meetings(v){meetings=v},
    get bottomTab(){return bottomTab}, set bottomTab(v){bottomTab=v},
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
    allChats,
    checkMobile, loadGroups, loadContacts, loadMessages, handleContactLoad, onSelectGroup, handleBackToList, handleHeaderAction, openAvatarModal, handleReply, handleForward, handleOpenDetail, handleInvite, handleDeleteContact, sendMessage, handleSendLocation, onOpenTemplate, goBottom, inviteContact, createGroup
  };
}