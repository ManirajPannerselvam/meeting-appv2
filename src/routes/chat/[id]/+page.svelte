 
<script lang="ts">
    import { page } from '$app/stores';
    import { onMount, onDestroy, tick, afterUpdate } from 'svelte';
    import { supabase } from '$lib/supabase';
    import type { RealtimeChannel } from '@supabase/supabase-js';
    import { openDB } from 'idb';
    import 'emoji-picker-element';

    export let data: { id: string };

    let chatId = data.id;
    let messages: any[] = [];
    let chatInfo: any = null;
    let messageText = '';
    let isLoading = false;
    let isLoadingOlder = false;
    let subscription: RealtimeChannel | null = null;

    let showEmoji = false;
    console.log(' emoji-picker registered:',!!customElements.get('emoji-picker'));

    let isRecording = false;
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let micStream: MediaStream | null = null;
    let recordingTime = 0;
    let recordingInterval: any;

    let selectedMsg: any = null;
    let showMsgMenu = false;
    let showDeleteConfirm = false;
    let fileInput: HTMLInputElement;
    let messagesContainer: HTMLElement;
    let shouldAutoScroll = true;
    let userScrolledUp = false;

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
        if (beforeTs) filtered = filtered.filter(m => new Date(m.created_at).getTime() < beforeTs);
        return filtered
.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
.slice(0, 50)
.reverse();
    }

    async function deleteCachedMessage(msgId: string) {
        const db = await dbPromise;
        await db.delete('messages', msgId);
    }

    function getCurrentUserId() {
        return localStorage.getItem("userId") || "";
    }

    function token(): string {
        return localStorage.getItem("token") || "";
    }

    function authHeader() {
        const t = token();
        if (!t) return {};
        return { Authorization: `Bearer ${t}` };
    }

    async function loadChatInfo() {
        try {
            const { data: group } = await supabase
   .from('chat_groups')
   .select('*')
   .eq('id', chatId)
   .single();

            if (group) {
                chatInfo = {...group, type: 'group' };
            } else {
                const { data: room } = await supabase
       .from('rooms')
       .select(`
                        id,
                        user1_id,
                        user2_id,
                        user1:user1_id(id, name, mobile),
                        user2:user2_id(id, name, mobile)
                    `)
       .eq('id', chatId)
       .single();

                if (room) {
                    const userId = getCurrentUserId();
                    const otherUser = room.user1_id === userId? room.user2 : room.user1;
                    chatInfo = {...otherUser, type: 'contact', room_id: room.id };
                }
            }
        } catch (err) {
            console.error('loadChatInfo error:', err);
        }
    }

    async function loadMessages() {
        if (isLoading) return;
        isLoading = true;

        try {
            const cached = await getCachedMessages(chatId);
            if (cached.length > 0) {
                messages = cached;
                await tick();
                scrollToBottom(true);
                isLoading = false;
                return;
            }

            const { data, error } = await supabase
   .from("messages")
   .select("*")
   .eq("room_id", chatId)
   .order("created_at", { ascending: false })
   .limit(50);

            if (error) throw error;

            const processed = await Promise.all(
                (data || []).reverse().map(async (m: any) => {
                    const { data: user } = await supabase
           .from("users")
           .select("id, name, mobile")
           .eq("id", m.sender_id)
           .maybeSingle();

                    m.users = user?? null;
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
            await cacheMessages(processed);
            await tick();
            scrollToBottom(true);

        } catch (err) {
            console.error("loadMessages error:", err);
        } finally {
            isLoading = false;
        }
    }

    async function loadOlderMessages() {
        if (isLoadingOlder || messages.length === 0) return;
        isLoadingOlder = true;

        const scrollHeight = messagesContainer.scrollHeight;
        const scrollTop = messagesContainer.scrollTop;

        const oldestTs = new Date(messages[0].created_at).getTime();
        const older = await getCachedMessages(chatId, oldestTs);

        if (older.length > 0) {
            messages = [...older,...messages];
            await tick();
            messagesContainer.scrollTop = messagesContainer.scrollHeight - scrollHeight + scrollTop;
        }
        isLoadingOlder = false;
    }

    function subscribeToChat() {
        if (subscription) {
            supabase.removeChannel(subscription);
            subscription = null;
        }

        subscription = supabase
.channel(`room:${chatId}`)
.on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `room_id=eq.${chatId}`
                },
                async (payload) => {
                    const newMsg: any = payload.new;
                    if (messages.some(m => m.id === newMsg.id)) return;

                    const { data: user } = await supabase
       .from("users")
       .select("id, name, mobile")
       .eq("id", newMsg.sender_id)
       .maybeSingle();

                    newMsg.users = user?? null;
                    newMsg.is_own = newMsg.sender_id === getCurrentUserId();

                    messages = [...messages, newMsg];
                    await cacheMessages([newMsg]);
                    await tick();
                    if (shouldAutoScroll) scrollToBottom();
                }
            )
.on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "messages",
                    filter: `room_id=eq.${chatId}`
                },
                async (payload) => {
                    messages = messages.filter(m => m.id!== payload.old.id);
                    await deleteCachedMessage(payload.old.id);
                }
            )
