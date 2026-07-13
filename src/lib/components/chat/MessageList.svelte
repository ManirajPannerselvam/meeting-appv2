<script lang="ts">
    import { afterUpdate } from "svelte";
    
    export let messages: any[] = [];
    export let selectedUser: any = null;
    export let currentUserId: string = "";

    let messagesContainer: HTMLDivElement;
    let previewImage: string | null = null;

    afterUpdate(() => {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });

    function formatTime(timestamp: string) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function isImage(url: string) {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    }

    function getFileName(url: string) {
        try {
            const path = new URL(url).pathname;
            return path.split('/').pop()?.split('-').slice(1).join('-') || 'File';
        } catch {
            return 'File';
        }
    }

    async function downloadFile(url: string, filename: string) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            window.open(url, '_blank');
        }
    }

    function openPreview(url: string) {
        previewImage = url;
    }

    function closePreview() {
        previewImage = null;
    }
</script>

<div class="messages-container" bind:this={messagesContainer}>
    {#each messages as msg (msg.id)}
        <div class="message-wrapper" class:own={msg.is_own}>
            <div class="message-bubble">
                <!-- Text content -->
                {#if msg.content}
                    <div class="message-text">{msg.content}</div>
                {/if}

                <!-- Attachments -->
                {#if msg.attachments && msg.attachments.length > 0}
                    <div class="attachments">
                        {#each msg.attachments as url}
                            {#if isImage(url)}
                                <div class="attachment-wrapper">
                                    <img 
                                        src={url} 
                                        alt="attachment" 
                                        class="attachment-image"
                                        on:click={() => openPreview(url)}
                                    />
                                    <button 
                                        class="download-btn"
                                        on:click={() => downloadFile(url, getFileName(url))}
                                        title="Download"
                                    >
                                        ⬇️
                                    </button>
                                </div>
                            {:else}
                                <div class="attachment-file-wrapper">
                                    <a href={url} target="_blank" class="attachment-file">
                                        📎 {getFileName(url)}
                                    </a>
                                    <button 
                                        class="download-btn-file"
                                        on:click={() => downloadFile(url, getFileName(url))}
                                        title="Download"
                                    >
                                        ⬇️
                                    </button>
                                </div>
                            {/if}
                        {/each}
                    </div>
                {/if}

                <!-- Template message -->
                {#if msg.type === 'template' && msg.template_data}
                    <div class="template-message">
                        <div class="template-name">📋 {msg.content}</div>
                        {#each Object.entries(msg.template_data) as [key, value]}
                            <div class="template-field">
                                <span class="field-label">{key}:</span>
                                <span class="field-value">{value}</span>
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- Timestamp + status -->
                <div class="message-meta">
                    <span class="time">{formatTime(msg.created_at)}</span>
                    {#if msg.is_own}
                        <span class="status">
                            {#if msg.status === 'sent'}✓{/if}
                            {#if msg.status === 'delivered'}✓✓{/if}
                            {#if msg.status === 'read'}<span class="read">✓✓</span>{/if}
                        </span>
                    {/if}
                </div>
            </div>
        </div>
    {/each}
</div>

<!-- Image Preview Modal -->
{#if previewImage}
    <div class="preview-modal" on:click={closePreview}>
        <div class="preview-content" on:click|stopPropagation>
            <button class="close-preview" on:click={closePreview}>×</button>
            <img src={previewImage} alt="Preview" />
            <button 
                class="preview-download"
                on:click={() => downloadFile(previewImage, getFileName(previewImage))}
            >
                Download
            </button>
        </div>
    </div>
{/if}

<style>
.messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #efeae2;
}

.message-wrapper {
    display: flex;
    margin-bottom: 12px;
}

.message-wrapper.own {
    justify-content: flex-end;
}

.message-bubble {
    max-width: 65%;
    padding: 8px 12px;
    border-radius: 8px;
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,.08);
}

.message-wrapper.own .message-bubble {
    background: #d9fdd3;
}

.message-text {
    font-size: 15px;
    line-height: 1.4;
    word-wrap: break-word;
    white-space: pre-wrap;
}

.attachments {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}

.attachment-wrapper {
    position: relative;
    display: inline-block;
}

.attachment-image {
    max-width: 300px;
    max-height: 300px;
    border-radius: 8px;
    cursor: pointer;
    display: block;
}

.attachment-image:hover {
    opacity: 0.9;
}

.download-btn {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: rgba(0,0,0,0.6);
    color: white;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
}

.attachment-wrapper:hover .download-btn {
    opacity: 1;
}

.attachment-file-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.attachment-file {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f0f2f5;
    border-radius: 8px;
    text-decoration: none;
    color: #111b21;
    font-size: 14px;
}

.attachment-file:hover {
    background: #e9edef;
}

.download-btn-file {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: #f0f2f5;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.download-btn-file:hover {
    background: #e9edef;
}

.template-message {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    padding: 12px;
    margin-top: 4px;
}

.template-name {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;
}

.template-field {
    font-size: 13px;
    margin: 4px 0;
}

.field-label {
    font-weight: 500;
    color: #667781;
    text-transform: capitalize;
}

.field-value {
    color: #111b21;
    margin-left: 4px;
}

.message-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-top: 4px;
    font-size: 11px;
    color: #667781;
}

.status {
    font-size: 14px;
}

.status .read {
    color: #53bdeb;
}

/* Preview Modal */
.preview-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    cursor: pointer;
}

.preview-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    cursor: default;
}

.preview-content img {
    max-width: 100%;
    max-height: 85vh;
    display: block;
    border-radius: 8px;
}

.close-preview {
    position: absolute;
    top: -40px;
    right: 0;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    color: white;
    font-size: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-preview:hover {
    background: rgba(255,255,255,0.3);
}

.preview-download {
    position: absolute;
    bottom: -50px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 24px;
    border: none;
    border-radius: 24px;
    background: #00a884;
    color: white;
    font-weight: 600;
    cursor: pointer;
}

.preview-download:hover {
    background: #02916f;
}

@media(max-width:768px) {
    .message-bubble {
        max-width: 80%;
    }
    .attachment-image {
        max-width: 200px;
    }
}
</style>