<script lang="ts">
import { onMount, onDestroy, tick } from "svelte";
import { supabase } from "$lib/supabase";

import ChatSidebar from "./ChatSidebar.svelte";
import ChatHeader from "./ChatHeader.svelte";
import MessageList from "./MessageList.svelte";
import ChatInput from "./ChatInput.svelte";
import ContactPopup from "./ContactPopup.svelte";

let currentUser: any = null;

let contacts: any[] = [];
let groups: any[] = [];

let selectedContact: any = null;
let selectedGroup: any = null;

let selectedRoomId = "";

let messages: any[] = [];

let loading = false;
let sending = false;

let search = "";

let showContactPopup = false;
let showGroupPopup = false;

let subscription: any = null;

let online = true;

let typing = false;

let typingTimeout: any = null;

let unreadCount: Record<string, number> = {};

let lastSeen: Record<string, string> = {};

/* ===========================================================
   AUTH
=========================================================== */

function getCurrentUserId() {
    return localStorage.getItem("userId") || "";
}

function authHeader() {
    const token = localStorage.getItem("token");

    return token
        ? {
              Authorization: `Bearer ${token}`
          }
        : {};
}

/* ===========================================================
   ROOM ID
=========================================================== */

function getRoomId(userId1: string, userId2: string) {
    return ["chat", ...[userId1, userId2].sort()].join("_");
}

/* ===========================================================
   LOAD CONTACTS
=========================================================== */

async function loadContacts() {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("id,name,mobile,email")
            .neq("id", currentUser.id)
            .order("name");

        if (error) throw error;

        contacts = data || [];
    } catch (err) {
        console.error("Load Contacts:", err);
    }
}

/* ===========================================================
   LOAD GROUPS
=========================================================== */

async function loadGroups() {
    try {
        const { data, error } = await supabase
            .from("chat_groups")
            .select("*")
            .order("name");

        if (error) throw error;

        groups = data || [];
    } catch (err) {
        console.error("Load Groups:", err);
    }
}

/* ===========================================================
   SELECT CONTACT
=========================================================== */

async function selectContact(event: any) {
    const contact = event.detail ?? event;

    selectedGroup = null;
    selectedContact = contact;
    selectedRoomId = getRoomId(currentUser.id, contact.id);

    console.log("Selected Contact:", contact);
    console.log("Selected Room:", selectedRoomId);

    await loadMessages(selectedRoomId);
    subscribeRealtime(selectedRoomId);
    await tick();
}

/* ===========================================================
   SELECT GROUP
=========================================================== */

async function selectGroup(event: any) {
    const group = event.detail ?? event;

    selectedContact = null;
    selectedGroup = group;
    selectedRoomId = group.id;

    console.log("Selected Group:", group);

    await loadMessages(group.id);
    subscribeRealtime(group.id);
    await tick();
}

/* ===========================================================
   ON MOUNT
=========================================================== */

onMount(async () => {
    const userId = getCurrentUserId();

    if (!userId) {
        console.error("User not logged in.");
        return;
    }

    currentUser = {
        id: userId
    };

    loading = true;

    try {
        await Promise.all([loadContacts(), loadGroups()]);
    } catch (err) {
        console.error(err);
    } finally {
        loading = false;
    }
});

/* ===========================================================
   ON DESTROY
=========================================================== */

onDestroy(() => {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
});

/* ===========================================================
   LOAD MESSAGES
=========================================================== */

async function loadMessages(roomId: string) {
    if (!roomId) {
        messages = [];
        return;
    }

    try {
        loading = true;

        const { data, error } = await supabase
            .from("messages")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", {
                ascending: true
            });

        if (error) throw error;

        messages = (data || []).map(msg => ({
            ...msg,
            is_own: msg.sender_id === currentUser.id
        }));

        await tick();
        scrollToBottom();
    } catch (err) {
        console.error("Load Messages:", err);
    } finally {
        loading = false;
    }
}

/* ===========================================================
   REALTIME
=========================================================== */

function subscribeRealtime(roomId: string) {
    if (!roomId) return;

    if (subscription) {
        supabase.removeChannel(subscription);
    }

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
            async ({ new: newMessage }) => {
                const exists = messages.some(m => m.id === newMessage.id);

                if (exists) return;

                messages = [
                    ...messages,
                    {
                        ...newMessage,
                        is_own: newMessage.sender_id === currentUser.id
                    }
                ];

                await tick();
                scrollToBottom();
            }
        )
        .subscribe(status => {
            console.log("Realtime:", status);
            if (status === 'SUBSCRIBED') {
                online = true;
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                online = false;
            }
        });
}

/* ===========================================================
   AUTO SCROLL
=========================================================== */

function scrollToBottom() {
    requestAnimationFrame(() => {
        const element = document.querySelector(".messages");
        if (!element) return;
        element.scrollTop = element.scrollHeight;
    });
}

/* ===========================================================
   SEND MESSAGE
=========================================================== */