.subscribe();
    }

    function handleScroll(e: Event) {
        const target = e.target as HTMLElement;

        if (target.scrollTop === 0) {
            loadOlderMessages();
        }

        const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
        userScrolledUp =!isAtBottom;
        shouldAutoScroll = isAtBottom;
    }

    function scrollToBottom(force = false) {
        if (!messagesContainer) return;
        if (force ||!userScrolledUp) {
            requestAnimationFrame(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
        }
    }

    async function sendMessage() {
        const text = messageText.trim();
        if (!text ||!chatId) return;

        try {
            const payload: any = {
                roomId: chatId,
                message: text
            };

            if (chatInfo?.type === 'contact') {
                payload.receiverId = chatInfo.id;
            }

            const response = await fetch("/api/messages/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
   ...authHeader()
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok ||!result.success) {
                throw new Error(result.message || "Failed to send");
            }

            messages = [...messages, result.data];
            await cacheMessages([result.data]);
            messageText = "";
            showEmoji = false;
            shouldAutoScroll = true;
            await tick();
            scrollToBottom(true);

        } catch (err: any) {
            console.error("sendMessage error:", err);
            alert("Failed to send message");
        }
    }

    async function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('roomId', chatId);
        if (chatInfo?.type === 'contact') {
            formData.append('receiverId', chatInfo.id);
        }

        try {
            const res = await fetch('/api/messages/file', {
                method: 'POST',
                headers: authHeader(),
                body: formData
            });

            const result = await res.json();
            if (result.success) {
                messages = [...messages, result.data];
                await cacheMessages([result.data]);
                await tick();
                scrollToBottom(true);
            }
        } catch (err) {
            console.error('File upload error:', err);
            alert('Failed to upload file');
        }

        input.value = '';
    }

    async function toggleRecording() {
        console.log('[MIC] Button clicked. isRecording:', isRecording);

        if (!isRecording) {
            try {
                console.log('[MIC] Checking support...');
                console.log('[MIC] navigator.mediaDevices:',!!navigator.mediaDevices);
                console.log('[MIC] getUserMedia:',!!navigator.mediaDevices?.getUserMedia);
                console.log('[MIC] Protocol:', window.location.protocol, 'Host:', window.location.host);

                if (!navigator.mediaDevices?.getUserMedia) {
                    alert('Mic requires HTTPS or localhost. Use http://localhost:1420');
                    console.error('[MIC] getUserMedia not available');
                    return;
                }

                console.log('[MIC] Requesting permission...');
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('[MIC] Permission granted:', micStream);

                mediaRecorder = new MediaRecorder(micStream);
                audioChunks = [];
                recordingTime = 0;

                mediaRecorder.ondataavailable = e => {
                    console.log('[MIC] Audio chunk:', e.data.size, 'bytes');
                    audioChunks.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    console.log('[MIC] Recording stopped. Chunks:', audioChunks.length);
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log('[MIC] Blob created:', audioBlob.size, 'bytes');

                    const formData = new FormData();
                    formData.append('file', audioBlob, `voice-${Date.now()}.webm`);
                    formData.append('roomId', chatId);
                    if (chatInfo?.type === 'contact') {
                        formData.append('receiverId', chatInfo.id);
                    }
                    formData.append('type', 'voice');

                    try {
                        console.log('[MIC] Uploading...');
                        const res = await fetch('/api/messages/voice', {
                            method: 'POST',
                            headers: authHeader(),
                            body: formData
                        });
                        const result = await res.json();
                        console.log('[MIC] Upload result:', result);
                        if (result.success) {
                            messages = [...messages, result.data];
                            await cacheMessages([result.data]);
                            await tick();
                            scrollToBottom(true);
                        }
                    } catch (err) {
                        console.error('[MIC] Upload error:', err);
                        alert('Failed to send voice message');
                    }

                    micStream?.getTracks().forEach(track => track.stop());
                    micStream = null;
                    clearInterval(recordingInterval);
                };

                mediaRecorder.start();
                isRecording = true;
                console.log('[MIC] Recording started');

                recordingInterval = setInterval(() => {
                    recordingTime++;
                }, 1000);

            } catch (err: any) {
                console.error('[MIC] Error:', err.name, err.message);
                alert('Mic access denied. Check browser permissions.');
            }
        } else {
            console.log('[MIC] Stopping recording...');
            mediaRecorder?.stop();
            isRecording = false;
            clearInterval(recordingInterval);
            recordingTime = 0;
        }
    }

    function formatRecordingTime(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function handleMsgLongPress(msg: any) {
        if (!msg.is_own) return;
        selectedMsg = msg;
        showMsgMenu = true;
    }

    async function deleteMessage() {
        if (!selectedMsg) return;
        if (!confirm('Delete this message?')) return;

        try {
            await supabase.from('messages').delete().eq('id', selectedMsg.id);
            await deleteCachedMessage(selectedMsg.id);
            messages = messages.filter(m => m.id!== selectedMsg.id);
            showMsgMenu = false;
            selectedMsg = null;
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete');
        }
    }

    function handleEmojiClick(e: any) {
        console.log('[EMOJI] Event fired:', e.detail);
        console.log('[EMOJI] Unicode:', e.detail.unicode);
        messageText += e.detail.unicode;
        console.log('[EMOJI] New text:', messageText);
        showEmoji = false;
        setTimeout(() => {
            const input = document.querySelector('.input-bar input') as HTMLInputElement;
            input?.focus();
            console.log('[EMOJI] Focused input');
        }, 0);
    }

    function toggleEmoji() {
        console.log('[EMOJI] Button clicked. showEmoji was:', showEmoji);
        showEmoji =!showEmoji;
        console.log('[EMOJI] showEmoji now:', showEmoji);

        setTimeout(() => {
            const picker = document.querySelector('emoji-picker');
            console.log('[EMOJI] emoji-picker in DOM:',!!picker);
            if (picker) console.log('[EMOJI] picker element:', picker);
        }, 100);
    }

    function handleClickOutside(e: MouseEvent) {
        if (showEmoji &&!(e.target as Element).closest('.emoji-popup') &&!(e.target as Element).closest('.emoji-btn')) {
            console.log('[EMOJI] Closing popup - click outside');
            showEmoji = false;
        }
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
                    name: msg.template_name
                })
            });

            const data = await res.json();
            if (data.success) {
                alert("✅ Template Installed");
            }
        } catch (err) {
            console.error("installTemplate error:", err);
        }
    }

    onMount(async () => {
        console.log(' Component mounted');
        console.log(' emoji-picker-element registered:',!!customElements.get('emoji-picker'));
        await loadChatInfo();
        await loadMessages();
        subscribeToChat();
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    });

    onDestroy(() => {
        if (subscription) subscription.unsubscribe();
        micStream?.getTracks().forEach(track => track.stop());
        clearInterval(recordingInterval);
    });

    afterUpdate(() => {
        if (shouldAutoScroll &&!userScrolledUp) {
            scrollToBottom();
        }
    });

    $: if (data.id!== chatId) {
        chatId = data.id;
        messages = [];
        loadChatInfo();
        loadMessages();
        subscribeToChat();
    }
