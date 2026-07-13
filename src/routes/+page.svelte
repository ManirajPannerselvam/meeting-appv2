<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";
    import TemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
    import TemplateForm from "$lib/components/templates/form/TemplateForm.svelte";
    import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
    import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
    import MessageList from "$lib/components/chat/MessageList.svelte";
    import ChatInput from "$lib/components/chat/ChatInput.svelte";
    import TemplateDesigner from "$lib/components/templates/designer/TemplateDesigner.svelte";

    import { supabase } from '$lib/supabase';

    /* -----------------------------
       STATE
    ------------------------------*/
    let groups: any[] = [];
    let contacts: any[] = [];
    let messages: any[] = [];
    let selectedGroup: any = null;
    let selectedContact: any = null;
    let selectedRoomId: string | null = null;
    let selectedGroupId: string | null = null;
    let groupMembers: any[] = [];
    let showCreateTemplate = false;
    let showTemplateDesigner = false;
    let typing = false;
    let typingTimeout: any;
    let isLoadingMessages = false;
    let online = false;
    let isOnline = true;
    let lastSync = '';
    let messagesChannel: any = null;
    let presenceChannel: any = null;
    let onlineUsers: Set<string> = new Set();
    let showGroupForm = false;
    let showContactForm = false;
    let showTemplatePopup = false;
    let showTemplateForm = false;
    let selectedTemplate: any = null;
    let templates: any[] = [];
    let groupName = "";
    let groupDesc = "";
    let contactName = "";
    let contactMobile = "";
    let department = "";
    let contactEmail = "";
    let showAddMembersForm = false;
    let availableContacts: any[] = [];
    let selectedContactsToAdd: string[] = [];
    let uploadingFiles: File[] = [];

    /* -----------------------------
       AUTH
    ------------------------------*/
    function token(): string {
        return localStorage.getItem("token") || "";
    }
    function authHeader() {
        const t = token();
        if (!t) return {};
        return { Authorization: `Bearer ${t}` };
    }
    function getCurrentUserId() {
        return localStorage.getItem("userId") || "";
    }

    /* -----------------------------
       PRESENCE - ONLINE/OFFLINE
    ------------------------------*/
    function setupPresence() {
        const userId = getCurrentUserId();
        if (!userId) return;

        presenceChannel = supabase.channel('online-users', {
            config: { presence: { key: userId } }
        });

        presenceChannel
           .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                onlineUsers = new Set(Object.keys(state));
            })
           .on('presence', { event: 'join' }, ({ key }) => {
                onlineUsers.add(key);
                onlineUsers = new Set(onlineUsers);
            })
           .on('presence', { event: 'leave' }, ({ key }) => {
                onlineUsers.delete(key);
                onlineUsers = new Set(onlineUsers);
            })
           .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
                }
            });
    }

    function isUserOnline(userId: string): boolean {
        return onlineUsers.has(userId);
    }

    /* -----------------------------
       FILE UPLOAD
    ------------------------------*/
    async function uploadFile(file: File): Promise<string | null> {
        try {
            if (file.size > 50 * 1024 * 1024) {
                alert('File too large. Max 50MB');
                return null;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
            const filePath = `chat-attachments/${fileName}`;

            const { error: uploadError } = await supabase.storage
               .from('attachments')
               .upload(filePath, file);

            if (uploadError) {
                console.error('Upload error:', uploadError);
                if (uploadError.message.includes('row-level security')) {
                    alert('Storage policy error. Check RLS policies in Supabase.');
                }
                throw uploadError;
            }

            const { data } = supabase.storage
               .from('attachments')
               .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (err: any) {
            console.error('File upload error:', err);
            return null;
        }
    }

    /* -----------------------------
       SEND MESSAGE
    ------------------------------*/
    async function sendMessage(event: CustomEvent) {
        const { content, files, template } = event.detail;
        const isGroupChat = !!selectedGroupId;

        if (!content?.trim() && (!files || files.length === 0) && !template) return;
        if (!selectedRoomId && !selectedGroupId) return;
        
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
            alert('Please login first');
            goto('/login');
            return;
        }

        let attachmentUrls: string[] = [];
        if (files && files.length > 0) {
            uploadingFiles = files;
            for (const file of files) {
                const url = await uploadFile(file);
                if (url) attachmentUrls.push(url);
            }
            uploadingFiles = [];
        }

        const tempId = `temp-${Date.now()}`;
        const newMessage = {
            id: tempId,
            room_id: isGroupChat ? null : selectedRoomId,
            group_id: isGroupChat ? selectedGroupId : null,
            sender_id: currentUserId,
            receiver_id: isGroupChat ? null : selectedContact?.id,
            content: content?.trim() || '',
            attachments: attachmentUrls,
            template_id: template?.id || null,
            template_data: template?.values || null,
            created_at: new Date().toISOString(),
            is_own: true,
            type: template ? 'template' : (attachmentUrls.length > 0 ? 'attachment' : 'text'),
            status: 'sent',
            users: { id: currentUserId, name: 'You' }
        };

        messages = [...messages, newMessage];

        try {
            const insertData: any = {
                sender_id: currentUserId,
                content: content?.trim() || '',
                event: 'message',
                private: !isGroupChat,
                extension: 'chat',
                status: 'sent',
                attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
                template_id: template?.id || null,
                template_data: template?.values || null
            };

            if (isGroupChat) {
                insertData.group_id = selectedGroupId;
            } else {
                insertData.room_id = selectedRoomId;
                insertData.receiver_id = selectedContact.id;
            }

            const { data, error } = await supabase
               .from('messages')
               .insert(insertData)
               .select()
               .single();

            if (error) throw error;

            let deliveredStatus = 'sent';
            if (!isGroupChat && selectedContact && isUserOnline(selectedContact.id)) {
                deliveredStatus = 'delivered';
                await supabase.from('messages').update({ status: 'delivered' }).eq('id', data.id);
            }

            messages = messages.map(m =>
                m.id === tempId ? {
                   ...data,
                    is_own: true,
                    type: template ? 'template' : (attachmentUrls.length > 0 ? 'attachment' : 'text'),
                    status: deliveredStatus,
                    users: { id: currentUserId, name: 'You' }
                } : m
            );

        } catch (err: any) {
            console.error('Send message error:', err);
            messages = messages.filter(m => m.id !== tempId);
            alert('Failed to send message: ' + err.message);
        }
    }

    /* -----------------------------
       MARK MESSAGES AS READ
    ------------------------------*/
    async function markMessagesAsRead() {
        if (!selectedRoomId && !selectedGroupId) return;
        const currentUserId = getCurrentUserId();

        const unreadMsgIds = messages
           .filter(m => {
                if (selectedGroupId) {
                    return m.sender_id !== currentUserId && m.status !== 'read';
                } else {
                    return m.receiver_id === currentUserId && m.status !== 'read';
                }
            })
           .map(m => m.id)
           .filter(id => !id.startsWith('temp-'));

        if (unreadMsgIds.length === 0) return;

        await supabase
           .from('messages')
           .update({ status: 'read' })
           .in('id', unreadMsgIds);

        messages = messages.map(m =>
            unreadMsgIds.includes(m.id) ? {...m, status: 'read' } : m
        );
    }

    /* -----------------------------
       NETWORK TEST
    ------------------------------*/
    async function testNetwork() {
        try {
            const res = await fetch("/api/ping", { headers: authHeader() });
            isOnline = res.ok;
            if (isOnline) lastSync = new Date().toLocaleTimeString('en-IN');
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
        try {
            const userId = getCurrentUserId();
            if (!userId) return;

            const { data, error } = await supabase
               .from('chat_groups')
               .select(`
                    id,
                    name,
                    description,
                    created_by,
                    created_at,
                    chat_group_members!inner(user_id)
                `)
               .eq('chat_group_members.user_id', userId)
               .order('created_at', { ascending: false });

            if (error) throw error;
            groups = data || [];
        } catch (err) {
            console.error("loadGroups error:", err);
            isOnline = false;
        }
    }

    /* -----------------------------
       LOAD GROUP MEMBERS
    ------------------------------*/
    async function loadGroupMembers(groupId: string) {
        try {
            const { data, error } = await supabase
               .from('chat_group_members')
               .select(`
                    user_id,
                    users:user_id(id, name, mobile, email)
                `)
               .eq('group_id', groupId);

            if (error) throw error;
            groupMembers = (data || []).map(m => m.users);
        } catch (err) {
            console.error("loadGroupMembers error:", err);
            groupMembers = [];
        }
    }

    /* -----------------------------
       CONTACTS
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
        } catch (err) {
            console.error("loadContacts error:", err);
            isOnline = false;
        }
    }

    /* -----------------------------
       TEMPLATES - FIXED: Your API already returns fields
    ------------------------------*/
    async function loadTemplates() {
        try {
            const res = await fetch("/api/templates", { headers: authHeader() });
            const json = await res.json();
            templates = json.data || [];
            console.log('Loaded templates:', templates);
        } catch (err) {
            console.error("loadTemplates error:", err);
            templates = [];
        }
    }

    /* -----------------------------
       SELECT CONTACT
    ------------------------------*/
    async function selectContact(event: any) {
        const contact = event.detail ?? event;
        selectedGroup = null;
        selectedGroupId = null;
        groupMembers = [];
        selectedContact = {...contact };
        selectedRoomId = contact.room_id;
        await tick();
        await loadMessages({ roomId: selectedRoomId });
        subscribeToMessages({ roomId: selectedRoomId });
        markMessagesAsRead();
    }

    /* -----------------------------
       SELECT GROUP
    ------------------------------*/
    async function selectGroup(event: any) {
        const group = event.detail ?? event;
        selectedContact = null;
        selectedRoomId = null;
        selectedGroup = {...group };
        selectedGroupId = group.id;
        await tick();
        await loadGroupMembers(selectedGroupId);
        await loadMessages({ groupId: selectedGroupId });
        subscribeToMessages({ groupId: selectedGroupId });
        markMessagesAsRead();
    }

    /* -----------------------------
       MESSAGES
    ------------------------------*/
    async function loadMessages({ roomId, groupId }: { roomId?: string, groupId?: string }) {
        if (isLoadingMessages) return;
        if (!roomId && !groupId) {
            messages = [];
            return;
        }

        isLoadingMessages = true;

        try {
            let query = supabase.from("messages").select("*");

            if (groupId) {
                query = query.eq("group_id", groupId);
            } else {
                query = query.eq("room_id", roomId);
            }

            const { data: msgs, error } = await query.order("created_at", { ascending: true });

            if (error) throw error;

            if (!msgs || msgs.length === 0) {
                messages = [];
                return;
            }

            const senderIds = [...new Set(msgs.map(m => m.sender_id))];

            const { data: usersData } = await supabase
               .from("users")
               .select("id, name, mobile")
               .in("id", senderIds);

            const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

            messages = msgs.map((m: any, idx: number) => ({
               ...m,
                id: m.id || `db-${idx}-${m.created_at}`,
                users: usersMap.get(m.sender_id) || null,
                is_own: m.sender_id === getCurrentUserId(),
                type: m.template_id ? "template" : (m.attachments?.length > 0 ? 'attachment' : 'text'),
                status: m.status || 'sent'
            }));

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
    function subscribeToMessages({ roomId, groupId }: { roomId?: string, groupId?: string }) {
        if (messagesChannel) {
            supabase.removeChannel(messagesChannel);
            messagesChannel = null;
        }

        const filter = groupId
           ? `group_id=eq.${groupId}`
            : `room_id=eq.${roomId}`;

        messagesChannel = supabase
           .channel(`chat:${groupId || roomId}`)
           .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: filter
                },
                async (payload) => {
                    const currentUserId = getCurrentUserId();

                    if (!groupId && payload.new.receiver_id === currentUserId) {
                        await supabase
                           .from('messages')
                           .update({ status: 'delivered' })
                           .eq('id', payload.new.id);
                        payload.new.status = 'delivered';
                    }

                    if (payload.new.sender_id === currentUserId) return;

                    const { data: userData } = await supabase
                       .from('users')
                       .select('id, name, mobile')
                       .eq('id', payload.new.sender_id)
                       .single();

                    const newMsg = {
                       ...payload.new,
                        users: userData || null,
                        is_own: false,
                        type: payload.new.template_id ? 'template' : (payload.new.attachments?.length > 0 ? 'attachment' : 'text'),
                        status: payload.new.status || 'delivered'
                    };

                    messages = [...messages, newMsg];

                    if ((selectedRoomId === roomId) || (selectedGroupId === groupId)) {
                        setTimeout(markMessagesAsRead, 500);
                    }
                }
            )
           .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: filter
                },
                (payload) => {
                    messages = messages.map(m =>
                        m.id === payload.new.id ? {...m, status: payload.new.status } : m
                    );
                }
            )
           .subscribe((status) => {
                console.log('Realtime:', status);
            });
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

            const { data: groupData, error: groupError } = await supabase
               .from('chat_groups')
               .insert({ name: groupName, description: groupDesc, created_by: userId })
               .select()
               .single();

            if (groupError) throw groupError;

            const { error: memberError } = await supabase
               .from('chat_group_members')
               .insert({ group_id: groupData.id, user_id: userId });

            if (memberError) throw memberError;

            groupName = "";
            groupDesc = "";
            showGroupForm = false;
            await loadGroups();
        } catch (err: any) {
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
            if (!userId) return;

            const { data: existingUser } = await supabase
               .from('users')
               .select('id')
               .or(`mobile.eq.${contactMobile},email.eq.${contactEmail}`)
               .single();

            let contactId = existingUser?.id;

            if (!contactId) {
                const { data: newUser, error } = await supabase
                   .from('users')
                   .insert({ name: contactName, mobile: contactMobile, email: contactEmail, department })
                   .select()
                   .single();
                if (error) throw error;
                contactId = newUser.id;
            }

            const { error: roomError } = await supabase
               .from('rooms')
               .insert({
                    user1_id: userId < contactId ? userId : contactId,
                    user2_id: userId < contactId ? contactId : userId
                });

            if (roomError && !roomError.message.includes('duplicate')) throw roomError;

            contactName = "";
            contactMobile = "";
            contactEmail = "";
            department = "";
            showContactForm = false;
            await loadContacts();
        } catch (err: any) {
            alert("Failed: " + err.message);
        }
    }

    /* -----------------------------
       ADD MEMBERS TO GROUP
    ------------------------------*/
    async function openAddMembers() {
        if (!selectedGroupId) return;

        const memberIds = groupMembers.map(m => m.id);
        availableContacts = contacts.filter(c => !memberIds.includes(c.id));

        if (availableContacts.length === 0) {
            alert('All your contacts are already in this group');
            return;
        }

        selectedContactsToAdd = [];
        showAddMembersForm = true;
    }

    async function addMembersToGroup() {
        if (!selectedGroupId || selectedContactsToAdd.length === 0) return;

        try {
            const inserts = selectedContactsToAdd.map(userId => ({
                group_id: selectedGroupId,
                user_id: userId
            }));

            const { error } = await supabase
               .from('chat_group_members')
               .insert(inserts);

            if (error) throw error;

            showAddMembersForm = false;
            selectedContactsToAdd = [];
            await loadGroupMembers(selectedGroupId);
            alert(`Added ${inserts.length} member(s) to group`);
        } catch (err: any) {
            alert("Failed to add members: " + err.message);
        }
    }

    function toggleContactSelection(userId: string) {
        if (selectedContactsToAdd.includes(userId)) {
            selectedContactsToAdd = selectedContactsToAdd.filter(id => id !== userId);
        } else {
            selectedContactsToAdd = [...selectedContactsToAdd, userId];
        }
    }

    /* -----------------------------
       TEMPLATE HANDLERS
    ------------------------------*/
    async function openTemplatePopup() {
        await loadTemplates();
        showTemplatePopup = true;
    }

    function selectTemplate(event: CustomEvent) {
        selectedTemplate = event.detail;
        showTemplatePopup = false;
        showTemplateForm = true;
    }

    async function sendTemplateReport(e: any) {
        const template = e.detail.template;
        const values = e.detail.values;
        
        await sendMessage(new CustomEvent('sendMessage', {
            detail: {
                content: `Template: ${template.name}`,
                template: { id: template.id, name: template.name, values }
            }
        }));
        
        showTemplateForm = false;
        selectedTemplate = null;
    }

    /* -----------------------------
       LIFECYCLE
    ------------------------------*/
    onMount(async () => {
        const userId = getCurrentUserId();
        if (!userId) {
            goto("/login");
            return;
        }
        setupPresence();
        await loadGroups();
        await loadContacts();
        await loadTemplates();
        testNetwork();
    });

    onDestroy(() => {
        if (messagesChannel) {
            supabase.removeChannel(messagesChannel);
        }
        if (presenceChannel) {
            supabase.removeChannel(presenceChannel);
        }
    });