async function sendMessage(text: string) {
    text = text.trim();

    if (!text) return;
    if (!selectedRoomId) return;
    if (sending) return;

    sending = true;

    try {
        const senderId = currentUser.id;
        let receiverId: string | null = null;

        if (selectedContact) {
            receiverId = selectedContact.id;
        }

        const tempId = "temp_" + Date.now();

        const tempMessage = {
            id: tempId,
            sender_id: senderId,
            receiver_id: receiverId,
            room_id: selectedRoomId,
            content: text,
            created_at: new Date().toISOString(),
            is_own: true,
            sending: true
        };

        messages = [...messages, tempMessage];

        await tick();
        scrollToBottom();

        const { data, error } = await supabase
            .from("messages")
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                room_id: selectedRoomId,
                content: text,
                event: "message",
                extension: "chat",
                private: true
            })
            .select()
            .single();

        if (error) throw error;

        messages = messages.map(m =>
            m.id === tempId
                ? {
                      ...data,
                      is_own: true,
                      sending: false
                  }
                : m
        );
    } catch (err) {
        console.error("Send Message Error", err);
        messages = messages.filter(m => !m.sending);
        alert("Message not sent.");
    } finally {
        sending = false;
    }
}

/* ===========================================================
   TYPING
=========================================================== */

function userTyping() {
    typing = true;
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        typing = false;
    }, 1500);
}

/* ===========================================================
   POPUPS
=========================================================== */

function openNewContact() {
    showContactPopup = true;
}

function closeNewContact() {
    showContactPopup = false;
}

function openNewGroup() {
    showGroupPopup = true;
}

function closeNewGroup() {
    showGroupPopup = false;
}

async function refreshAll() {
    await loadContacts();
    await loadGroups();
    if (selectedRoomId) {
        await loadMessages(selectedRoomId);
    }
}
</script>

<div class="chat-page">
    <!-- LEFT SIDEBAR -->
    <ChatSidebar
        {contacts}
        {groups}
        {selectedContact}
        {selectedGroup}
        on:newContact={openNewContact}
        on:newGroup={openNewGroup}
        on:selectContact={selectContact}
        on:selectGroup={selectGroup}
    />

    <!-- RIGHT CHAT AREA -->
    <div class="chat-window">
        {#if selectedContact || selectedGroup}
            <!-- HEADER -->
            <ChatHeader
                title={selectedContact?.name ?? selectedGroup?.name}
                subtitle={selectedContact ? selectedContact.mobile : `${selectedGroup?.members ?? 0} members`}
                {online}
                {typing}
            />

            <!-- MESSAGE LIST -->
            <MessageList {messages} />

            <!-- INPUT -->
            <ChatInput
                {sending}
                on:typing={userTyping}
                on:send={(e) => sendMessage(e.detail)}
            />
        {:else}
            <div class="empty-chat">
                <div class="logo">💬</div>
                <h2>Welcome</h2>
                <p>Select a contact or group to start chatting.</p>
            </div>
        {/if}
    </div>
</div>

<ContactPopup
    open={showContactPopup}
    on:close={closeNewContact}
    on:saved={refreshAll}
/>

<style>
:global(body){
    margin:0;
    background:#111b21;
    font-family:"Segoe UI",Roboto,sans-serif;
}

/* ===========================
   LAYOUT
=========================== */

.chat-page{
    display:flex;
    width:100%;
    height:100vh;
    overflow:hidden;
    background:#e5ddd5;
}

.chat-window{
    flex:1;
    display:flex;
    flex-direction:column;
    background:#efeae2;
    position:relative;
}

/* ===========================
   EMPTY CHAT
=========================== */

.empty-chat{
    flex:1;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    color:#667781;
    background:#f8f9fa;
}

.empty-chat .logo{
    font-size:90px;
    margin-bottom:20px;
}

.empty-chat h2{
    margin:0;
    font-size:30px;
    color:#41525d;
}

.empty-chat p{
    margin-top:15px;
    font-size:16px;
    max-width:450px;
    text-align:center;
    line-height:1.6;
}

/* ===========================
   SCROLLBAR
=========================== */

::-webkit-scrollbar{
    width:8px;
}

::-webkit-scrollbar-track{
    background:transparent;
}

::-webkit-scrollbar-thumb{
    background:#b6b6b6;
    border-radius:20px;
}

::-webkit-scrollbar-thumb:hover{
    background:#999;
}

/* ===========================
   ANIMATION
=========================== */

.chat-window{
    animation:fadeIn .25s ease;
}

@keyframes fadeIn{
    from{
        opacity:0;
        transform:translateY(8px);
    }
    to{
        opacity:1;
        transform:translateY(0);
    }
}

/* ===========================
   MOBILE
=========================== */

@media(max-width:900px){
.chat-page{
    flex-direction:column;
}
.chat-window{
    width:100%;
}
}

/* ===========================
   SMALL MOBILE
=========================== */

@media(max-width:600px){
.empty-chat .logo{
    font-size:60px;
}
.empty-chat h2{
    font-size:22px;
}
.empty-chat p{
    font-size:14px;
    width:90%;
}
}
</style>