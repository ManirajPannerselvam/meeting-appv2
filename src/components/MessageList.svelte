<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let messages: any[] = [];

    const dispatch = createEventDispatcher();

    // Format time: "7:02 AM"
    function formatTime(timestamp: string) {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Format date divider: "Today", "Yesterday", "14 Jan 2026"
    function formatDateDivider(timestamp: string) {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    }

    // Check if should show date divider
    function shouldShowDateDivider(index: number) {
        if (index === 0) return true;
        const currentDate = new Date(messages[index].created_at).toDateString();
        const prevDate = new Date(messages[index - 1].created_at).toDateString();
        return currentDate!== prevDate;
    }

    // Handle template install
    function handleInstall(msg: any) {
        dispatch('install', msg);
    }

    // Handle long press / right click
    function handleContextMenu(e: MouseEvent, msg: any) {
        e.preventDefault();
        if (msg.is_own) {
            dispatch('messageAction', { action: 'menu', message: msg });
        }
    }

    // Check if file is image
    function isImage(url: string) {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    }

    // Format file size
    function formatFileSize(bytes: number) {
        if (!bytes) return '';
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    }
</script>

<div class="message-list">
    {#each messages as msg, i (msg.id)}
        <!-- Date Divider -->
        {#if shouldShowDateDivider(i)}
            <div class="date-divider">
                <span>{formatDateDivider(msg.created_at)}</span>
            </div>
        {/if}

        <!-- Message Wrapper -->
        <div
            class="msg-wrapper"
            class:own={msg.is_own}
            on:contextmenu={(e) => handleContextMenu(e, msg)}
        >
            <div class="msg-bubble" class:template={msg.type === 'template'}>

                <!-- 1. TEMPLATE MESSAGE -->
                {#if msg.type === 'template' && msg.report}
                    <div class="template-msg">
                        <div class="template-header">
                            <span class="icon">📋</span>
                            <span class="title">{msg.report.template_name}</span>
                        </div>

                        <div class="template-body">
                            {#each Object.entries(msg.report.values || {}) as [key, value]}
                                <div class="template-field">
                                    <span class="field-name">{key}:</span>
                                    <span class="field-value">{value}</span>
                                </div>
                            {/each}
                        </div>

                        {#if msg.report.installable}
                            <button
                                class="install-btn"
                                on:click={() => handleInstall(msg)}
                            >
                                ⬇️ Install Template
                            </button>
                        {/if}
                    </div>

                <!-- 2. VOICE MESSAGE -->
                {:else if msg.type === 'voice'}
                    <div class="voice-msg">
                        <div class="voice-icon">🎤</div>
                        <div class="voice-info">
                            <audio controls src={msg.file_url} preload="metadata"></audio>
                            <div class="voice-meta">
                                <span>Voice message</span>
                                {#if msg.duration}
                                    <span>• {msg.duration}s</span>
                                {/if}
                            </div>
                        </div>
                    </div>

                <!-- 3. FILE MESSAGE -->
                {:else if msg.type === 'file'}
                    <div class="file-msg">
                        {#if isImage(msg.file_url)}
                            <!-- Image Preview -->
                            <div class="image-preview">
                                <img src={msg.file_url} alt={msg.file_name} loading="lazy" />
                                {#if msg.caption}
                                    <div class="caption">{msg.caption}</div>
                                {/if}
                            </div>
                        {:else}
                            <!-- Document File -->
                            <a href={msg.file_url} target="_blank" class="file-link">
                                <div class="file-icon">📄</div>
                                <div class="file-info">
                                    <div class="file-name">{msg.file_name || 'Document'}</div>
                                    <div class="file-size">{formatFileSize(msg.file_size)}</div>
                                </div>
                            </a>
                        {/if}
                    </div>

                <!-- 4. TEXT MESSAGE -->
                {:else}
                    <div class="msg-text">{msg.message || msg.text}</div>
                {/if}

                <!-- MESSAGE META: Time + Status -->
                <div class="msg-meta">
                    <span class="msg-time">{formatTime(msg.created_at)}</span>
                    {#if msg.is_own}
                        <span class="msg-status" class:read={msg.read_at}>
                            {#if msg.read_at}
                                ✓✓
                            {:else if msg.delivered_at}
                                ✓✓
                            {:else}
                                ✓
                            {/if}
                        </span>
                    {/if}
                </div>
            </div>
        </div>
    {/each}

    {#if messages.length === 0}
        <div class="empty-state">
            <div class="empty-icon">💬</div>
            <p>No messages yet</p>
            <p class="hint">Send a message to start the conversation</p>
        </div>
    {/if}
</div>

<style>
.message-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
}

/* DATE DIVIDER */
.date-divider {
    display: flex;
    justify-content: center;
    margin: 16px 0 8px;
}

.date-divider span {
    background: #e1f3fb;
    color: #54656f;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* MESSAGE WRAPPER */
.msg-wrapper {
    display: flex;
    margin: 0 16px 2px;
    max-width: 100%;
}

.msg-wrapper.own {
    justify-content: flex-end;
}

/* MESSAGE BUBBLE */
.msg-bubble {
    max-width: 65%;
    padding: 6px 8px 8px 10px;
    border-radius: 8px;
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    position: relative;
    word-wrap: break-word;
}

.msg-wrapper.own.msg-bubble {
    background: #d9fdd3;
}

.msg-bubble.template {
    padding: 0;
    overflow: hidden;
}

/* TEXT MESSAGE */
.msg-text {
    font-size: 14.2px;
    line-height: 19px;
    color: #111b21;
    white-space: pre-wrap;
    word-break: break-word;
}

/* TEMPLATE MESSAGE */
.template-msg {
    min-width: 280px;
}

.template-header {
    background: #3b82f6;
    color: white;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 14px;
}

.template-header.icon {
    font-size: 18px;
}

.template-body {
    padding: 12px;
    background: #f8fafc;
}

.template-field {
    display: flex;
    gap: 8px;
    margin: 6px 0;
    font-size: 13px;
}

.field-name {
    font-weight: 600;
    color: #475569;
    min-width: 80px;
}

.field-value {
    color: #1e293b;
    flex: 1;
}

.install-btn {
    width: 100%;
    padding: 10px;
    background: #3b82f6;
    color: white;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.install-btn:hover {
    background: #2563eb;
}

/* VOICE MESSAGE */
.voice-msg {
    display: flex;
    gap: 10px;
    align-items: center;
    min-width: 250px;
}

.voice-icon {
    font-size: 32px;
    flex-shrink: 0;
}

.voice-info {
    flex: 1;
    min-width: 0;
}

.voice-info audio {
    width: 100%;
    height: 32px;
    margin-bottom: 4px;
}

.voice-meta {
    font-size: 11px;
    color: #667781;
    display: flex;
    gap: 6px;
}

/* FILE MESSAGE */
.file-msg {
    min-width: 250px;
}

.image-preview {
    border-radius: 6px;
    overflow: hidden;
}

.image-preview img {
    width: 100%;
    max-width: 300px;
    height: auto;
    display: block;
    cursor: pointer;
}

.image-preview.caption {
    padding: 8px 12px 4px;
    font-size: 14px;
    color: #111b21;
    background: rgba(255,255,255,0.9);
}

.file-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: rgba(0,0,0,0.05);
    border-radius: 6px;
    text-decoration: none;
    color: #111b21;
    transition: background 0.2s;
}

.file-link:hover {
    background: rgba(0,0,0,0.08);
}

.file-icon {
    font-size: 32px;
    flex-shrink: 0;
}

.file-info {
    flex: 1;
    min-width: 0;
}

.file-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.file-size {
    font-size: 12px;
    color: #667781;
    margin-top: 2px;
}

/* MESSAGE META */
.msg-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 4px;
    float: right;
    clear: both;
}

.msg-time {
    font-size: 11px;
    color: #667781;
    margin-left: 4px;
}

.msg-status {
    font-size: 14px;
    color: #8696a0;
    letter-spacing: -3px;
}

.msg-status.read {
    color: #53bdeb;
}

/* EMPTY STATE */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #667781;
    text-align: center;
}

.empty-icon {
    font-size: 64px;
    opacity: 0.3;
    margin-bottom: 16px;
}

.empty-state p {
    margin: 4px 0;
    font-size: 14px;
}

.empty-state.hint {
    font-size: 13px;
    opacity: 0.7;
}

/* MOBILE */
@media (max-width: 767px) {
  .msg-bubble {
        max-width: 80%;
    }

  .template-msg {
        min-width: 240px;
    }

  .voice-msg {
        min-width: 200px;
    }

  .file-msg {
        min-width: 200px;
    }
}
</style>