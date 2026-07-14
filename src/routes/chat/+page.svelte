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
    import EmojiPicker from 'emoji-picker-element'; // npm i emoji-picker-element

    import { supabase } from '$lib/supabase';
    import type { RealtimeChannel } from '@supabase/supabase-js';
    import { openDB } from 'idb'; // npm i idb

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
    let isLoadingOlder = false; // For scroll load

    let subscription: RealtimeChannel | null = null;

    // Network status
    let isOnline = true;
    let lastSync = '';

    let online = false; // Kept to avoid crashes, not used in UI
    let typing = false;

    // 6. Emoji
    let showEmoji = false;
    let emojiPicker: any;
    let emojiPickerContainer: HTMLElement;

    // 7. Mic recording
    let isRecording = false;
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let micStream: MediaStream | null = null;

    /* -----------------------------
       INDEXEDDB - LOAD REDUCE
    ------------------------------*/

    const dbPromise = openDB('erp-chat-cache', 1, {
        upgrade(db) {
            db.createObjectStore('messages', { keyPath: 'id' });
            db.createObjectStore('chats', { keyPath: 'id' });
        }
    });

    async function cacheMessages(msgs: any[]) {
        const db = await dbPromise;
        const tx = db.transaction('messages', 'readwrite');
        await Promise.all(msgs.map(m => tx.store.put(m)));
        await tx.done;
    }

    async function getCachedMessages(roomId: string, beforeTs?: number) {
        const db = await dbPromise;
        const all = await db.getAll('messages');
        let filtered = all.filter(m => m.room_id === roomId);
        if (beforeTs) filtered = filtered.filter(m => m.created_at < beforeTs);
        // 4. DESC order, last 50
        return filtered
         .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .slice(0, 50)
         .reverse(); // Show oldest of 50 first
    }

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
       ROOM ID
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
                const otherUser = room.user1_id === userId? room.user2 : room.user1;
                return {
                 ...otherUser,
                    room_id: room.id,
                    user1_id: room.user1_id,
                    user2_id: room.user2_id,
                    members: [room.user1, room.user2] // 2. For 9-grid icon
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
       SELECT CONTACT
    ------------------------------*/

    async function selectContact(event: any) {
        const contact = event.detail?? event;

        console.log("Selected Contact:", contact);

        selectedGroup = null;
        selectedContact = {...contact };
        selectedRoomId = contact.room_id || getRoomId(getCurrentUserId(), contact.id);

        console.log("Selected Room:", selectedRoomId);

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
        const group = event.detail?? event;

        selectedContact = null;
        selectedGroup = {...group };
        selectedRoomId = group.id;

        console.log("Selected Group:", group);

        await loadMessages(group.id);
        subscribeToChat(group.id);
        await tick();
    }

    /* -----------------------------
       MESSAGES - 3. SINGLE QUERY, LAST 50, DESC
    ------------------------------*/

    async function loadMessages(roomId?: string) {
        if (isLoadingMessages) return;

        if (!roomId) {
            messages = [];
            return;
        }

        isLoadingMessages = true;

        try {
            // 1. Try cache first - 0 server load
            const cached = await getCachedMessages(roomId);
            if (cached.length > 0) {
                messages = cached;
                await tick();
                scrollToBottom();
                isLoadingMessages = false;
                return;
            }

            // 2. If no cache, single query from server
            if (!(await testNetwork())) {
                isLoadingMessages = false;
                return;
            }

            const { data, error } = await supabase
             .from("messages")
             .select("*")
             .eq("room_id", roomId)
             .order("created_at", { ascending: false }) // DESC
             .limit(50); // 4. Last 50 only

            if (error) throw error;

            const processed = await Promise.all(
                (data || []).reverse().map(async (m: any) => { // reverse to show oldest first
                    try {
                        const { data: user } = await supabase
                         .from("users")
                         .select("id, name, mobile")
                         .eq("id", m.sender_id)
                         .maybeSingle();

                        m.users = user?? null;
                    } catch (err) {
                        console.error("User fetch error:", err);
                        m.users = null;
                    }

                    m.is_own = m.sender_id === getCurrentUserId();

                    if (m.report_id) {
                        try {
                            const r = await fetch(
                                `/api/templates/report-view?id=${m.report_id}`,
                                { headers: authHeader() }
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

            messages = processed;
            await cacheMessages(processed); // Save to cache

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

    // 4. Load older on scroll top - cache only, no server
    async function loadOlderMessages() {
        if (isLoadingOlder ||!selectedRoomId || messages.length === 0) return;
        isLoadingOlder = true;

        const oldestTs = messages[0].created_at;
        const older = await getCachedMessages(selectedRoomId, oldestTs);

        if (older.length > 0) {
            messages = [...older,...messages];
        }
        isLoadingOlder = false;
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

                    newMsg.users = user?? null;
                    newMsg.is_own = newMsg.sender_id === getCurrentUserId();

                    messages = [...messages, newMsg];
                    await cacheMessages([newMsg]); // Cache new msg
                    await tick();
                    scrollToBottom();
                }
            )
         .subscribe((status) => {
                console.log("Realtime:", status);
                if (status === 'SUBSCRIBED') {
                    isOnline = true;
                    online = true;
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    isOnline = false;
                    online = false;
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

    // 4. Scroll handler for loading older
    function handleScroll(e: Event) {
        const target = e.target as HTMLElement;
        if (target.scrollTop === 0) {
            loadOlderMessages();
        }
    }

    /* -----------------------------
       SEND MESSAGE - FIXED: Works for groups too
    ------------------------------*/

    async function sendMessage() {
        const text = message.trim();

        // FIX: Works for both contact and group
        if (!text ||!selectedRoomId || (!selectedContact &&!selectedGroup)) {
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
                    receiverId: selectedContact?.id || selectedGroup?.id, // FIX: Support group
                    message: text
                })
            });

            const result = await response.json();

            if (!response.ok ||!result.success) {
                throw new Error(result.message || result.error || "Failed to send message");
            }

            messages = [...messages, result.data];
            await cacheMessages([result.data]);
            message = "";
            showEmoji = false; // Close emoji after send

        } catch (err: any) {
            console.error("SEND MESSAGE ERROR:", err);
            isOnline = false;
        }
    }

    /* -----------------------------
       CREATE GROUP
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
        if (!contactMobile.trim() ||!contactEmail.trim()) {
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
                    user1_id: userId < contactId? userId : contactId,
                    user2_id: userId < contactId? contactId : userId
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
       5. DELETE/EDIT CONTACT/GROUP
    ------------------------------*/

    async function deleteContact(id: string) {
        if (!confirm('Delete this contact?')) return;
        await supabase.from('rooms').delete().eq('id', id);
        await loadContacts();
        selectedContact = null;
        selectedRoomId = null;
    }

    async function deleteGroup(id: string) {
        if (!confirm('Delete this group?')) return;
        await supabase.from('chat_groups').delete().eq('id', id);
        await loadGroups();
        selectedGroup = null;
        selectedRoomId = null;
    }

    /* -----------------------------
       7. MIC RECORDING - FIXED: Cleanup stream
    ------------------------------*/

    async function toggleRecording() {
        if (!isRecording) {
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(micStream);
                audioChunks = [];
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    // Send as message - you need backend to handle file upload
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'voice.webm');
                    formData.append('roomId', selectedRoomId!);
                    // await fetch('/api/messages/voice', { method: 'POST', body: formData });
                    alert('Voice recorded. Add upload API to send.');
                    // Cleanup
                    micStream?.getTracks().forEach(track => track.stop());
                    micStream = null;
                };
                mediaRecorder.start();
                isRecording = true;
            } catch (err) {
                alert('Mic access denied');
            }
        } else {
            mediaRecorder?.stop();
            isRecording = false;
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
       LIFECYCLE - FIXED: Emoji picker init
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

        // 6. Init emoji picker safely
        tick().then(() => {
            emojiPicker = document.querySelector('emoji-picker');
            emojiPicker?.addEventListener('emoji-click', (e: any) => {
                message += e.detail.unicode;
                showEmoji = false;
            });
        });
    });

    onDestroy(() => {
        if (subscription) {
            subscription.unsubscribe();
        }
        socket?.close();
        // Cleanup mic stream
        micStream?.getTracks().forEach(track => track.stop());
    });

    function selectTemplate(event: CustomEvent) {
        selectedTemplate = event.detail;
        templateFields = selectedTemplate.fields?? [];
        showTemplatePopup = false;
        showTemplateForm = true;
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
        on:deleteContact={(e) => deleteContact(e.detail.id)}
        on:deleteGroup={(e) => deleteGroup(e.detail.id)}
    />

    <!-- ================= CHAT ================= -->

    <section class="chat-area">

        {#if selectedRoomId}

            <!-- HEADER - 1. NO ONLINE STATUS -->

            <ChatHeader
                title={selectedContact?.name?? selectedGroup?.name}
                subtitle={selectedContact? selectedContact.mobile : `${selectedGroup?.members?? 0} members`}
                online={false}
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

            <!-- ================= MESSAGES - 8. SCROLL FADE ================= -->

            <div class="messages" on:scroll={handleScroll}>
                <MessageList
                    {messages}
                    on:install={(e) => installTemplate(e.detail)}
                />
            </div>

            <!-- ================= TYPING ================= -->

            {#if typingStatus}
                <div class="typing">{typingStatus}</div>
            {/if}

            <!-- ================= MESSAGE BOX - 6. EMOJI + 7. MIC ================= -->

            <div class="message-box">
                <button class="icon-btn" on:click={() => showEmoji =!showEmoji}>😀</button>
                {#if showEmoji}
                    <div class="emoji-popup" bind:this={emojiPickerContainer}>
                        <emoji-picker></emoji-picker>
                    </div>
                {/if}

                <input
                    bind:value={message}
                    placeholder="Type your message..."
                    on:input={notifyTyping}
                    on:keydown={(e) => {
                        if (e.key === "Enter")
                            sendMessage();
                    }}
                    disabled={!isOnline ||!selectedRoomId}
                />

                <!-- 7. MIC BUTTON -->
                <button class="icon-btn" class:recording={isRecording} on:click={toggleRecording}>
                    {#if isRecording}⏹️{:else}🎤{/if}
                </button>

                <button on:click={sendMessage} disabled={!isOnline ||!selectedRoomId}>Send</button>
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

/* 8. SCROLL INDICATION TRANSPARENCY */
.messages{
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    mask-image: linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%);
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
    position: relative;
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
.icon-btn{
    background: none!important;
    color: #666!important;
    padding: 8px!important;
    font-size: 20px;
}
.icon-btn.recording{
    background: #ef4444!important;
    color: white!important;
    animation: pulse 1s infinite;
}
.emoji-popup{
    position: absolute;
    bottom: 70px;
    left: 12px;
    z-index: 100;
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