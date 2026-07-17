<script lang="ts">
    console.log('🚀 CHAT SCRIPT STARTED');

    import { onMount, onDestroy, tick } from "svelte";
    import { browser } from "$app/environment";
    import { goto, afterNavigate, invalidateAll } from "$app/navigation";
    import { page } from '$app/stores';
    import TemplatePopup from "$lib/components/templates/TemplatePopup.svelte";
    import TemplateInputForm from "$lib/components/templates/TemplateInputForm.svelte";
    import ChatSidebar from "$lib/components/chat/ChatSidebar.svelte";
    import ChatHeader from "$lib/components/chat/ChatHeader.svelte";
    import MessageList from "$lib/components/chat/MessageList.svelte";
    import TemplateDesigner from "$lib/components/templates/designer/TemplateDesigner.svelte";
    import TemplateForm from "$lib/components/templates/form/TemplateForm.svelte";
    import { supabase } from '$lib/supabase';
    import type { RealtimeChannel } from '@supabase/supabase-js';

    console.log('✅ IMPORTS DONE, BROWSER:', browser);

    /* -----------------------------
       DEBUG + PERF ANALYSIS
    ------------------------------*/
    const DEBUG = true;
    const PERF_MARKS: Record<string, number> = {};

    function log(step: string, data?: any) {
        if (!DEBUG) return;
        const t = performance.now().toFixed(0);
        console.log(`[CHAT ${t}ms] ${step}`, data?? '');
    }

    function perfStart(key: string) {
        PERF_MARKS[key] = performance.now();
        log(`⏱️ START: ${key}`);
    }

    function perfEnd(key: string) {
        const start = PERF_MARKS[key];
        if (!start) return;
        const duration = (performance.now() - start).toFixed(1);
        log(`⏱️ END: ${key}`, `${duration}ms`);
        if (parseFloat(duration) > 300) {
            console.warn(`🐌 SLOW: ${key} took ${duration}ms`);
        }
        delete PERF_MARKS[key];
    }

    log('LOGGER READY');

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

    let isLoadingMessages = false;
    let isLoadingOlder = false;
    let groupsLoaded = false;
    let contactsLoaded = false;

    let subscription: RealtimeChannel | null = null;

    // Network status
    let isOnline = true;
    let lastSync = '';

    let online = false;
    let typing = false;

    // Emoji
    let showEmoji = false;
    let emojiPicker: any;
    let emojiPickerContainer: HTMLElement;

    // Mic recording
    let isRecording = false;
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let micStream: MediaStream | null = null;

    // NAVIGATION GUARD
    let isInitializing = false;

    /* -----------------------------
       INDEXEDDB - v3 with meta cache
    ------------------------------*/

    let dbPromise: any = null;

    async function initDB() {
        if (!browser || dbPromise) return dbPromise;
        perfStart('INIT_DB');
        const { openDB } = await import('idb');
        dbPromise = openDB('erp-chat-cache', 3, {
            upgrade(db, oldVersion) {
                log('DB UPGRADE', { oldVersion });
                if (oldVersion < 1) {
                    db.createObjectStore('messages', { keyPath: 'id' });
                    db.createObjectStore('chats', { keyPath: 'id' });
                }
                if (oldVersion < 2) {
                    const msgStore = db.transaction('messages').objectStore('messages');
                    msgStore.createIndex('room_id_index', 'room_id');
                    msgStore.createIndex('room_created_index', ['room_id', 'created_at']);
                }
                if (oldVersion < 3) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }
            }
        });
        perfEnd('INIT_DB');
        return dbPromise;
    }

    async function cacheMessages(msgs: any[]) {
        if (!browser ||!msgs.length) return;
        try {
            perfStart('CACHE_MSG_WRITE');
            const db = await initDB();
            const tx = db.transaction('messages', 'readwrite');
            await Promise.all(msgs.map(m => tx.store.put(m)));
            await tx.done;
            perfEnd('CACHE_MSG_WRITE');
            log('CACHE MSG: SAVED', msgs.length);
        } catch (e) { log('CACHE MSG: FAIL', e); }
    }

    async function getCachedMessages(roomId: string, beforeTs?: number) {
        if (!browser) return [];
        try {
            perfStart('CACHE_MSG_READ');
            const db = await initDB();
            const tx = db.transaction('messages');
            const index = tx.store.index('room_created_index');

            let range;
            if (beforeTs) {
                range = IDBKeyRange.bound([roomId, -Infinity], [roomId, beforeTs], false, true);
            } else {
                range = IDBKeyRange.bound([roomId, -Infinity], [roomId, Infinity]);
            }

            const msgs = await index.getAll(range, 20);
            perfEnd('CACHE_MSG_READ');
            return msgs.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } catch (e) { log('CACHE MSG: READ FAIL', e); return []; }
    }

    async function cacheMeta(key: string, data: any[]) {
        if (!browser) return;
        try {
            const db = await initDB();
            await db.put('meta', { key, data, ts: Date.now() });
            log('CACHE META: SAVED', { key, count: data.length });
        } catch (e) { log('CACHE META: FAIL', e); }
    }

    async function getCachedMeta(key: string, maxAge = 60000) {
        if (!browser) return null;
        try {
            perfStart('CACHE_META_READ');
            const db = await initDB();
            const row = await db.get('meta', key);
            perfEnd('CACHE_META_READ');
            if (!row || Date.now() - row.ts > maxAge) {
                log('CACHE META: MISS', key);
                return null;
            }
            log('CACHE META: HIT', { key, count: row.data.length, age: `${((Date.now() - row.ts)/1000).toFixed(0)}s` });
            return row.data;
        } catch (e) { log('CACHE META: READ FAIL', e); return null; }
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
       AUTH - SSR SAFE
    ------------------------------*/

    function token(): string {
        if (!browser) return "";
        return localStorage.getItem("token") || "";
    }

    function authHeader() {
        const t = token();
        if (!t) return {};
        return { Authorization: `Bearer ${t}` };
    }

    function getCurrentUserId() {
        if (!browser) return "";
        return localStorage.getItem("userId") || "";
    }

    /* -----------------------------
       ROOM ID
    ------------------------------*/

    function getRoomId(userId1: string, userId2: string) {
        return [userId1, userId2].sort().join('_');
    }

    /* -----------------------------
       GROUPS - WITH CACHE
    ------------------------------*/

    async function loadGroups() {
        perfStart('LOAD_GROUPS_TOTAL');
        log('GROUPS: START');
        if (!token()) { log('GROUPS: NO TOKEN'); goto("/login"); return; }

        const cached = await getCachedMeta('groups');
        if (cached) {
            groups = cached;
            groupsLoaded = true;
            log('GROUPS: CACHED', groups.length);
        }

        try {
            perfStart('GROUPS_API');
            const res = await fetch("/api/recent-chats", { headers: authHeader() });
            perfEnd('GROUPS_API');
            log('GROUPS: STATUS', res.status);
            if (res.status === 401) { log('GROUPS: 401'); goto("/login"); return; }
            const data = await res.json();
            groups = data.chats || [];
            groupsLoaded = true;
            await cacheMeta('groups', groups);
            log('GROUPS: FRESH', groups.length);
        } catch (err) {
            log('GROUPS: ERROR', err);
            isOnline = false;
        }
        perfEnd('LOAD_GROUPS_TOTAL');
    }

    /* -----------------------------
       CONTACTS - WITH CACHE
    ------------------------------*/

    async function loadContacts() {
        perfStart('LOAD_CONTACTS_TOTAL');
        log('CONTACTS: START');
        const cached = await getCachedMeta('contacts');
        if (cached) {
            contacts = cached;
            contactsLoaded = true;
            log('CONTACTS: CACHED', contacts.length);
        }

        try {
            const userId = getCurrentUserId();
            log('CONTACTS: USER_ID', userId);
            if (!userId) return;
            perfStart('CONTACTS_SUPABASE');
            const { data, error } = await supabase
              .from('rooms')
              .select(`id, user1_id, user2_id, user1:user1_id(id, name, mobile, email), user2:user2_id(id, name, mobile, email)`)
              .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
            perfEnd('CONTACTS_SUPABASE');
            if (error) { log('CONTACTS: ERROR', error); throw error; }
            contacts = (data || []).map((room: any) => {
                const otherUser = room.user1_id === userId? room.user2 : room.user1;
                return {...otherUser, room_id: room.id, user1_id: room.user1_id, user2_id: room.user2_id, members: [room.user1, room.user2] };
            });
            contactsLoaded = true;
            await cacheMeta('contacts', contacts);
            log('CONTACTS: FRESH', contacts.length);
        } catch (err) {
            log('CONTACTS: ERROR', err);
            isOnline = false;
        }
        perfEnd('LOAD_CONTACTS_TOTAL');
    }

    /* -----------------------------
       TEMPLATES
    ------------------------------*/

    async function loadTemplates() {
        try {
            perfStart('LOAD_TEMPLATES');
            const res = await fetch("/api/templates");
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            templates = data.templates || data;
            perfEnd('LOAD_TEMPLATES');
            log('TEMPLATES: LOADED', templates.length);
        } catch (e) {
            log('TEMPLATES: ERROR', e);
        }
    }

    async function loadTemplateFields(templateId: number) {
        try {
            perfStart('LOAD_TEMPLATE_FIELDS');
            const res = await fetch(`/api/templates/fields?id=${templateId}`, { headers: authHeader() });
            templateFields = res.ok? await res.json() : [];
            perfEnd('LOAD_TEMPLATE_FIELDS');
            log('TEMPLATE FIELDS: LOADED', templateFields.length);
        } catch (err) {
            templateFields = [];
        }
    }

    /* -----------------------------
       SELECT CONTACT/GROUP
    ------------------------------*/

    async function selectContact(event: any) {
        const contact = event.detail?? event;
        log('SELECT CONTACT', contact.name);
        selectedGroup = null;
        selectedContact = {...contact };
        selectedRoomId = contact.room_id || getRoomId(getCurrentUserId(), contact.id);
        log('ROOM_ID', selectedRoomId);
        if (!selectedRoomId) { log('NO ROOM_ID'); alert('Room not found'); return; }
        await loadMessages(selectedRoomId);
        subscribeToChat(selectedRoomId);
        await tick();
        log('SELECT CONTACT DONE');
    }

    async function selectGroup(event: any) {
        const group = event.detail?? event;
        log('SELECT GROUP', group.name);
        selectedContact = null;
        selectedGroup = {...group };
        selectedRoomId = group.id;
        await loadMessages(group.id);
        subscribeToChat(group.id);
        await tick();
        log('SELECT GROUP DONE');
    }

    /* -----------------------------
       MESSAGES
    ------------------------------*/

    async function loadMessages(roomId?: string) {
        perfStart('LOAD_MESSAGES_TOTAL');
        log('LOAD MSG START', roomId);
        if (isLoadingMessages ||!roomId) { messages = []; log('LOAD MSG ABORT'); return; }
        isLoadingMessages = true;
        try {
            log('LOAD MSG: CHECK CACHE');
            const cached = await getCachedMessages(roomId);
            log('LOAD MSG: CACHED COUNT', cached.length);
            if (cached.length > 0) {
                messages = cached;
                await tick();
                scrollToBottom();
                isLoadingMessages = false;
                log('LOAD MSG: USED CACHE - FAST PATH');
                perfEnd('LOAD_MESSAGES_TOTAL');
                return;
            }

            perfStart('MSG_SUPABASE_QUERY');
            const { data, error } = await supabase
              .from("messages")
              .select("*, users:sender_id(id, name, mobile)")
              .eq("room_id", roomId)
              .order("created_at", { ascending: false })
              .limit(20);
            perfEnd('MSG_SUPABASE_QUERY');

            if (error) { log('LOAD MSG: ERROR', error); throw error; }
            log('LOAD MSG: RAW COUNT', data?.length);

            let processed = (data || []).reverse().map((m: any) => ({
              ...m,
                is_own: m.sender_id === getCurrentUserId()
            }));

            const reportIds = processed.filter(m => m.report_id).map(m => m.report_id);
            log('LOAD MSG: REPORT_IDS', reportIds.length);
            if (reportIds.length > 0) {
                try {
                    perfStart('MSG_BATCH_REPORTS');
                    const r = await fetch(`/api/templates/reports/batch`, {
                        method: 'POST',
                        headers: { "Content-Type": "application/json",...authHeader() },
                        body: JSON.stringify({ ids: reportIds })
                    });
                    perfEnd('MSG_BATCH_REPORTS');
                    log('LOAD MSG: BATCH STATUS', r.status);
                    if (r.ok) {
                        const reportsMap = await r.json();
                        processed = processed.map(m => ({
                          ...m,
                            report: reportsMap[m.report_id] || null,
                            type: m.report_id? "template" : m.type
                        }));
                    }
                } catch (err) { log('LOAD MSG: BATCH ERROR', err); }
            }

            messages = processed;
            await cacheMessages(processed);
            await tick();
            scrollToBottom();
            log('LOAD MSG: DONE', messages.length);
        } catch (err) {
            log('LOAD MSG: FATAL', err);
            isOnline = false;
        } finally {
            isLoadingMessages = false;
            perfEnd('LOAD_MESSAGES_TOTAL');
        }
    }

    async function loadOlderMessages() {
        if (isLoadingOlder ||!selectedRoomId || messages.length === 0) return;
        log('LOAD OLDER MSG');
        isLoadingOlder = true;
        const oldestTs = messages[0].created_at;
        const older = await getCachedMessages(selectedRoomId, oldestTs);
        if (older.length > 0) {
            messages = [...older,...messages];
            log('LOAD OLDER: ADDED', older.length);
        }
        isLoadingOlder = false;
    }

    /* -----------------------------
       REALTIME
    ------------------------------*/

    function subscribeToChat(roomId?: string) {
        if (subscription) {
            log('SUB: KILLING OLD');
            try { supabase.removeChannel(subscription); } catch(e){}
            subscription = null;
        }
        if (!roomId) return;
        log('SUB: START', roomId);
        subscription = supabase.channel(`room:${roomId}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    const newMsg: any = payload.new;
                    log('SUB: NEW MSG', newMsg.id);
                    if (messages.some(m => m.id === newMsg.id)) return;
                    newMsg.is_own = newMsg.sender_id === getCurrentUserId();
                    messages = [...messages, newMsg];
                    await cacheMessages([newMsg]);
                    await tick();
                    scrollToBottom();
                })
          .subscribe((status) => {
                log('SUB: STATUS', status);
                if (status === 'SUBSCRIBED') { isOnline = true; online = true; lastSync = new Date().toLocaleTimeString('en-IN'); }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { isOnline = false; online = false; }
            });
    }

    /* -----------------------------
       SCROLL
    ------------------------------*/

    function scrollToBottom() {
        requestAnimationFrame(() => {
            const element = document.querySelector(".messages");
            if (!element) return;
            element.scrollTop = element.scrollHeight;
        });
    }

    function handleScroll(e: Event) {
        const target = e.target as HTMLElement;
        if (target.scrollTop === 0) {
            log('SCROLL: TOP REACHED');
            loadOlderMessages();
        }
    }

    /* -----------------------------
       SEND MESSAGE
    ------------------------------*/

    async function sendMessage() {
        const text = message.trim();
        log('SEND CLICK', { text: text.slice(0,20), roomId: selectedRoomId });
        if (!text ||!selectedRoomId || (!selectedContact &&!selectedGroup)) {
            log('SEND ABORT');
            return;
        }
        try {
            perfStart('SEND_MSG_API');
            const response = await fetch("/api/messages/send", {
                method: "POST",
                headers: { "Content-Type": "application/json",...authHeader() },
                body: JSON.stringify({ roomId: selectedRoomId, receiverId: selectedContact?.id || selectedGroup?.id, message: text })
            });
            perfEnd('SEND_MSG_API');
            log('SEND: STATUS', response.status);
            const result = await response.json();
            if (!response.ok ||!result.success) throw new Error(result.message || result.error);
            messages = [...messages, result.data];
            await cacheMessages([result.data]);
            message = "";
            showEmoji = false;
            log('SEND: SUCCESS');
        } catch (err: any) {
            log('SEND: ERROR', err);
            isOnline = false;
        }
    }

    /* -----------------------------
       CREATE GROUP/CONTACT
    ------------------------------*/

    async function createGroup() {
        log('CREATE GROUP CLICK');
        if (!groupName.trim()) { alert('Group name required'); return; }
        try {
            const userId = getCurrentUserId();
            if (!userId) { alert('Please login first'); return; }
            perfStart('CREATE_GROUP');
            const { error } = await supabase.from('chat_groups').insert({ name: groupName, description: groupDesc, created_by: userId });
            perfEnd('CREATE_GROUP');
            if (error) throw error;
            groupName = ""; groupDesc = ""; showGroupForm = false;
            await loadGroups();
            log('CREATE GROUP: DONE');
            alert('Group created successfully');
        } catch (err: any) {
            log('CREATE GROUP: ERROR', err);
            alert("Failed: " + err.message);
        }
    }

    async function createContact() {
        log('CREATE CONTACT CLICK');
        if (!contactMobile.trim() ||!contactEmail.trim()) { alert('Mobile and Email required'); return; }
        try {
            const userId = getCurrentUserId();
            if (!userId) { alert('Please login first'); return; }
            perfStart('CREATE_CONTACT');
            const { data: existingUser } = await supabase.from('users').select('id').or(`mobile.eq.${contactMobile},email.eq.${contactEmail}`).single();
            let contactId = existingUser?.id;
            if (!contactId) {
                const { data: newUser, error } = await supabase.from('users').insert({ name: contactName, mobile: contactMobile, email: contactEmail, department }).select().single();
                if (error) throw error;
                contactId = newUser.id;
            }
            const { error: roomError } = await supabase.from('rooms').insert({ user1_id: userId < contactId? userId : contactId, user2_id: userId < contactId? contactId : userId });
            perfEnd('CREATE_CONTACT');
            if (roomError &&!roomError.message.includes('duplicate')) throw roomError;
            contactName = ""; contactMobile = ""; contactEmail = ""; department = ""; showContactForm = false;
            await loadContacts();
            log('CREATE CONTACT: DONE');
            alert('Contact created successfully');
        } catch (err: any) {
            log('CREATE CONTACT: ERROR', err);
            alert("Failed: " + err.message);
        }
    }

    async function deleteContact(id: string) {
        log('DELETE CONTACT', id);
        if (!confirm('Delete this contact?')) return;
        perfStart('DELETE_CONTACT');
        await supabase.from('rooms').delete().eq('id', id);
        perfEnd('DELETE_CONTACT');
        await loadContacts();
        selectedContact = null; selectedRoomId = null;
    }

    async function deleteGroup(id: string) {
        log('DELETE GROUP', id);
        if (!confirm('Delete this group?')) return;
        perfStart('DELETE_GROUP');
        await supabase.from('chat_groups').delete().eq('id', id);
        perfEnd('DELETE_GROUP');
        await loadGroups();
        selectedGroup = null; selectedRoomId = null;
    }

    /* -----------------------------
       MIC
    ------------------------------*/

    async function toggleRecording() {
        log('MIC CLICK', isRecording);
        if (!isRecording) {
            try {
                log('MIC: PERMISSION');
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(micStream);
                audioChunks = [];
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    log('MIC: STOPPED');
                    alert('Voice recorded. Add upload API to send.');
                    micStream?.getTracks().forEach(track => track.stop());
                    micStream = null;
                };
                mediaRecorder.start();
                isRecording = true;
                log('MIC: RECORDING');
            } catch (err) { log('MIC: DENIED', err); alert('Mic access denied'); }
        } else {
            mediaRecorder?.stop();
            isRecording = false;
            log('MIC: STOP REQUESTED');
        }
    }

    /* -----------------------------
       TEMPLATE HANDLERS
    ------------------------------*/

    async function useTemplate(event: any) {
        log('USE TEMPLATE', event.detail.name);
        selectedTemplate = event.detail;
        showTemplatePopup = false;
        await loadTemplateFields(selectedTemplate.id);
        showTemplateForm = true;
    }

    async function installTemplate(msg: any) {
        log('INSTALL TEMPLATE', msg.template_name);
        try {
            perfStart('INSTALL_TEMPLATE');
            const res = await fetch("/api/templates/install", { method: "POST", headers: { "Content-Type": "application/json",...authHeader() }, body: JSON.stringify({ template_code: msg.template_code, template_id: msg.template_id, version: msg.template_version, name: msg.template_name, user: "Mani" }) });
            perfEnd('INSTALL_TEMPLATE');
            const data = await res.json();
            if (data.success) { log('INSTALL: SUCCESS'); alert("✅ Template Installed Successfully"); await loadTemplates(); }
            else { log('INSTALL: FAIL'); alert("❌ Installation Failed"); }
        } catch (err) { log('INSTALL: ERROR', err); alert("❌ Installation Failed"); }
    }

    async function sendTemplateReport(e: any) {
        log('SEND TEMPLATE REPORT');
        try {
            perfStart('SEND_TEMPLATE_REPORT');
            const res = await fetch("/api/templates/report", { method: "POST", headers: { "Content-Type": "application/json",...authHeader() }, body: JSON.stringify({ template: e.detail.template, values: e.detail.values, sender: "Mani", room_id: selectedRoomId }) });
            perfEnd('SEND_TEMPLATE_REPORT');
            const data = await res.json();
            if (!res.ok) { log('SEND REPORT: FAIL', data); alert(data.error || "Failed to send report"); return; }
            log('SEND REPORT: SUCCESS');
            alert("✅ Report Sent Successfully");
            showTemplateForm = false;
            await loadMessages(selectedRoomId);
        } catch (err) {
            log('SEND REPORT: ERROR', err);
            alert("❌ Failed to send report");
        }
    }

    function notifyTyping() { return; }
    function selectTemplate(event: CustomEvent) {
        log('SELECT TEMPLATE', event.detail.name);
        selectedTemplate = event.detail;
        templateFields = selectedTemplate.fields?? [];
        showTemplatePopup = false;
        showTemplateForm = true;
    }

    /* -----------------------------
       BULLETPROOF INIT - NON BLOCKING
    ------------------------------*/

    async function initChat() {
        perfStart('INIT_CHAT_TOTAL');
        log('INIT START');
        if (isInitializing ||!browser) return;
        isInitializing = true;

        try {
            const userId = getCurrentUserId();
            log('USER_ID', userId);
            if (!userId) { log('NO USER -> LOGIN'); goto("/login"); return; }

            // Reset state
            selectedGroup = null;
            selectedContact = null;
            selectedRoomId = null;
            messages = [];
            showEmoji = false;
            showGroupForm = false;
            showContactForm = false;
            showTemplatePopup = false;
            showTemplateForm = false;
            log('STATE RESET');

            // Kill old subscription
            if (subscription) {
                log('KILL OLD SUB');
                try { supabase.removeChannel(subscription); } catch(e){}
                subscription = null;
            }

            // Init DB
            await initDB();

            // Load emoji picker - don't block
            if (!emojiPicker) {
                import('emoji-picker-element').then(async () => {
                    await tick();
                    emojiPicker = document.querySelector('emoji-picker');
                    emojiPicker?.addEventListener('emoji-click', (e: any) => {
                        log('EMOJI CLICKED', e.detail.unicode);
                        message += e.detail.unicode;
                        showEmoji = false;
                    });
                    log('EMOJI READY');
                }).catch(e => log('EMOJI FAIL', e));
            }

            // Load sidebar - DON'T AWAIT, let UI render
            log('LOAD SIDEBAR - NON BLOCKING');
            loadGroups().then(() => log('GROUPS DONE'));
            loadContacts().then(() => log('CONTACTS DONE'));

            log('INIT END - UI VISIBLE');
        } finally {
            isInitializing = false;
            perfEnd('INIT_CHAT_TOTAL');
            console.log('📊 PERFORMANCE SUMMARY: Check logs above for 🐌 SLOW warnings');
        }
    }

    onMount(async () => {
        log('ONMOUNT');
        isOnline = navigator.onLine;
        window.addEventListener('online', () => { isOnline = true; log('NETWORK: ONLINE'); });
        window.addEventListener('offline', () => { isOnline = false; log('NETWORK: OFFLINE'); });
        await initChat();
    });

    afterNavigate(async () => {
        log('AFTER NAVIGATE');
        await invalidateAll();
        await tick();
        await initChat();
    });

    onDestroy(() => {
        log('ONDESTROY');
        if (subscription) {
            try { subscription.unsubscribe(); } catch(e){}
        }
        micStream?.getTracks().forEach(track => track.stop());
    });
</script>

<!-- FIX #3: Only ONE template block -->
{#key $page.url.pathname}
<svelte:boundary onerror={(e) => console.error('CHAT CRASH:', e)}>
<div class="chat-container">
    <ChatSidebar
        {groups}
        {contacts}
        {selectedGroup}
        {selectedContact}
        loading={!groupsLoaded ||!contactsLoaded}
        on:newGroup={() => { log('NEW GROUP BTN'); showGroupForm=true; }}
        on:newContact={() => { log('NEW CONTACT BTN'); showContactForm=true; }}
        on:selectGroup={selectGroup}
        on:selectContact={selectContact}
        on:deleteContact={(e) => deleteContact(e.detail.id)}
        on:deleteGroup={(e) => deleteGroup(e.detail.id)}
    />

    <section class="chat-area">
        {#if selectedRoomId}
            <ChatHeader
                title={selectedContact?.name?? selectedGroup?.name}
                subtitle={selectedContact? selectedContact.mobile : `${selectedGroup?.members?? 0} members`}
                online={false}
                {typing}
            />
            <div class="network-status" class:offline={!isOnline}>
                {#if isOnline}
                    <span class="dot online"></span> Online - Last sync: {lastSync}
                {:else}
                    <span class="dot offline"></span> Offline - Reconnecting...
                {/if}
            </div>
            <div class="messages" on:scroll={handleScroll}>
                <MessageList {messages} on:install={(e) => installTemplate(e.detail)} />
            </div>
            {#if typingStatus}<div class="typing">{typingStatus}</div>{/if}
            <div class="message-box">
                <button class="icon-btn" on:click={() => { log('EMOJI BTN'); showEmoji =!showEmoji; }}>😀</button>
                {#if showEmoji}
                    <div class="emoji-popup" bind:this={emojiPickerContainer}>
                        <emoji-picker></emoji-picker>
                    </div>
                {/if}
                <input bind:value={message} placeholder="Type your message..." on:input={notifyTyping} on:keydown={(e) => { if (e.key === "Enter") { log('ENTER KEY'); sendMessage(); } }} disabled={!isOnline ||!selectedRoomId} />
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
</svelte:boundary>
{/key}

{#if showGroupForm}
<div class="popup">
    <div class="popup-card">
        <h2>Create Group</h2>
        <input bind:value={groupName} placeholder="Group Name" />
        <textarea bind:value={groupDesc} placeholder="Description"></textarea>
        <div class="popup-buttons">
            <button on:click={createGroup}>Create</button>
            <button class="cancel-btn" on:click={() => { log('CANCEL GROUP'); showGroupForm = false; }}>Cancel</button>
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
            <button class="cancel-btn" on:click={() => { log('CANCEL CONTACT'); showContactForm = false; }}>Cancel</button>
        </div>
    </div>
</div>
{/if}

{#if showCreateTemplate}
<div class="overlay">
    <TemplateDesigner on:saved={async () => { log('TEMPLATE SAVED'); showCreateTemplate = false; await loadTemplates(); }} on:close={() => { log('TEMPLATE CLOSE'); showCreateTemplate = false; }} />
</div>
{/if}

{#if showTemplatePopup}
<div class="overlay">
    <TemplatePopup {templates} on:close={() => { log('TEMPLATE POPUP CLOSE'); showTemplatePopup = false; }} on:new={() => { log('NEW TEMPLATE'); showTemplatePopup = false; showTemplateDesigner = true; }} on:use={selectTemplate} />
</div>
{/if}

{#if showTemplateDesigner}
<div class="overlay">
    <TemplateDesigner on:close={() => { log('DESIGNER CLOSE'); showTemplateDesigner = false; }} on:saved={async () => { log('DESIGNER SAVED'); showTemplateDesigner = false; await loadTemplates(); showTemplatePopup = true; }} />
</div>
{/if}

{#if showTemplateForm && selectedTemplate}
<div class="overlay">
    <TemplateForm template={selectedTemplate} fields={selectedTemplate.fields} on:cancel={() => { log('FORM CANCEL'); showTemplateForm = false; selectedTemplate = null; }} on:submit={sendTemplateReport} />
</div>
{/if}

<style>
.overlay{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; justify-content:center; align-items:center; z-index:9999; }
.chat-container{ display:flex; height:100vh; background:#f0f2f5; }
.chat-area{ flex:1; display:flex; flex-direction:column; min-width: 0; }
.network-status{ padding: 6px 16px; background: #dcf8c6; font-size: 12px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e5e7eb; }
.network-status.offline{ background: #ffebee; }
.dot{ width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot.online{ background: #25d366; }
.dot.offline{ background: #ff3b30; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.messages{ flex: 1; overflow-y: auto; padding: 12px; mask-image: linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 3%, black 97%, transparent 100%); }
.typing{ padding:8px 20px; font-size:13px; color:#666; }
.message-box{ height:70px; display:flex; align-items:center; gap:10px; padding:12px; background:white; border-top: 1px solid #e5e7eb; position: relative; }
.message-box input{ flex:1; border:none; background:#f0f2f5; border-radius:30px; padding:12px 18px; outline: none; }
.message-box input:disabled{ opacity: 0.5; cursor: not-allowed; }
.message-box button{ padding:12px 20px; border:none; background:#2563eb; color:#fff; border-radius:30px; cursor:pointer; font-weight: 600; }
.message-box button:hover:not(:disabled){ background: #1d4ed8; }
.message-box button:disabled{ opacity: 0.5; cursor: not-allowed; }
.icon-btn{ background: none!important; color: #666!important; padding: 8px!important; font-size: 20px; }
.icon-btn.recording{ background: #ef4444!important; color: white!important; animation: pulse 1s infinite; }
.emoji-popup{ position: absolute; bottom: 70px; left: 12px; z-index: 100; }
.empty-chat-screen{ flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#666; }
.popup{ position:fixed; inset:0; background:rgba(0,0,0,0.5);
.emoji-popup{ position: absolute; bottom: 70px; left: 12px; z-index: 100; }
.empty-chat-screen{ flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#666; }
.popup{ position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:100; }
.popup-card{ background:#fff; padding:24px; border-radius:12px; width:90%; max-width:500px; }
.popup-card input,.popup-card textarea{ width:100%; padding:10px; margin:8px 0; border:1px solid #ddd; border-radius:6px; font-family: inherit; }
.popup-buttons{ display:flex; gap:10px; justify-content:flex-end; margin-top:16px; }
.popup-buttons button{ padding:10px 20px; border:none; border-radius:6px; cursor:pointer; font-weight: 600; }
.popup-buttons button:first-child{ background: #2563eb; color: white; }
.cancel-btn{ background:#f0f2f5; }
</style>