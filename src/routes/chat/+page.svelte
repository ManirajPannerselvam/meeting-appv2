<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";
    import TemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
    import TemplateInputForm from "$lib/components/templates/TemplateInputForm.svelte";
    import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
    import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
    import MessageList from "$lib/components/chat/MessageList.svelte";
    import TemplateDesigner from "$lib/components/templates/designer/TemplateDesigner.svelte";
    import TemplateForm from "$lib/components/templates/form/TemplateForm.svelte";
    
    import { supabase } from '$lib/supabase';
    import type { RealtimeChannel } from '@supabase/supabase-js';

    /* -----------------------------
       STATE
    ------------------------------*/

    let groups: any[] = [];
    let contacts: any[] = [];
    let messages: any[] = [];

    let selectedGroup: any = null;
    let selectedContact: any = null;
    let selectedRoomId: string | null = null;

    let showCreateTemplate = false;
    let showTemplateDesigner = false;

    let message = "";
    let typingStatus = "";

    let socket: WebSocket | null = null;
    let refresh: any = null;
    let isLoadingMessages = false;

    let subscription: RealtimeChannel | null = null;

    // Network status
    let isOnline = true;
    let lastSync = '';

    /* -----------------------------
       POPUPS
    ------------------------------*/

    let showGroupForm = false;
    let showContactForm = false;

    /* -----------------------------
       TEMPLATE UI
    ------------------------------*/

    let showTemplatePopup = false;
    let showTemplateForm = false;
    let selectedTemplate: any = null;
    let templates: any[] = [];
    let templateFields: any[] = [];

    /* -----------------------------
       FORM DATA
    ------------------------------*/

    let groupName = "";
    let groupDesc = "";
    let contactName = "";
    let contactMobile = "";
    let department = "";
    let contactEmail = "";

    /* -----------------------------
       AUTH
    ------------------------------*/

    function token(): string {
        return localStorage.getItem("token") || "";
    }

    function authHeader() {
        const t = token();
        if (!t) return {};
        return {
            Authorization: `Bearer ${t}`
        };
    }

    function getCurrentUserId() {
        return localStorage.getItem("userId") || "";
    }

    /* -----------------------------
       ROOM ID - ✅ ADDED
    ------------------------------*/

    function getRoomId(userId1: string, userId2: string) {
        return [userId1, userId2].sort().join('_');
    }

    /* -----------------------------
       NETWORK TEST
    ------------------------------*/

    async function testNetwork() {
        try {
            const res = await fetch("/api/ping", {
                headers: authHeader()
            });
            isOnline = res.ok;
            if (isOnline) {
                lastSync = new Date().toLocaleTimeString('en-IN');
            }
            return isOnline;
        } catch {
            isOnline = false;
            return false;
        }
    }

    /* -----------------------------
       GROUPS
    ------------------------------*/

    async function loadGroups() {
        if (!token()) {
            goto("/login");
            return;
        }
        try {
            const res = await fetch("/api/recent-chats", {
                headers: authHeader()
            });
            if (res.status === 401) {
                goto("/login");
                return;
            }
            const data = await res.json();
            groups = data.chats || [];
        } catch (err) {
            console.error("loadGroups error:", err);
            isOnline = false;
        }
    }

    /* -----------------------------
       CONTACTS - Load with room_id
    ------------------------------*/

    async function loadContacts() {
        try {
            const userId = getCurrentUserId();
            if (!userId) return;

            const { data, error } = await supabase
                .from('rooms')
                .select(`
                    id,
                    user1_id,
                    user2_id,
                    user1:user1_id(id, name, mobile, email),
                    user2:user2_id(id, name, mobile, email)
                `)
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

            if (error) throw error;

            contacts = (data || []).map((room: any) => {
                const otherUser = room.user1_id === userId ? room.user2 : room.user1;
                return {
                    ...otherUser,
                    room_id: room.id,
                    user1_id: room.user1_id,
                    user2_id: room.user2_id
                };
            });
            
            console.log('Loaded contacts:', contacts);
        } catch (err) {
            console.error("loadContacts error:", err);
            isOnline = false;
        }
    }

    /* -----------------------------
       TEMPLATES
    ------------------------------*/

    async function loadTemplates() {
        try {
            const res = await fetch("/api/templates");
            if (!res.ok) {
                throw new Error(await res.text());
            }
            const data = await res.json();
            templates = data.templates || data;
            console.log("Templates:", templates);
        } catch (e) {
            console.error("loadTemplates error:", e);
        }
    }

    async function loadTemplateFields(templateId: number) {
        try {
            const res = await fetch(`/api/templates/fields?id=${templateId}`, {
                headers: authHeader()
            });
            if (res.ok) {
                templateFields = await res.json();
            } else {
                templateFields = [];
            }
        } catch (err) {
            console.error("loadTemplateFields error:", err);
            templateFields = [];
        }
    }

    /* -----------------------------
       SELECT CONTACT - ✅ FIXED
    ------------------------------*/

    async function selectContact(event: any) {
        const contact = event.detail ?? event;

        console.log("Selected Contact:", contact);

        selectedGroup = null;
        
        // ✅ FIX: Spread contact, not selectedContact
        selectedContact = { ...contact };
        
        selectedRoomId = contact.room_id || getRoomId(getCurrentUserId(), contact.id);

        console.log("Selected Room:", selectedRoomId);
        console.log("selectedContact state:", selectedContact);

        if (!selectedRoomId) {
            console.error('❌ room_id missing');
            alert('Room not found');
            return;
        }

        await loadMessages(selectedRoomId);
        subscribeToChat(selectedRoomId);
        await tick();
    }

    /* -----------------------------
       SELECT GROUP
    ------------------------------*/

    async function selectGroup(event: any) {
        const group = event.detail ?? event;

        selectedContact = null;
        selectedGroup = { ...group }; // ✅ Force reactivity
        selectedRoomId = group.id;

        console.log("Selected Group:", group);

        await loadMessages(group.id);
        subscribeToChat(group.id);
        await tick();
    }

    /* -----------------------------
       MESSAGES
    ------------------------------*/

    async function loadMessages(roomId?: string) {
        if (isLoadingMessages) return;

        if (!roomId) {
            messages = [];
            return;
        }

        isLoadingMessages = true;

        try {
            if (!(await testNetwork())) {
                isLoadingMessages = false;
                return;
            }

            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true });

            if (error) throw error;

            messages = await Promise.all(
                (data || []).map(async (m: any) => {
                    try {
                        const { data: user } = await supabase
                            .from("users")
                            .select("id, name, mobile")
                            .eq("id", m.sender_id)
                            .maybeSingle();

                        m.users = user ?? null;
                    } catch (err) {
                        console.error("User fetch error:", err);
                        m.users = null;
                    }

                    m.is_own = m.sender_id === getCurrentUserId();

                    if (m.template_id) {
                        try {
                            const r = await fetch(
                                `/api/templates/report-view?id=${m.template_id}`,
                                {
                                    headers: authHeader()
                                }
                            );

                            if (r.ok) {
                                const reportData = await r.json();
                                m.report = reportData.data || reportData;
                                m.type = "template";
                            }
                        } catch (err) {
                            console.error("Report fetch error:", err);
                        }
                    }

                    return m;
                })
            );

            console.log("Loaded messages:", messages);
            await tick();
            scrollToBottom();

        } catch (err) {
            console.error("loadMessages error:", err);
            isOnline = false;
        } finally {
            isLoadingMessages = false;
        }
    }

    /* -----------------------------
       REALTIME SUBSCRIPTION
    ------------------------------*/
    
    function subscribeToChat(roomId?: string) {
        if (subscription) {
            supabase.removeChannel(subscription);
            subscription = null;
        }

        if (!roomId) return;

        subscription = supabase
            .channel(`room:${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `room_id=eq.${roomId}`
                },
                async (payload) => {
                    const newMsg: any = payload.new;

                    if (messages.some(m => m.id === newMsg.id)) {
                        return;
                    }

                    const { data: user } = await supabase
                        .from("users")
                        .select("id, name, mobile")
                        .eq("id", newMsg.sender_id)
                        .maybeSingle();

                    newMsg.users = user ?? null;
                    newMsg.is_own = newMsg.sender_id === getCurrentUserId();

                    messages = [...messages, newMsg];
                    await tick();
                    scrollToBottom();
                }
            )
            .subscribe((status) => {
                console.log("Realtime:", status);
                if (status === 'SUBSCRIBED') {
                    isOnline = true;
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    isOnline = false;
                }
            });
    }

    /* -----------------------------
       AUTO SCROLL
    ------------------------------*/

    function scrollToBottom() {
        requestAnimationFrame(() => {
            const element = document.querySelector(".messages");
            if (!element) return;
            element.scrollTop = element.scrollHeight;
        });
    }

    /* -----------------------------
       SEND MESSAGE
    ------------------------------*/

    async function sendMessage() {
        const text = message.trim();

        if (!text || !selectedRoomId || !selectedContact) {
            return;
        }

        try {
            const response = await fetch("/api/messages/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeader()
                },
                body: JSON.stringify({
                    roomId: selectedRoomId,
                    receiverId: selectedContact.id,
                    message: text
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || result.error || "Failed to send message");
            }

            messages = [...messages, result.data];
            message = "";

        } catch (err: any) {
            console.error("========== SEND MESSAGE ERROR ==========");
            console.error(err);
            console.error("Message:", err?.message);
            console.error("Code:", err?.code);
            console.error("Details:", err?.details);
            console.error("Hint:", err?.hint);
            isOnline = false;
        }
    }

    /* -----------------------------
       CREATE GROUP - ✅ ADDED
    ------------------------------*/

    async function createGroup() {
        if (!groupName.trim()) {
            alert('Group name required');
            return;
        }
        
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                alert('Please login first');
                return;
            }

            const { data: group, error: groupError } = await supabase
                .from('chat_groups')
                .insert({
                    name: groupName,
                    description: groupDesc,
                    created_by: userId
                })
                .select()
                .single();

            if (groupError) throw groupError;

            groupName = "";
            groupDesc = "";
            showGroupForm = false;
            await loadGroups();
            alert('Group created successfully');

        } catch (err: any) {
            console.error("createGroup error:", err);
            alert("Failed: " + err.message);
        }
    }

    /* -----------------------------
       CREATE CONTACT
    ------------------------------*/

    async function createContact() {
        if (!contactMobile.trim() || !contactEmail.trim()) {
            alert('Mobile and Email required');
            return;
        }
        
        try {
            const userId = getCurrentUserId();
            if (!userId) {
                alert('Please login first');
                return;
            }

            const { data: existingUser } = await supabase
                .from('users')
                .select('id, name, mobile, email')
                .or(`mobile.eq.${contactMobile},email.eq.${contactEmail}`)
                .single();

            let contactId;

            if (existingUser) {
                contactId = existingUser.id;
                console.log('User exists:', existingUser);
                
                await supabase
                    .from('users')
                    .update({ 
                        name: contactName || existingUser.name,
                        department: department || existingUser.department
                    })
                    .eq('id', contactId);
            } else {
                const { data: newUser, error: userError } = await supabase
                    .from('users')
                    .insert({
                        name: contactName,
                        mobile: contactMobile,
                        email: contactEmail,
                        department
                    })
                    .select()
                    .single();

                if (userError) throw userError;
                contactId = newUser.id;
            }

            const { data: existingRoom } = await supabase
                .from('rooms')
                .select('id')
                .or(`and(user1_id.eq.${userId},user2_id.eq.${contactId}),and(user1_id.eq.${contactId},user2_id.eq.${userId})`)
                .single();

            if (existingRoom) {
                alert('Contact already exists in your chat list');
                showContactForm = false;
                loadContacts();
                return;
            }

            const { error: roomError } = await supabase
                .from('rooms')
                .insert({
                    user1_id: userId < contactId ? userId : contactId,
                    user2_id: userId < contactId ? contactId : userId
                });

            if (roomError) throw roomError;

            contactName = "";
            contactMobile = "";
            contactEmail = "";
            department = "";
            showContactForm = false;
            await loadContacts();
            alert('Contact created successfully');

        } catch (err: any) {
            console.error("createContact error:", err);
            alert("Failed: " + err.message);
        }
    }

    /* -----------------------------
       TEMPLATE HANDLERS
    ------------------------------*/

    async function openTemplatePopup() {
        await loadTemplates();
        showTemplatePopup = true;
    }

    async function useTemplate(event: any) {
        selectedTemplate = event.detail;
        showTemplatePopup = false;
        await loadTemplateFields(selectedTemplate.id);
        showTemplateForm = true;
    }

    async function installTemplate(msg: any) {
        try {
            const res = await fetch("/api/templates/install", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeader()
                },
                body: JSON.stringify({
                    template_code: msg.template_code,
                    template_id: msg.template_id,
                    version: msg.template_version,
                    name: msg.template_name,
                    user: "Mani"
                })
            });

            const data = await res.json();

            if (data.success) {
                alert("✅ Template Installed Successfully");
                await loadTemplates();
            } else {
                alert("❌ Installation Failed");
            }
        } catch (err) {
            console.error("installTemplate error:", err);
            alert("❌ Installation Failed");
        }
    }

    async function sendTemplateReport(e: any) {
        try {
            const res = await fetch(
                "/api/templates/report",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...authHeader()
                    },
                    body: JSON.stringify({
                        template: e.detail.template,
                        values: e.detail.values,
                        sender: "Mani",
                        room_id: selectedRoomId
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to send report");
                return;
            }

            alert("✅ Report Sent Successfully");
            showTemplateForm = false;
            await loadMessages(selectedRoomId);
        } catch (err) {
            console.error("sendTemplateReport:", err);
            alert("❌ Failed to send report");
        }
    }

    /* -----------------------------
       WEBSOCKET - DISABLED
    ------------------------------*/

    function notifyTyping() {
        return;
    }

    function connectSocket() {
        console.log("WebSocket disabled - using Supabase Realtime");
        return;
    }

    /* -----------------------------
       LIFECYCLE
    ------------------------------*/

    onMount(() => {
        const userId = getCurrentUserId();
        if (!userId) {
            goto("/login");
            return;
        }
        loadGroups();
        loadContacts();
        testNetwork();
    });

    onDestroy(() => {
        if (subscription) {
            subscription.unsubscribe();
        }
        socket?.close();
    });

    function selectTemplate(event: CustomEvent) {
        selectedTemplate = event.detail;
        templateFields = selectedTemplate.fields ?? [];
        console.log("========== SELECTED TEMPLATE ==========");
        console.log(selectedTemplate);
        console.log("FIELDS:", templateFields);
        console.log("FIELDS COUNT:", templateFields.length);
        showTemplatePopup = false;
        showTemplateForm = true;
        console.log("showTemplateForm =", showTemplateForm);
    }
</script>

<div class="chat-container">

    <!-- ================= SIDEBAR ================= -->

    <ChatSidebar
        {groups}
        {contacts}
        {selectedGroup}
        {selectedContact}
        on:newGroup={() => showGroupForm=true}
        on:newContact={() => showContactForm=true}
        on:selectGroup={selectGroup}
        on:selectContact={selectContact}
    />

    <!-- ================= CHAT ================= -->

    <section class="chat-area">

        {#if selectedRoomId}  <!-- ✅ FIXED: Changed from selectedGroup || selectedContact -->

            <!-- HEADER -->

            <ChatHeader
                title={selectedContact?.name ?? selectedGroup?.name}
                subtitle={selectedContact ? selectedContact.mobile : `${selectedGroup?.members ?? 0} members`}
                {online}
                {typing}
            />

            <!-- NETWORK STATUS BAR -->

            <div class="network-status" class:offline={!isOnline}>
                {#if isOnline}
                    <span class="dot online"></span> Online - Last sync: {lastSync}
                {:else}
                    <span class="dot offline"></span> Offline - Reconnecting...
                {/if}
            </div>

            <!-- ================= MESSAGES ================= -->

            <MessageList
                {messages}
                on:install={(e) => installTemplate(e.detail)}
            />

            <!-- ================= TYPING ================= -->

            {#if typingStatus}
                <div class="typing">{typingStatus}</div>
            {/if}

            <!-- ================= MESSAGE BOX ================= -->

            <div class="message-box">
                <input
                    bind:value={message}
                    placeholder="Type your message..."
                    on:input={notifyTyping}
                    on:keydown={(e) => {
                        if (e.key === "Enter")
                            sendMessage();
                    }}
                    disabled={!isOnline || !selectedRoomId}
                />
                <button on:click={sendMessage} disabled={!isOnline || !selectedRoomId}>Send</button>
            </div>

        {:else}
            <div class="empty-chat-screen">
                <h2>💬 Select a Group or Contact</h2>
                <p>Start chatting with your team.</p>
            </div>
        {/if}

    </section>

</div>

{#if showGroupForm}
<div class="popup">
    <div class="popup-card">
        <h2>Create Group</h2>
        <input bind:value={groupName} placeholder="Group Name" />
        <textarea bind:value={groupDesc} placeholder="Description"></textarea>
        <div class="popup-buttons">
            <button on:click={createGroup}>Create</button>
            <button class="cancel-btn" on:click={() => showGroupForm = false}>Cancel</button>
        </div>
    </div>
</div>
{/if}

{#if showContactForm}
<div class="popup">
    <div class="popup-card">
        <h2>Create Contact</h2>
        <input bind:value={contactName} placeholder="Name" />
        <input bind:value={contactMobile} placeholder="Mobile Number" />
        <input bind:value={contactEmail} placeholder="Email" />
        <input bind:value={department} placeholder="Department" />
        <div class="popup-buttons">
            <button on:click={createContact}>Create</button>
            <button class="cancel-btn" on:click={() => showContactForm = false}>Cancel</button>
        </div>
    </div>
</div>
{/if}

{#if showCreateTemplate}
<div class="overlay">
    <TemplateDesigner
        on:saved={async () => {
            showCreateTemplate = false;
            await loadTemplates();
        }}
        on:close={() => {
            showCreateTemplate = false;
        }}
    />
</div>
{/if}

{#if showTemplatePopup}
<div class="overlay">
    <TemplatePopup
        {templates}
        on:close={() => {
            showTemplatePopup = false;
        }}
        on:new={() => {
            showTemplatePopup = false;
            showTemplateDesigner = true;
        }}
        on:use={selectTemplate}
    />
</div>
{/if}

{#if showTemplateDesigner}
<div class="overlay">
    <TemplateDesigner
        on:close={() => {
            showTemplateDesigner = false;
        }}
        on:saved={async () => {
            showTemplateDesigner = false;
            await loadTemplates();
            showTemplatePopup = true;
        }}
    />
</div>
{/if}

{#if showTemplateForm && selectedTemplate}
<div class="overlay">
    <TemplateForm
        template={selectedTemplate}
        fields={selectedTemplate.fields}
        on:cancel={() => {
            showTemplateForm = false;
            selectedTemplate = null;
        }}
        on:submit={sendTemplateReport}
    />
</div>
{/if}

<style>
.overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.35);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:9999;
}
.chat-container{
    display:flex;
    height:100vh;
    background:#f0f2f5;
}
.chat-area{
    flex:1;
    display:flex;
    flex-direction:column;
    min-width: 0;
}
.network-status{
    padding: 6px 16px;
    background: #dcf8c6;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid #e5e7eb;
}
.network-status.offline{
    background: #ffebee;
}
.dot{
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}
.dot.online{
    background: #25d366;
}
.dot.offline{
    background: #ff3b30;
    animation: pulse 1.5s infinite;
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}
.typing{
    padding:8px 20px;
    font-size:13px;
    color:#666;
}
.message-box{
    height:70px;
    display:flex;
    align-items:center;
    gap:10px;
    padding:12px;
    background:white;
    border-top: 1px solid #e5e7eb;
}
.message-box input{
    flex:1;
    border:none;
    background:#f0f2f5;
    border-radius:30px;
    padding:12px 18px;
    outline: none;
}
.message-box input:disabled{
    opacity: 0.5;
    cursor: not-allowed;
}
.message-box button{
    padding:12px 20px;
    border:none;
    background:#2563eb;
    color:#fff;
    border-radius:30px;
    cursor:pointer;
    font-weight: 600;
}
.message-box button:hover:not(:disabled){
    background: #1d4ed8;
}
.message-box button:disabled{
    opacity: 0.5;
    cursor: not-allowed;
}
.empty-chat-screen{
    flex:1;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    color:#666;
}
.popup{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.5);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:100;
}
.popup-card{
    background:#fff;
    padding:24px;
    border-radius:12px;
    width:90%;
    max-width:500px;
}
.popup-card input,.popup-card textarea{
    width:100%;
    padding:10px;
    margin:8px 0;
    border:1px solid #ddd;
    border-radius:6px;
    font-family: inherit;
}
.popup-buttons{
    display:flex;
    gap:10px;
    justify-content:flex-end;
    margin-top:16px;
}
.popup-buttons button{
    padding:10px 20px;
    border:none;
    border-radius:6px;
    cursor:pointer;
    font-weight: 600;
}
.popup-buttons button:first-child{
    background: #2563eb;
    color: white;
}
.cancel-btn{
    background:#f0f2f5;
}
</style>