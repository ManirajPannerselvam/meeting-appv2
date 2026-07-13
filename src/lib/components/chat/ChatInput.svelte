<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let sending = false;
    export let uploadingFiles: File[] = [];

    const dispatch = createEventDispatcher();

    let text = "";
    let fileInput: HTMLInputElement;
    let selectedFiles: File[] = [];

    function send() {
        const msg = text.trim();
        if ((!msg && selectedFiles.length === 0) || sending) return;

        dispatch("sendMessage", { 
            content: msg, 
            files: selectedFiles 
        });

        text = "";
        selectedFiles = [];
        if (fileInput) fileInput.value = '';
    }

    function keyDown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
        dispatch("typing");
    }

    function chooseAttachment() {
        fileInput.click();
    }

    function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        selectedFiles = [...selectedFiles, ...files];
    }

    function removeFile(index: number) {
        selectedFiles = selectedFiles.filter((_, i) => i !== index);
    }

    function chooseEmoji() {
        dispatch("emoji");
    }

    function chooseTemplate() {
        dispatch("openTemplate");
    }

    function startVoice() {
        dispatch("voice");
    }
</script>

<div class="chat-input-wrapper">
    {#if selectedFiles.length > 0 || uploadingFiles.length > 0}
        <div class="file-preview">
            {#each selectedFiles as file, i}
                <div class="file-chip">
                    <span class="file-name">{file.name}</span>
                    <button class="remove-file" on:click={() => removeFile(i)}>×</button>
                </div>
            {/each}
            {#each uploadingFiles as file}
                <div class="file-chip uploading">
                    <span class="file-name">Uploading {file.name}...</span>
                </div>
            {/each}
        </div>
    {/if}

    <div class="chat-input">
        <button
            class="icon-btn"
            title="Template"
            on:click={chooseTemplate}
        >
            📋
        </button>

        <button
            class="icon-btn"
            title="Emoji"
            on:click={chooseEmoji}
        >
            😊
        </button>

        <button
            class="icon-btn"
            title="Attachment"
            on:click={chooseAttachment}
        >
            📎
        </button>

        <input
            bind:this={fileInput}
            type="file"
            multiple
            hidden
            on:change={handleFileSelect}
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />

        <textarea
            bind:value={text}
            rows="1"
            placeholder="Type a message"
            on:keydown={keyDown}
            disabled={sending}
        />

        {#if text.trim() || selectedFiles.length > 0}
            <button
                class="send-btn"
                on:click={send}
                disabled={sending}
            >
                ➤
            </button>
        {:else}
            <button
                class="icon-btn voice"
                title="Voice"
                on:click={startVoice}
            >
                🎤
            </button>
        {/if}
    </div>
</div>

<style>
.chat-input-wrapper{
    background:#f0f2f5;
    border-top:1px solid #d1d7db;
}

.file-preview{
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    padding:8px 15px 0;
}

.file-chip{
    display:flex;
    align-items:center;
    gap:6px;
    background:white;
    border:1px solid #d1d7db;
    border-radius:16px;
    padding:6px 10px;
    font-size:13px;
    max-width:200px;
}

.file-chip.uploading{
    background:#e7f3ff;
    border-color:#2196f3;
}

.file-name{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
}

.remove-file{
    background:none;
    border:none;
    color:#667781;
    font-size:18px;
    cursor:pointer;
    padding:0;
    width:16px;
    height:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:50%;
}

.remove-file:hover{
    background:#f0f2f5;
}

.chat-input{
    display:flex;
    align-items:flex-end;
    gap:10px;
    padding:10px 15px;
}

textarea{
    flex:1;
    min-height:42px;
    max-height:120px;
    resize:none;
    overflow-y:auto;
    border:none;
    outline:none;
    border-radius:22px;
    padding:11px 16px;
    font-size:15px;
    font-family:inherit;
    background:white;
    box-shadow:0 1px 2px rgba(0,0,0,.08);
}

textarea::placeholder{
    color:#8696a0;
}

.icon-btn{
    width:42px;
    height:42px;
    border:none;
    border-radius:50%;
    background:transparent;
    cursor:pointer;
    font-size:22px;
    display:flex;
    align-items:center;
    justify-content:center;
    transition:.2s;
    flex-shrink:0;
}

.icon-btn:hover{
    background:#e9edef;
}

.send-btn{
    width:46px;
    height:46px;
    border:none;
    border-radius:50%;
    background:#00a884;
    color:white;
    font-size:18px;
    cursor:pointer;
    display:flex;
    justify-content:center;
    align-items:center;
    transition:.2s;
    flex-shrink:0;
}

.send-btn:hover{
    background:#02916f;
}

.send-btn:disabled{
    opacity:.6;
    cursor:not-allowed;
}

.voice{
    color:#54656f;
}

@media(max-width:768px){
    .chat-input{
        padding:8px;
    }
    textarea{
        font-size:14px;
    }
    .icon-btn{
        width:38px;
        height:38px;
        font-size:20px;
    }
    .send-btn{
        width:42px;
        height:42px;
    }
}
</style>