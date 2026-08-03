<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";
    
    import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
    import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
    import MessageList from "$lib/components/chat/MessageList.svelte";
    import ChatInput from "$lib/components/chat/ChatInput.svelte";
    import TemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
    import TemplateForm from "$lib/components/templates/form/TemplateForm.svelte";
    import TemplateDesigner from "$lib/components/templates/designer/TemplateDesigner.svelte";

    import { supabaseChat, supabaseTemplates } from "$lib/supabase";
    import type { RealtimeChannel } from "@supabase/supabase-js"; // FIX 1: Added import

    // ================= DB ALIASES =================
    const chatDB = supabaseChat; // for chat, users, rooms, groups, messages
    const templateDB = supabaseTemplates; // for templates, records
    const GUEST_USER_ID = "guest-user-001" as const;

    // ================= TYPES =================
    type ChatUser = { id: string; name?: string; email?: string; mobile?: string; avatar_url?: string; room_id?: string; user_metadata?: { name?: string }; };
    type ChatGroup = { id: string; name: string; description?: string; avatar_url?: string; created_at?: string; created_by?: string; };
    type Template = { id: string; name: string; data: any; template_code?: string; t_code?: string; };
    type ChatMessage = { 
        id: string; sender_id: string; receiver_id?: string; room_id?: string; group_id?: string; 
        content?: string; attachments?: string[]; created_at: string; template_id?: string; 
        template_data?: Record<string, unknown>; status?: string; users?: ChatUser; is_own?: boolean; type?: string; 
    };

    // ================= STATE =================
    let currentUser: ChatUser | null = null;
    let isAuthChecked = false;
    let isOnline = true;
    let lastSync = "";

    let groups: ChatGroup[] = [];
    let contacts: ChatUser[] = [];
    let messages: ChatMessage[] = [];
    let templates: Template[] = [];

    let selectedGroup: ChatGroup | null = null;
    let selectedContact: ChatUser | null = null;
    let selectedTemplate: Template | null = null;
    let selectedRoomId: string | null = null;
    let selectedGroupId: string | null = null;
    let groupMembers: ChatUser[] = [];

    let isLoadingMessages = false;
    let typing = false;
    let typingTimeout: ReturnType<typeof setTimeout> | null = null;
    let onlineUsers = new Set<string>();

    let showGroupForm = false;
    let showContactForm = false;
    let showTemplatePopup = false;
    let showTemplateForm = false;
    let showCreateTemplate = false;
    let showAddMembersForm = false;

    let groupName = "";
    let groupDesc = "";
    let contactName = "";
    let contactMobile = "";
    let contactEmail = "";
    let department = "";

    let availableContacts: ChatUser[] = [];
    let selectedContactsToAdd: string[] = [];
    let uploadingFiles: File[] = [];
    let fileInput!: HTMLInputElement;

    let messagesChannel: RealtimeChannel | null = null;
    let presenceChannel: RealtimeChannel | null = null;

    // ================= AUTH =================
    async function checkAuth() {
        currentUser = { id: GUEST_USER_ID, email: "guest@test.com", name: "Guest User", user_metadata: { name: "Guest User" } };
        isAuthChecked = true;
        await initApp();
    }

    function getCurrentUserId(): string { return currentUser?.id ?? GUEST_USER_ID; }

    async function ensureUserExists(userId: string, email = "guest@test.com", name = "Guest User", mobile = "") {
        try {
            const { data: existing } = await chatDB.from("users").select("id").eq("id", userId).maybeSingle();
            if (existing) return existing;
            const { data, error } = await chatDB.from("users").upsert({ id: userId, email, name, mobile }, { onConflict: "id" }).select().single();
            if (error) throw error;
            return data;
        } catch (err) { console.error("ensureUserExists()", err); return null; }
    }

    // ================= INIT =================
    async function initApp() {
        const userId = getCurrentUserId();
        if (!userId) return;
        await ensureUserExists(userId);
        await Promise.all([setupPresence(), loadGroups(), loadContacts(), loadTemplates()]);
        testNetwork();
    }

    function testNetwork() { lastSync = new Date().toLocaleTimeString(); isOnline = navigator.onLine; }

    // ================= PRESENCE =================
    // ================= PRESENCE =================