</script>

<div class="chat-container">
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

    <section class="chat-area">
        {#if (selectedRoomId && selectedContact) || (selectedGroupId && selectedGroup)}
            <ChatHeader
                title={selectedContact?.name || selectedGroup?.name}
                subtitle={selectedContact
                  ? (isUserOnline(selectedContact.id) ? 'online' : 'offline')
                    : `${groupMembers.length} members`}
                online={selectedContact ? isUserOnline(selectedContact.id) : false}
                typing={typing}
                isGroup={!!selectedGroup}
                memberCount={groupMembers.length}
                on:menu={selectedGroup ? openAddMembers : () => {}}
                on:back={() => {
                    selectedContact = null;
                    selectedGroup = null;
                    selectedRoomId = null;
                    selectedGroupId = null;
                    groupMembers = [];
                    messages = [];
                }}
            />

            {#if isLoadingMessages}
                <div class="loading-messages">Loading messages...</div>
            {/if}

            <MessageList
                {messages}
                selectedUser={selectedContact || selectedGroup}
                currentUserId={getCurrentUserId()}
            />

            <ChatInput 
                on:sendMessage={sendMessage}
                on:openTemplate={openTemplatePopup}
                {uploadingFiles}
            />

        {:else}
            <div class="empty-chat-screen">
                <h2>💬 Select a Group or Contact</h2>
                <p>Start chatting with your team.</p>
            </div>
        {/if}
    </section>
</div>

<!-- Popups -->
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

{#if showAddMembersForm}
<div class="popup">
    <div class="popup-card">
        <h2>Add Members to {selectedGroup?.name}</h2>
        <div class="members-list">
            {#each availableContacts as contact}
                <label class="contact-checkbox">
                    <input
                        type="checkbox"
                        checked={selectedContactsToAdd.includes(contact.id)}
                        on:change={() => toggleContactSelection(contact.id)}
                    />
                    <div class="contact-info">
                        <div class="contact-name">{contact.name}</div>
                        <div class="contact-mobile">{contact.mobile}</div>
                    </div>
                </label>
            {/each}
        </div>
        <div class="popup-buttons">
            <button
                on:click={addMembersToGroup}
                disabled={selectedContactsToAdd.length === 0}
            >
                Add {selectedContactsToAdd.length} Member(s)
            </button>
            <button class="cancel-btn" on:click={() => showAddMembersForm = false}>Cancel</button>
        </div>
    </div>
</div>
{/if}

{#if showCreateTemplate}
<div class="overlay">
    <TemplateDesigner
        on:saved={async () => { showCreateTemplate = false; await loadTemplates(); }}
        on:close={() => { showCreateTemplate = false; }}
    />
</div>
{/if}

{#if showTemplatePopup}
<div class="overlay">
    <TemplatePopup
        {templates}
        on:close={() => { showTemplatePopup = false; }}
        on:new={() => { showTemplatePopup = false; showTemplateDesigner = true; }}
        on:use={selectTemplate}
    />
</div>
{/if}

{#if showTemplateDesigner}
<div class="overlay">
    <TemplateDesigner
        on:close={() => { showTemplateDesigner = false; }}
        on:saved={async () => { showTemplateDesigner = false; await loadTemplates(); showTemplatePopup = true; }}
    />
</div>
{/if}

{#if showTemplateForm && selectedTemplate}
<div class="overlay">
    <TemplateForm
        template={selectedTemplate}
        on:cancel={() => { showTemplateForm = false; selectedTemplate = null; }}
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
    min-height: 0;
}
.loading-messages{
    padding: 20px;
    text-align: center;
    color: #666;
    font-size: 14px;
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
    box-sizing: border-box;
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
.popup-buttons button:first-child{ background: #2563eb; color: white; }
.cancel-btn{ background:#f0f2f5; }
.members-list {
    max-height: 400px;
    overflow-y: auto;
    margin: 16px 0;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
}
.contact-checkbox {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    gap: 12px;
}
.contact-checkbox:hover {
    background: #f5f5f5;
}
.contact-checkbox:last-child {
    border-bottom: none;
}
.contact-checkbox input {
    width: 18px;
    height: 18px;
    cursor: pointer;
}
.contact-info {
    flex: 1;
}
.contact-name {
    font-weight: 500;
    font-size: 15px;
}
.contact-mobile {
    font-size: 13px;
    color: #667781;
}
.popup-buttons button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>