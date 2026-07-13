<script lang="ts">
    export let messages: any[] = [];
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    function handleInstall(msg: any) {
        dispatch('install', msg);
    }
</script>

<div class="messages">
    {#each messages as msg}
        <div class="message {msg.sender === 'Mani' ? 'sent' : 'received'}">
            
            {#if msg.type === "template"}
                <div class="template-msg">
                    <div class="template-header">
                        📊 {msg.template_name || 'Template Report'}
                    </div>
                    
                    {#if msg.report}
                        <div class="template-data">
                            {#each Object.entries(msg.report) as [key, value]}
                                <div class="row">
                                    <span class="label">{key}:</span>
                                    <span class="value">{value}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                    
                    <button
                        class="install"
                        on:click={() => handleInstall(msg)}
                    >
                        📥 Install
                    </button>
                </div>
            {:else}
                <div class="text-msg">{msg.message}</div>
            {/if}
            
            <div class="time">{new Date(msg.created_at).toLocaleTimeString()}</div>
        </div>
    {/each}
</div>

<style>
    .messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .message {
        max-width: 70%;
        padding: 12px;
        border-radius: 12px;
    }
    .sent {
        align-self: flex-end;
        background: #dcf8c6;
    }
    .received {
        align-self: flex-start;
        background: white;
    }
    .template-msg {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 12px;
    }
    .template-header {
        font-weight: 600;
        margin-bottom: 8px;
        color: #2563eb;
    }
    .template-data {
        margin: 8px 0;
    }
    .row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 14px;
    }
    .label {
        color: #666;
    }
    .value {
        font-weight: 500;
    }
    .install {
        margin-top: 8px;
        padding: 6px 12px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
    }
    .install:hover {
        background: #1d4ed8;
    }
    .time {
        font-size: 11px;
        color: #999;
        margin-top: 4px;
        text-align: right;
    }
    .text-msg {
        white-space: pre-wrap;
    }
</style>