async function setupPresence() {
    const userId = getCurrentUserId();
    if (!userId) return;

    if (presenceChannel) {
        await chatDB.removeChannel(presenceChannel);
    }

    presenceChannel = chatDB.channel("online-users", {
        config: {
            presence: {
                key: userId
            }
        }
    });

    const updateOnlineUsers = () => {
        const state = presenceChannel!.presenceState();
        onlineUsers = new Set(Object.keys(state));
    };

    presenceChannel
        .on("presence", { event: "sync" }, updateOnlineUsers)
        .on("presence", { event: "join" }, updateOnlineUsers)
        .on("presence", { event: "leave" }, updateOnlineUsers);

    presenceChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
            await presenceChannel!.track({
                user_id: userId,
                online: true,
                last_seen: new Date().toISOString()
            });
        }
    });
}

    function isUserOnline(userId: string): boolean { return onlineUsers.has(userId); }
    async function cleanupRealtime() { if (messagesChannel) await chatDB.removeChannel(messagesChannel); if (presenceChannel) await chatDB.removeChannel(presenceChannel); }

    // ================= FILE UPLOAD =================
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    async function uploadFile(file: File): Promise<string | null> {
        if (!file || file.size > MAX_FILE_SIZE) { alert("Max 50 MB"); return null; }
        try {
            const extension = file.name.split(".").pop() ?? "";
            const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
            const storagePath = `chat-attachments/${filename}`;
            const { error } = await chatDB.storage.from("attachments").upload(storagePath, file);
            if (error) throw error;
            const { data } = chatDB.storage.from("attachments").getPublicUrl(storagePath);
            return data.publicUrl;
        } catch (err) { console.error(err); alert("Upload failed."); return null; }
    }

    // ================= MESSAGES =================
    async function loadMessages({ roomId, groupId }: { roomId?: string; groupId?: string; }) {
        if (isLoadingMessages) return;
        if (!roomId && !groupId) { messages = []; return; }
        isLoadingMessages = true;
        try {
            let query = chatDB.from("messages").select("*");
            query = groupId ? query.eq("group_id", groupId) : query.eq("room_id", roomId);
            const { data, error } = await query.order("created_at", { ascending: true });
            if (error) throw error;
            const senderIds = [...new Set((data || []).map(m => m.sender_id))];
            const { data: users } = await chatDB.from("users").select("id,name,mobile").in("id", senderIds);
            const userMap = new Map((users || []).map(u => [u.id, u]));
            const currentUserId = getCurrentUserId();
            messages = (data || []).map(msg => ({ ...msg, users: userMap.get(msg.sender_id), is_own: msg.sender_id === currentUserId, type: msg.template_id ? "template" : msg.attachments?.length ? "attachment" : "text", status: msg.status ?? "sent" }));
        } catch (err) { console.error(err); messages = []; } finally { isLoadingMessages = false; }
    }

    function subscribeToMessages({ roomId, groupId }: { roomId?: string; groupId?: string; }) {
        if (messagesChannel) chatDB.removeChannel(messagesChannel);
        const filter = groupId ? `group_id=eq.${groupId}` : `room_id=eq.${roomId}`;
        messagesChannel = chatDB.channel(`chat-${groupId ?? roomId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, async ({ new: newMessage }) => {
                if (newMessage.sender_id === getCurrentUserId()) return;
                const { data: sender } = await chatDB.from("users").select("id,name,mobile").eq("id", newMessage.sender_id).single();
                messages = [...messages, { ...newMessage, users: sender, is_own: false, type: newMessage.template_id ? "template" : newMessage.attachments?.length ? "attachment" : "text", status: newMessage.status ?? "delivered" }];
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, ({ new: updated }) => {
                messages = messages.map(m => m.id === updated.id ? { ...m, status: updated.status } : m);
            }).subscribe();
    }

    async function markMessagesAsRead() {
        if (!selectedRoomId && !selectedGroupId) return;
        const currentUserId = getCurrentUserId();
        const unread = messages.filter(m => !String(m.id).startsWith("temp-") && m.sender_id !== currentUserId && m.status !== "read");
        if (!unread.length) return;
        const ids = unread.map(m => m.id);
        await chatDB.from("messages").update({ status: "read" }).in("id", ids);
        messages = messages.map(m => ids.includes(m.id) ? { ...m, status: "read" } : m);
    }

    async function sendMessage(event: CustomEvent) {
        const { content, files, template } = event.detail;
        const isGroupChat = !!selectedGroupId;
        if (!content?.trim() && (!files || files.length === 0) && !template) return;
        if (!selectedRoomId && !selectedGroupId) return;
        const currentUserId = getCurrentUserId();
        await ensureUserExists(currentUserId);
        let attachmentUrls: string[] = [];
        if (files?.length) { uploadingFiles = files; attachmentUrls = (await Promise.all(files.map(uploadFile))).filter(Boolean) as string[]; uploadingFiles = []; }
        const templateSnapshot = template ? { id: template.id, name: template.name, values: structuredClone(template.values), chart: template.chart, fields: template.fields } : null;
        const tempId = `temp-${Date.now()}`;
        messages = [...messages, { id: tempId, sender_id: currentUserId, receiver_id: isGroupChat ? undefined : selectedContact?.id, room_id: isGroupChat ? undefined : selectedRoomId ?? undefined, group_id: isGroupChat ? selectedGroupId ?? undefined : undefined, content: content?.trim() || "", attachments: attachmentUrls, created_at: new Date().toISOString(), template_id: template?.id, template_data: templateSnapshot, is_own: true, status: "sending", type: template ? "template" : attachmentUrls.length ? "attachment" : "text", users: { id: currentUserId, name: "You" } }];
        try {
            const { data, error } = await chatDB.from("messages").insert({ sender_id: currentUserId, receiver_id: isGroupChat ? null : selectedContact?.id, room_id: isGroupChat ? null : selectedRoomId, group_id: isGroupChat ? selectedGroupId : null, content: content?.trim() || null, attachments: attachmentUrls.length ? attachmentUrls : null, template_id: template?.id ?? null, template_data: templateSnapshot, event: "message", extension: "chat", private: !isGroupChat, status: "sent" }).select().single();
            if (error) throw error;
            messages = messages.map(m => m.id === tempId ? { ...data, users: { id: currentUserId, name: "You" }, is_own: true, type: template ? "template" : attachmentUrls.length ? "attachment" : "text", status: "sent" } : m);
        } catch (err) { console.error(err); messages = messages.filter(m => m.id !== tempId); alert("Failed to send"); }
    }

    // ================= GROUPS / CONTACTS =================
    async function loadGroups() {
        try {
            const currentUserId = getCurrentUserId();
            const { data, error } = await chatDB.from("chat_groups").select(`id,name,description,avatar_url,created_at,created_by,chat_group_members!inner(user_id)`).eq("chat_group_members.user_id", currentUserId).order("created_at", { ascending: false });
            if (error) throw error; groups = data ?? [];
        } catch (error) { console.error(error); groups = []; }
    }

    async function loadGroupMembers(groupId: string) {
        try {
            const { data, error } = await chatDB.from("chat_group_members").select(`users:user_id(id,name,email,mobile,avatar_url)`).eq("group_id", groupId);
            if (error) throw error; groupMembers = (data ?? []).map((m: any) => m.users);
        } catch (error) { console.error(error); groupMembers = []; }
    }

    async function loadContacts() {
        try {
            const currentUserId = getCurrentUserId();
            const { data, error } = await chatDB.from("rooms").select(`id,user1_id,user2_id,user1:user1_id(id,name,mobile,email,avatar_url),user2:user2_id(id,name,mobile,email,avatar_url)`).or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);
            if (error) throw error;
            contacts = (data ?? []).map((room: any) => {
                const otherUser = room.user1_id === currentUserId ? room.user2 : room.user1;
                return { ...otherUser, room_id: room.id };
            });
        } catch (error) { console.error(error); contacts = []; }
    }

    async function selectContact(event: any) {
        const contact = event.detail ?? event;
        selectedGroup = null; selectedGroupId = null; groupMembers = [];
        selectedContact = { ...contact }; selectedRoomId = contact.room_id;
        await tick(); await loadMessages({ roomId: selectedRoomId! }); subscribeToMessages({ roomId: selectedRoomId! }); await markMessagesAsRead();
    }

    async function createContact(){
        if(!contactName.trim()){ alert("Enter Contact Name"); return; }
        const {data:user,error:userError}=await chatDB.from("users").insert({ id:crypto.randomUUID(), name:contactName, mobile:contactMobile, email:contactEmail }).select().single();
        if(userError){ console.error(userError); alert(userError.message); return; }
        await chatDB.from("rooms").insert({ user1_id:getCurrentUserId(), user2_id:user.id });
        showContactForm=false; contactName=""; contactMobile=""; contactEmail=""; department=""; await loadContacts();
    }

    async function createGroup(){
        if(!groupName.trim()){ alert("Enter Group Name"); return; }
        const {data:group,error}=await chatDB.from("chat_groups").insert({ name:groupName, description:groupDesc, created_by:getCurrentUserId() }).select().single();
        if(error){ console.error(error); alert(error.message); return; }
        await chatDB.from("chat_group_members").insert({ group_id:group.id, user_id:getCurrentUserId() });
        groupName=""; groupDesc=""; showGroupForm=false; await loadGroups();
    }

    async function selectGroup(event: any) {
        const group = event.detail ?? event;
        selectedContact = null; selectedRoomId = null;
        selectedGroup = { ...group }; selectedGroupId = group.id;
        await tick(); await loadGroupMembers(selectedGroupId!); await loadMessages({ groupId: selectedGroupId! }); subscribeToMessages({ groupId: selectedGroupId! }); await markMessagesAsRead();
    }

    // ================= TEMPLATES =================
    async function loadTemplates() {
        try {
            const response = await fetch(`/api/templates?t=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) { templates = []; return; }
            const json = await response.json();
            templates = (json.templates || []).map((t: any) => ({ ...t, data: typeof t.data === "string" ? JSON.parse(t.data) : structuredClone(t.data || {}) }));
        } catch (err) { console.error(err); templates = []; }
    }
    function openTemplatePopup() { loadTemplates(); showTemplatePopup = true; }
    function selectTemplate(event: CustomEvent) {
        const selected = event.detail; const latest = templates.find(t => t.id === selected.id) || selected;
        const templateData = typeof latest.data === "string" ? JSON.parse(latest.data) : structuredClone(latest.data || {});
        templateData.fields = (templateData.fields || []).map((f: any) => ({ ...f, field_type: f.field_type ?? f.type ?? "text", field_name: f.field_name ?? f.name ?? "", label: f.label ?? "", required: !!f.required }));
        selectedTemplate = { ...latest, data: templateData }; showTemplatePopup = false; showTemplateForm = true;
    }

    async function sendTemplateReport(event: CustomEvent) {
        const { template, values } = event.detail;
        const payload = { reference_template_id: template.id, t_code: template.template_code || template.t_code, ts: new Date().toISOString(), shift: values.shift ?? null, station: values.station ?? null, user_name: currentUser?.name ?? "Guest", data: values };
        const { error } = await templateDB.from("records").insert(payload);
        if (error) { console.error("Insert Error:", error); alert(error.message); return; }
        const templateData = structuredClone(template.data || {});
        templateData.last_values = values;
        await templateDB.from("templates").update({ data: templateData }).eq("id", template.id);
        await sendMessage(new CustomEvent("sendMessage", { detail: { content: `📋 ${template.name}`, template: { ...template, values } }}));
        showTemplateForm = false; selectedTemplate = null;
    }

    // ================= STUBS =================
    function editContact() { alert("Edit contact TBD"); }
    function editGroup() { alert("Edit group TBD"); }
    function deleteContact() { alert("Delete contact TBD"); }
    function deleteGroup() { alert("Delete group TBD"); }
    function openAddMembers() { showAddMembersForm = true; availableContacts = contacts.filter(c => !groupMembers.find(gm => gm.id === c.id)); }
    function toggleContactSelection(id: string) { selectedContactsToAdd.includes(id) ? selectedContactsToAdd = selectedContactsToAdd.filter(x => x !== id) : selectedContactsToAdd = [...selectedContactsToAdd, id]; }
    async function addMembersToGroup() { alert("Add members TBD"); showAddMembersForm = false; }

    // ================= LIFECYCLE =================
    onMount(async () => { await checkAuth(); });
    onDestroy(async () => { await cleanupRealtime(); });
