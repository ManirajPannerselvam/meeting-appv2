<script lang="ts">
    import { onDestroy } from "svelte";

    let {
        sending = false,
        uploadingFiles = [] as File[],
        onSendMessage,
        onOpenTemplate
    }: {
        sending?: boolean,
        uploadingFiles?: File[],
        onSendMessage?: (detail:{content:string, files:File[], voiceMessage?:boolean, duration?:number})=>void,
        onOpenTemplate?: ()=>void
    } = $props();

    let text = $state("");
    let fileInput: HTMLInputElement | undefined = $state();
    let selectedFiles: File[] = $state([]);
    let showEmojiPicker = $state(false);

    const emojis = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🤢","🤮","🤧","😷","🤒","🤕","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💕","💖","💗","💓","💞","💯","👍","👎","👏","🙌","🙏","🤝","👌","✌️","🤞","💪","🔥","⭐","✨","🎉","🎊","✅","❌","⚡","🚀","💡","📌","📋","📎","🎯","🏆"];

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let isRecording = $state(false);
    let recordingSeconds = $state(0);
    let recordingTimer: ReturnType<typeof setInterval> | null = null;
    let recordingMinutes = $derived(Math.floor(recordingSeconds / 60).toString().padStart(2, "0"));
    let recordingSecondsDisplay = $derived((recordingSeconds % 60).toString().padStart(2, "0"));
    let recordingTimeLabel = $derived(`${recordingMinutes}:${recordingSecondsDisplay}`);

    function clearRecordingTimer() { if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; } }
    function startRecordingTimer() { clearRecordingTimer(); recordingSeconds = 0; recordingTimer = setInterval(() => { recordingSeconds += 1; }, 1000); }
    function getSupportedMimeType(): string {
        if (typeof MediaRecorder!== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
        if (typeof MediaRecorder!== "undefined" && MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
        if (typeof MediaRecorder!== "undefined" && MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
        return "";
    }

    function chooseEmoji() { showEmojiPicker =!showEmojiPicker; }
    function chooseTemplate() {
        if (sending || isRecording) return;
        showEmojiPicker = false;
        onOpenTemplate?.();
    }
    function insertEmoji(emoji: string) { text = `${text}${emoji}`; }
    function send() {
        const msg = text.trim();
        if ((!msg && selectedFiles.length === 0) || sending || isRecording) return;
        onSendMessage?.({ content: msg, files: selectedFiles });
        text = "";
        selectedFiles = [];
        if (fileInput) fileInput.value = "";
        showEmojiPicker = false;
    }
    function keyDown(e: KeyboardEvent) {
        if (e.key === "Enter" &&!e.shiftKey) {
            e.preventDefault();
            send();
        }
    }
    function chooseAttachment() { if (sending || isRecording) return; fileInput?.click(); }
    function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        if (files.length === 0) return;
        selectedFiles = [...selectedFiles,...files];
        target.value = "";
    }
    function removeFile(index: number) { selectedFiles = selectedFiles.filter((_, i) => i!== index); }

    async function startVoice() {
        if (sending) return;
        if (isRecording) { stopVoiceRecording(); return; }
        if (typeof window === "undefined" ||!navigator.mediaDevices?.getUserMedia) { alert("Microphone not supported"); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            const mimeType = getSupportedMimeType();
            mediaRecorder = mimeType? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event: BlobEvent) => { if (event.data?.size > 0) audioChunks.push(event.data); };
            mediaRecorder.onstop = async () => {
                const finalMimeType = mediaRecorder?.mimeType || mimeType || "audio/webm";
                const audioBlob = new Blob(audioChunks, { type: finalMimeType });
                stream.getTracks().forEach((track) => track.stop());
                if (audioBlob.size > 0) {
                    const extension = finalMimeType.includes("mp4")? "m4a" : "webm";
                    const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${extension}`, { type: finalMimeType });
                    onSendMessage?.({ content: "", files: [audioFile], voiceMessage: true, duration: recordingSeconds });
                }
                audioChunks = []; mediaRecorder = null;
            };
            mediaRecorder.onerror = () => {
                stream.getTracks().forEach((track) => track.stop());
                isRecording = false; clearRecordingTimer(); mediaRecorder = null; alert("Unable to record");
            };
            mediaRecorder.start(250); isRecording = true; startRecordingTimer(); showEmojiPicker = false;
        } catch (error) {
            console.error("Microphone error:", error); isRecording = false; clearRecordingTimer(); mediaRecorder = null;
            alert("Microphone permission denied");
        }
    }
    function stopVoiceRecording() {
        if (!mediaRecorder ||!isRecording) return;
        isRecording = false; clearRecordingTimer();
        if (mediaRecorder.state!== "inactive") mediaRecorder.stop();
    }
    function cancelVoiceRecording() {
        if (!mediaRecorder) return; const recorder = mediaRecorder; isRecording = false; clearRecordingTimer(); audioChunks = [];
        if (recorder.state!== "inactive") recorder.stop(); mediaRecorder = null;
    }
    onDestroy(() => {
        clearRecordingTimer();
        if (mediaRecorder && mediaRecorder.state!== "inactive") mediaRecorder.stop();
        mediaRecorder = null;
    });
</script>

<div class="chat-input-wrapper" data-single="true">
    {#if isRecording}
        <div class="recording-bar">
            <div class="recording-left"><span class="recording-dot"></span><span class="recording-text">Recording</span><span class="recording-time">{recordingTimeLabel}</span></div>
            <button type="button" class="cancel-recording" onclick={cancelVoiceRecording}>Cancel</button>
        </div>
    {/if}
    {#if selectedFiles.length > 0 || uploadingFiles.length > 0}
        <div class="file-preview">
            {#each selectedFiles as file, i}
                <div class="file-chip"><span class="file-icon">{file.type.startsWith("audio/")? "🎤" : file.type.startsWith("image/")? "🖼️" : "📎"}</span><span class="file-name">{file.name}</span><button type="button" class="remove-file" onclick={() => removeFile(i)}>×</button></div>
            {/each}
            {#each uploadingFiles as file}<div class="file-chip uploading"><span>⏳</span><span class="file-name">Uploading {file.name}...</span></div>{/each}
        </div>
    {/if}
    {#if showEmojiPicker &&!isRecording}
        <div class="emoji-picker">
            <div class="emoji-header"><span>Emoji</span><button class="emoji-close" onclick={() => showEmojiPicker = false}>×</button></div>
            <div class="emoji-grid">{#each emojis as emoji}<button class="emoji-item" onclick={() => insertEmoji(emoji)}>{emoji}</button>{/each}</div>
        </div>
    {/if}
    <div class="chat-input">
        <button type="button" class="icon-btn" title="Template" disabled={sending || isRecording} onclick={chooseTemplate}>📋</button>
        <button type="button" class:active={showEmojiPicker} class="icon-btn" title="Emoji" disabled={sending || isRecording} onclick={chooseEmoji}>😊</button>
        <button type="button" class="icon-btn" title="Attachment" disabled={sending || isRecording} onclick={chooseAttachment}>📎</button>
        <input bind:this={fileInput} type="file" multiple hidden onchange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" />
        <textarea bind:value={text} rows="1" placeholder={isRecording? "Recording..." : "Type a message"} disabled={sending || isRecording} onkeydown={keyDown}></textarea>
        {#if text.trim() || selectedFiles.length > 0}
            <button type="button" class="send-btn" onclick={send} disabled={sending || isRecording}>➤</button>
        {:else}
            <button type="button" class:recording={isRecording} class="icon-btn voice" onclick={startVoice} disabled={sending}>{#if isRecording}■{:else}🎤{/if}</button>
        {/if}
    </div>
</div>

<style>
.chat-input-wrapper { position:relative; background:#202c33; border-top:1px solid #2a3942; }
/* hide second copy if rendered twice */
.chat-input-wrapper[data-single="true"] ~.chat-input-wrapper[data-single="true"]{ display:none!important; }
.recording-bar{ display:flex; justify-content:space-between; padding:9px 15px; background:#233138; border-bottom:1px solid #2a3942; color:#e9edef; }
.recording-left{ display:flex; gap:9px; align-items:center; }
.recording-dot{ width:10px; height:10px; border-radius:50%; background:#ef4444; animation:recordingPulse 1s infinite; }
.recording-text{ font-weight:600; color:#ff6b6b; font-size:14px; }
.recording-time{ color:#8696a0; font-variant-numeric:tabular-nums; }
.cancel-recording{ border:none; background:transparent; color:#8696a0; font-weight:600; cursor:pointer; }
@keyframes recordingPulse{ 0%{opacity:1} 50%{opacity:.35} 100%{opacity:1} }
.emoji-picker{ position:absolute; left:10px; bottom:calc(100% + 8px); width:min(380px, calc(100vw - 20px)); max-height:360px; background:#233138; border:1px solid #2a3942; border-radius:16px; box-shadow:0 12px 35px rgba(0,0,0,.5); overflow:hidden; z-index:1000; }
.emoji-header{ display:flex; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #2a3942; color:#e9edef; font-weight:700; }
.emoji-close{ border:none; background:transparent; color:#8696a0; font-size:22px; cursor:pointer; }
.emoji-grid{ display:grid; grid-template-columns:repeat(8,1fr); gap:2px; padding:10px; max-height:305px; overflow-y:auto; }
.emoji-item{ width:40px; height:40px; border:none; border-radius:9px; background:transparent; font-size:24px; cursor:pointer; }
.emoji-item:hover{ background:#2a3942; transform:scale(1.08); }
.file-preview{ display:flex; flex-wrap:wrap; gap:8px; padding:8px 15px 0; }
.file-chip{ display:flex; align-items:center; gap:6px; background:#2a3942; border:1px solid #374045; border-radius:16px; padding:6px 10px; font-size:13px; color:#e9edef; max-width:240px; }
.file-chip.uploading{ background:#0a332c; border-color:#00a884; }
.file-name{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.remove-file{ background:none; border:none; color:#8696a0; font-size:18px; cursor:pointer; width:20px; height:20px; border-radius:50%; }
.chat-input{ display:flex; align-items:flex-end; gap:7px; padding:10px 15px; }
textarea{ flex:1; min-height:42px; max-height:120px; resize:none; border:none; outline:none; border-radius:8px; padding:11px 16px; font-size:14.5px; font-family:inherit; background:#2a3942; color:#e9edef; box-shadow:none; }
textarea::placeholder{ color:#8696a0; }
textarea:focus{ box-shadow:0 0 0 1px #00a884; }
.icon-btn{ width:42px; height:42px; border:none; border-radius:50%; background:transparent; cursor:pointer; font-size:22px; display:flex; align-items:center; justify-content:center; color:#8696a0; transition:.15s; }
.icon-btn:hover:not(:disabled){ background:#2a3942; color:#e9edef; }
.icon-btn.active{ background:#0a332c; color:#00a884; }
.icon-btn:disabled{ opacity:.45; cursor:not-allowed; }
.send-btn{ width:46px; height:46px; border:none; border-radius:50%; background:#00a884; color:white; font-size:18px; cursor:pointer; display:flex; justify-content:center; align-items:center; flex-shrink:0; }
.send-btn:hover:not(:disabled){ background:#06cf9c; }
.voice{ color:#8696a0; }.voice.recording{ background:#3a1a1a; color:#ff6b6b; }
</style>