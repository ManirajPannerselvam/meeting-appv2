<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
    export let templateName = "";
    export let version = "v1.0";
    export let draft = true;
</script>

<div class="header">
    <div class="left">
        <div class="icon">📄</div>
        <div>
            <div class="title">{templateName || "New Template"}</div>
            <div class="subtitle">Professional Template Designer</div>
        </div>
    </div>

    <div class="center">
        <span class="version">{version}</span>
        {#if draft}<span class="draft">Draft</span>{/if}
    </div>

    <div class="actions">
        <button class="btn secondary" on:click={() => dispatch("preview")}>👁 Preview</button>
        <button class="btn secondary" on:click={() => dispatch("draft")}>💾 Save Draft</button>
        <button class="btn primary" on:click={() => dispatch("save")}>✔ Save Template</button>
        <button class="close" on:click={() => dispatch("close")}>✕</button>
    </div>
</div>

<style>
   .header {
        height: 56px;
        padding: 0 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e5e7eb;
        background: white;
    }

   .left {
        display: flex;
        align-items: center;
        gap: 12px;
    }

   .icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #2563eb;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 20px;
    }

   .title {
        font-size: 16px;
        font-weight: 700;
        margin: 0;
    }

   .subtitle {
        color: #6b7280;
        font-size: 11px;
    }

   .center {
        display: flex;
        gap: 8px;
    }

   .version,.draft {
        padding: 4px 10px;
        border-radius: 16px;
        font-size: 11px;
        font-weight: 600;
    }

   .version {
        background: #dbeafe;
        color: #1d4ed8;
    }

   .draft {
        background: #fef3c7;
        color: #92400e;
    }

   .actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }

   .actions button {
        height: 36px;
        padding: 0 14px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        transition: all 0.2s;
    }

   .btn.secondary {
        background: #f3f4f6;
        color: #374151;
    }

   .btn.secondary:hover {
        background: #e5e7eb;
    }

   .btn.primary {
        background: #2563eb;
        color: white;
    }

   .btn.primary:hover {
        background: #1d4ed8;
    }

   .close {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 50%;
        background: #ef4444;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
    }
</style>