</script>

{#if isAuthChecked}
<div class="chat-container">
    <ChatSidebar 
        {groups} {contacts} {selectedGroup} {selectedContact}
        loading={false}
        on:newGroup={() => showGroupForm = true}
        on:newContact={() => showContactForm = true}
        on:selectGroup={selectGroup}
        on:selectContact={selectContact}
        on:editContact={editContact}
        on:editGroup={editGroup}
        on:deleteContact={deleteContact}
        on:deleteGroup={deleteGroup} />

    <section class="chat-area">
        {#if selectedContact || selectedGroup}
            <ChatHeader 
                title={selectedContact?.name ?? selectedGroup?.name}
                subtitle={selectedContact ? (isUserOnline(selectedContact.id) ? "Online" : "Offline") : `${groupMembers.length} Members`}
                online={selectedContact ? isUserOnline(selectedContact.id) : false}
                typing={typing} isGroup={!!selectedGroup} memberCount={groupMembers.length}
                on:menu={selectedGroup ? openAddMembers : () => {}}
                on:back={() => { selectedRoomId = null; selectedGroupId = null; selectedContact = null; selectedGroup = null; groupMembers = []; messages = []; }} />
            
            {#if isLoadingMessages}<div class="loading">Loading messages...</div>{/if}
            <MessageList {messages} selectedUser={selectedContact || selectedGroup} currentUserId={getCurrentUserId()} />
            <ChatInput {uploadingFiles} on:sendMessage={sendMessage} on:openTemplate={openTemplatePopup} />
        {:else}
            <div class="empty"><h2>💬 Select Contact or Group</h2></div>
        {/if}
    </section>
</div>
{/if}

<input bind:this={fileInput} type="file" hidden multiple />

{#if showTemplatePopup}<div class="overlay"><TemplatePopup {templates} on:close={() => showTemplatePopup = false} on:use={selectTemplate} /></div>{/if}
{#if showTemplateForm && selectedTemplate}<div class="overlay"><TemplateForm template={selectedTemplate} on:submit={sendTemplateReport} on:close={() => showTemplateForm = false} /></div>{/if}
{#if showCreateTemplate}<div class="overlay"><TemplateDesigner {templates} on:close={() => showCreateTemplate = false} /></div>{/if}

{#if showContactForm}
<div class="overlay">
    <div class="popup">
        <h2>New Contact</h2>
        <input bind:value={contactName} placeholder="Contact Name" />
        <input bind:value={contactMobile} placeholder="Mobile" />
        <input bind:value={contactEmail} placeholder="Email" />
        <input bind:value={department} placeholder="Department" />
        <div class="buttons">
            <button on:click={createContact}>Save</button>
            <button on:click={() => showContactForm=false}>Cancel</button>
        </div>
    </div>
</div>
{/if}

{#if showGroupForm}
<div class="overlay">
    <div class="popup">
        <h2>Create Group</h2>
        <input bind:value={groupName} placeholder="Group Name" />
        <textarea bind:value={groupDesc} placeholder="Description"></textarea>
        <div class="buttons">
            <button on:click={createGroup}>Create</button>
            <button on:click={() => showGroupForm=false}>Cancel</button>
        </div>
    </div>
</div>
{/if}

<style>
.chat-container{
    display:flex;
    width:100%;
    height:calc(100vh - 60px);
    overflow:hidden;
    background:#f8fafc;
}

.chat-area{
    flex:1;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    min-width:0;
}

.loading{
    padding:30px;
    text-align:center;
    font-size:18px;
    color:#64748b;
}

.empty{
    flex:1;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    color:#64748b;
    background:white;
    text-align:center;
    padding:20px;
}

.empty h2{
    margin-bottom:10px;
    color:#334155;
}

/* ---------------- Popup ---------------- */

.overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.45);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:9999;
    padding:20px;
}

.popup{
    background:white;
    width:100%;
    max-width:450px;
    border-radius:14px;
    padding:25px;
    display:flex;
    flex-direction:column;
    gap:16px;
    box-shadow:0 15px 40px rgba(0,0,0,.25);
}

.popup h2{
    margin:0;
    color:#1e293b;
    font-size:22px;
}

.popup input,
.popup textarea{
    width:100%;
    padding:12px 14px;
    border:1px solid #d1d5db;
    border-radius:8px;
    font-size:14px;
    outline:none;
}

.popup textarea{
    min-height:100px;
    resize:vertical;
}

.popup input:focus,
.popup textarea:focus{
    border-color:#2563eb;
    box-shadow:0 0 0 3px rgba(37,99,235,.15);
}

.buttons{
    display:flex;
    justify-content:flex-end;
    gap:12px;
}

.buttons button{
    padding:10px 20px;
    border:none;
    border-radius:8px;
    cursor:pointer;
    font-weight:600;
}

.buttons button:first-child{
    background:#2563eb;
    color:white;
}

.buttons button:last-child{
    background:#e5e7eb;
}

/* ---------------- Tablet ---------------- */

@media (max-width:900px){

    .chat-container{
        flex-direction:column;
        height:calc(100vh - 60px);
    }

    .chat-area{
        width:100%;
        min-width:0;
    }

}

/* ---------------- Mobile ---------------- */

@media (max-width:600px){

    .chat-container{
        flex-direction:column;
        height:calc(100vh - 60px);
    }

    .chat-area{
        width:100%;
        min-width:0;
    }

    .popup{
        width:95%;
        padding:18px;
    }

    .buttons{
        flex-direction:column;
    }

    .buttons button{
        width:100%;
    }

}
</style>