</script>

<svelte:head>
    <title>{chatInfo?.name || 'Chat'}</title>
</svelte:head>

<div class="chat-window">

    <div class="header">
        <a href="/chat" class="back-btn">←</a>
        <div class="chat-info">
            <div class="name">{chatInfo?.name || 'Loading...'}</div>
            <div class="status">
                {#if chatInfo?.type === 'group'}
                    {chatInfo?.members?.length || 0} members
                {:else}
                    {chatInfo?.mobile || ''}
                {/if}
            </div>
        </div>
        <button class="icon-btn">⋮</button>
    </div>

    <div class="messages" bind:this={messagesContainer} on:scroll={handleScroll}>
        {#if isLoadingOlder}
            <div class="loading-older">Loading older messages...</div>
        {/if}

        {#each messages as msg (msg.id)}
            <div
                class="msg-wrapper"
                class:own={msg.is_own}
                on:contextmenu|preventDefault={() => handleMsgLongPress(msg)}
            >
                <div class="msg-bubble">
                    {#if msg.type === 'template' && msg.report}
                        <div class="template-msg">
                            <div class="template-header">📋 {msg.report.template_name}</div>
                            {#each Object.entries(msg.report.values || {}) as [key, value]}
                                <div class="template-field">
                                    <span class="field-name">{key}:</span>
                                    <span class="field-value">{value}</span>
                                </div>
                            {/each}
                        </div>
                    {:else if msg.type === 'voice'}
                        <div class="voice-msg">
                            🎤 Voice message
                            <audio controls src={msg.file_url}></audio>
                        </div>
                    {:else if msg.type === 'file'}
                        <div class="file-msg">
                            📎 <a href={msg.file_url} target="_blank">{msg.file_name}</a>
                        </div>
                    {:else}
                        <div class="msg-text">{msg.message || msg.text}</div>
                    {/if}

                    <div class="msg-meta">
                        <span class="msg-time">
                            {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {#if msg.is_own}
                            <span class="msg-status">✓✓</span>
                        {/if}
                    </div>
                </div>
            </div>
        {/each}

        {#if messages.length === 0 &&!isLoading}
            <div class="empty-msgs">
                <p>No messages yet</p>
                <p class="hint">Start the conversation</p>
            </div>
        {/if}
    </div>

    <div class="input-bar">
        <button class="icon-btn emoji-btn" on:click|stopPropagation={toggleEmoji}>😀</button>
        {#if showEmoji}
            <div class="emoji-popup" on:click|stopPropagation>
                <emoji-picker on:emoji-click={handleEmojiClick}></emoji-picker>
            </div>
        {/if}

        <input
            type="file"
            bind:this={fileInput}
            on:change={handleFileSelect}
            style="display: none"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        />
        <button class="icon-btn" on:click={() => fileInput.click()}>📎</button>

        {#if isRecording}
            <div class="recording-bar">
                <span class="rec-dot"></span>
                <span class="rec-time">{formatRecordingTime(recordingTime)}</span>
                <button class="stop-btn" on:click={toggleRecording}>⏹️ Stop</button>
            </div>
        {:else}
            <input
                bind:value={messageText}
                placeholder="Type a message"
                on:keydown={(e) => e.key === "Enter" && sendMessage()}
            />

            {#if messageText.trim()}
                <button class="send-btn" on:click={sendMessage}>➤</button>
            {:else}
                <button class="icon-btn" on:click={toggleRecording}>🎤</button>
            {/if}
        {/if}
    </div>

</div>

{#if showMsgMenu && selectedMsg}
<div class="msg-context-overlay" on:click={() => showMsgMenu = false}>
    <div class="msg-context-menu" on:click|stopPropagation>
        <button on:click={() => { showDeleteConfirm = true; showMsgMenu = false; }}>
            Delete Message
        </button>
        <button on:click={() => showMsgMenu = false}>Cancel</button>
    </div>
</div>
{/if}

{#if showDeleteConfirm}
<div class="popup-overlay">
    <div class="popup-card">
        <h3>Delete message?</h3>
        <p>This cannot be undone.</p>
        <div class="popup-buttons">
            <button on:click={() => showDeleteConfirm = false}>Cancel</button>
            <button class="danger" on:click={deleteMessage}>Delete</button>
        </div>
    </div>
</div>
{/if}

<style>
.chat-window {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #efeae2;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18l-4-4 4-4M18 7l4 4-4 4' stroke='%23d1d7db' stroke-width='0.5' fill='none'/%3E%3C/svg%3E");
}

.header {
    background: #3b82f6;
    color: white;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.back-btn {
    color: white;
    text-decoration: none;
    font-size: 24px;
    padding: 4px;
    display: none;
}

@media (max-width: 767px) {
.back-btn {
        display: block;
    }
}

.chat-info {
    flex: 1;
}

.name {
    font-size: 16px;
    font-weight: 600;
}

.status {
    font-size: 12px;
    opacity: 0.9;
}

.icon-btn {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    padding: 4px 8px;
    cursor: pointer;
}

.messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    mask-image: linear-gradient(to bottom, transparent 0%, black 2%, black 98%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 2%, black 98%, transparent 100%);
}

.loading-older {
    text-align: center;
    padding: 12px;
    color: #667781;
    font-size: 13px;
}

.msg-wrapper {
    display: flex;
    margin-bottom: 2px;
}

.msg-wrapper.own {
    justify-content: flex-end;
}

.msg-bubble {
    max-width: 65%;
    padding: 8px 12px;
    border-radius: 8px;
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    position: relative;
}

.msg-wrapper.own.msg-bubble {
    background: #d9fdd3;
}

.msg-text {
    font-size: 14px;
    line-height: 1.4;
    color: #111b21;
    word-wrap: break-word;
}

.msg-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 4px;
}

.msg-time {
    font-size: 11px;
    color: #667781;
}

.msg-status {
    font-size: 12px;
    color: #53bdeb;
}

.template-msg {
    background: #f0f9ff;
    padding: 12px;
    border-radius: 6px;
    border-left: 3px solid #3b82f6;
}

.template-header {
    font-weight: 600;
    margin-bottom: 8px;
    color: #1e40af;
}

.template-field {
    display: flex;
    gap: 8px;
    margin: 4px 0;
    font-size: 13px;
}

.field-name {
    font-weight: 500;
    color: #475569;
}

.field-value {
    color: #1e293b;
}

.voice-msg audio {
    width: 100%;
    margin-top: 8px;
}

.file-msg a {
    color: #3b82f6;
    text-decoration: none;
}

.empty-msgs {
    margin: auto;
    text-align: center;
    color: #667781;
}

.empty-msgs.hint {
    font-size: 13px;
    margin-top: 8px;
}

.input-bar {
    background: #f0f2f5;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-top: 1px solid #e5e7eb;
    position: relative;
}

.input-bar input {
    flex: 1;
    border: none;
    background: white;
    border-radius: 24px;
    padding: 10px 16px;
    font-size: 15px;
    outline: none;
}

.input-bar.icon-btn {
    color: #54656f;
    font-size: 24px;
}

.send-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
}

.send-btn:hover {
    background: #2563eb;
}

.recording-bar {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    background: white;
    border-radius: 24px;
    padding: 10px 16px;
}

.rec-dot {
    width: 12px;
    height: 12px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse 1s infinite;
}

.rec-time {
    flex: 1;
    font-size: 15px;
    color: #111b21;
}

.stop-btn {
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 16px;
    padding: 6px 16px;
    font-size: 14px;
    cursor: pointer;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

.emoji-popup {
    position: absolute;
    bottom: 60px;
    left: 12px;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 8px;
}

.msg-context-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
}

.msg-context-menu {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    min-width: 200px;
}

.msg-context-menu button {
    display: block;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
    background: none;
    border: none;
    font-size: 15px;
    cursor: pointer;
}

.msg-context-menu button:hover {
    background: #f5f5f5;
}

.popup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.popup-card {
    background: white;
    padding: 24px;
    border-radius: 12px;
    min-width: 300px;
}

.popup-card h3 {
    margin: 0 0 12px 0;
}

.popup-buttons {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 20px;
}

.popup-buttons button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}

.popup-buttons button.danger {
    background: #ef4444;
    color: white;
}
</style>