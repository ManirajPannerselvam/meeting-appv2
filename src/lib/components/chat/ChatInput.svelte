<script lang="ts">
    import { onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    let {
        sending = false,
        uploadingFiles = [] as File[],
        onSendMessage,
        onOpenTemplate,
        onSendLocation
    }: {
        sending?: boolean,
        uploadingFiles?: File[],
        onSendMessage?: (payload:any)=>void,
        onOpenTemplate?: ()=>void,
        onSendLocation?: (e:any)=>void
    } = $props();

    let text = $state("");
    let fileInput: HTMLInputElement | undefined = $state();
    let imageInput: HTMLInputElement | undefined = $state();
    let videoInput: HTMLInputElement | undefined = $state();
    let docInput: HTMLInputElement | undefined = $state();
    let selectedFiles: File[] = $state([]);
    let showEmojiPicker = $state(false);
    let showAttachMenu = $state(false);
    let sendingLoc = $state(false);

    const emojis = ["😀","😃","😄","😁","😆","😂","😊","😍","🥰","😘","❤️","💯","👍","👏","🙏","👌","💪","🔥","⭐","✨","🎉","✅","❌","📌","📋","📎"];

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let isRecording = $state(false);
    let recordingSeconds = $state(0);
    let recordingTimer: ReturnType<typeof setInterval> | null = null;
    let audioStream: MediaStream | null = null;
    let recordingTimeLabel = $derived(`${String(Math.floor(recordingSeconds/60)).padStart(2,"0")}:${String(recordingSeconds%60).padStart(2,"0")}`);

    function clearTimer(){ if(recordingTimer){ clearInterval(recordingTimer); recordingTimer=null; } }
    function startTimer(){ clearTimer(); recordingSeconds=0; recordingTimer=setInterval(()=>{ recordingSeconds+=1; if(recordingSeconds>=120) stopVoiceRecording(); },1000); }
    function getMime(){ if(typeof MediaRecorder!=="undefined"){ if(MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a")) return "audio/mp4;codecs=mp4a"; if(MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4"; if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus"; } return ""; }
    function blobToBase64(blob:Blob):Promise<string>{ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(blob); }); }

    function chooseEmoji(){ if(sending||isRecording) return; showEmojiPicker=!showEmojiPicker; showAttachMenu=false; }
    function insertEmoji(e:string){ text=`${text}${e}`; }
    function chooseTemplate(){ if(sending||isRecording) return; showEmojiPicker=false; showAttachMenu=false; onOpenTemplate?.(); }
    function send(){ const msg=text.trim(); if((!msg && selectedFiles.length===0)||sending||isRecording) return; onSendMessage?.({ content: msg, files: selectedFiles }); text=""; selectedFiles=[]; if(fileInput) fileInput.value=""; showEmojiPicker=false; showAttachMenu=false; }
    function keyDown(e:KeyboardEvent){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }

    // ✅ ATTACHMENT POPUP LOGIC
    function toggleAttachMenu(){ if(sending||isRecording) return; showAttachMenu=!showAttachMenu; showEmojiPicker=false; }
    function closeMenus(){ showAttachMenu=false; showEmojiPicker=false; }
    function chooseImage(){ imageInput?.click(); showAttachMenu=false; }
    function chooseVideo(){ videoInput?.click(); showAttachMenu=false; }
    function chooseDoc(){ docInput?.click(); showAttachMenu=false; }
    function chooseAttachment(){ fileInput?.click(); showAttachMenu=false; }

    function handleFileSelect(e:Event, type:string){
        const t=e.target as HTMLInputElement;
        const files=Array.from(t.files||[]);
        if(!files.length) return;
        const valid=files.filter(f=>f.size<=10*1024*1024).slice(0,5);
        if(valid.length!==files.length) alert("Max 10MB");
        selectedFiles=[...selectedFiles,...valid].slice(0,5);
        t.value="";
        // next action: auto preview - user can send
    }
    function removeFile(i:number){ selectedFiles=selectedFiles.filter((_,idx)=>idx!==i); }

    async function sendLocation(){
        showAttachMenu=false;
        if(sending||isRecording||sendingLoc) return;
        if(!navigator.geolocation){ alert("Location not supported"); return; }
        sendingLoc=true;
        try{
            const pos:any=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:8000}));
            onSendLocation?.({detail:{latitude:pos.coords.latitude, longitude:pos.coords.longitude, url:`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`}});
        }catch(err:any){ alert("Location failed: "+err.message); } finally{ sendingLoc=false; }
    }

    async function startVoice(){
        if(sending) return;
        if(isRecording){ stopVoiceRecording(); return; }
        if(!navigator.mediaDevices?.getUserMedia){ alert("Mic not supported"); return; }
        try{
            audioStream=await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true, sampleRate:48000} });
            audioChunks=[]; const mime=getMime();
            mediaRecorder=mime? new MediaRecorder(audioStream,{mimeType:mime, audioBitsPerSecond:128000}) : new MediaRecorder(audioStream);
            mediaRecorder.ondataavailable=(e)=>{ if(e.data?.size>0) audioChunks.push(e.data); };
            mediaRecorder.onstop=async()=>{
                const finalMime=mediaRecorder?.mimeType||mime||"audio/mp4";
                const blob=new Blob(audioChunks,{type:finalMime});
                if(audioStream) audioStream.getTracks().forEach(t=>t.stop()); audioStream=null;
                const dur=recordingSeconds; const shouldSend=isRecording;
                clearTimer(); isRecording=false; mediaRecorder=null;
                if(!shouldSend||blob.size<1000){ audioChunks=[]; return; }
                try{ const dataUrl=await blobToBase64(blob); if(dataUrl.length>4*1024*1024){ alert("Voice too long"); return; } const content=`__VOICE__${dataUrl}__DUR__${dur}`; onSendMessage?.({ content, files:[], voiceMessage:true, duration:dur }); }catch{}
                audioChunks=[];
            };
            mediaRecorder.start(250); isRecording=true; startTimer(); closeMenus();
        }catch{ isRecording=false; clearTimer(); alert("Mic denied"); }
    }
    function stopVoiceRecording(){ if(!mediaRecorder||!isRecording) return; if(mediaRecorder.state!=="inactive") mediaRecorder.stop(); }
    function cancelVoiceRecording(){ if(!mediaRecorder) return; isRecording=false; clearTimer(); audioChunks=[]; try{ if(mediaRecorder.state!=="inactive") mediaRecorder.stop(); }catch{} mediaRecorder=null; if(audioStream){ audioStream.getTracks().forEach(t=>t.stop()); audioStream=null; } }
    onDestroy(()=>{ clearTimer(); if(mediaRecorder&&mediaRecorder.state!=="inactive") try{ mediaRecorder.stop(); }catch{} if(audioStream) audioStream.getTracks().forEach(t=>t.stop()); });

    // ✅ BACK SWIPE ONLY IN CHAT - move to contact list
    let touchStartX = 0;
    function handleTouchStart(e:TouchEvent){ touchStartX = e.touches[0].clientX; }
    function handleTouchEnd(e:TouchEvent){
        const diff = e.changedTouches[0].clientX - touchStartX;
        // swipe right from left edge < 50px and move > 80px => back to contacts
        if(touchStartX < 50 && diff > 80){
            goto('/chat'); // contact list
        }
    }
</script>

<div class="chat-input-wrapper" data-single="true" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
    {#if isRecording}
        <div class="recording-bar">
            <div class="recording-left"><span class="recording-dot"></span><span class="recording-text">Recording {recordingTimeLabel}</span></div>
            <div class="rec-actions"><button class="cancel-recording" onclick={cancelVoiceRecording}>Cancel</button><button class="stop-recording" onclick={stopVoiceRecording}>Send ▶</button></div>
        </div>
    {/if}
    {#if selectedFiles.length>0}
        <div class="file-preview">{#each selectedFiles as file,i}<div class="file-chip"><span>{file.type.startsWith("audio/")?"🎤":file.type.startsWith("image/")?"🖼️":file.type.startsWith("video/")?"🎥":"📎"}</span><span class="file-name">{file.name}</span><button class="remove-file" onclick={()=>removeFile(i)}>×</button></div>{/each}</div>
    {/if}

    <!-- ATTACH MENU POPUP -->
    {#if showAttachMenu}
        <div class="attach-overlay" onclick={closeMenus}></div>
        <div class="attach-menu">
            <button class="attach-item" onclick={chooseImage}><span class="attach-icon" style="background:#0075ff;">🖼️</span><span>Gallery</span></button>
            <button class="attach-item" onclick={chooseVideo}><span class="attach-icon" style="background:#7f66ff;">🎥</span><span>Video</span></button>
            <button class="attach-item" onclick={chooseDoc}><span class="attach-icon" style="background:#ff6b00;">📄</span><span>Document</span></button>
            <button class="attach-item" onclick={sendLocation}><span class="attach-icon" style="background:#00a884;">📍</span><span>{#if sendingLoc}Sending...{:else}Location{/if}</span></button>
            <button class="attach-item" onclick={chooseAttachment}><span class="attach-icon" style="background:#54656f;">📎</span><span>All Files</span></button>
        </div>
    {/if}

    {#if showEmojiPicker &&!isRecording}
        <div class="emoji-picker"><div class="emoji-header"><span>Emoji</span><button class="emoji-close" onclick={()=>showEmojiPicker=false}>×</button></div><div class="emoji-grid">{#each emojis as emoji}<button class="emoji-item" onclick={()=>insertEmoji(emoji)}>{emoji}</button>{/each}</div></div>
    {/if}

    <!-- ✅ INPUT BOX INSIDE ALL ICONS -->
    <div class="chat-input chat-input-inside">
        <input bind:this={fileInput} type="file" multiple hidden onchange={(e)=>handleFileSelect(e,'all')} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
        <input bind:this={imageInput} type="file" multiple hidden onchange={(e)=>handleFileSelect(e,'image')} accept="image/*" />
        <input bind:this={videoInput} type="file" multiple hidden onchange={(e)=>handleFileSelect(e,'video')} accept="video/*" />
        <input bind:this={docInput} type="file" multiple hidden onchange={(e)=>handleFileSelect(e,'doc')} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" />

        <button type="button" class="icon-btn inside" disabled={sending||isRecording} onclick={chooseEmoji} title="Emoji">😊</button>

        <textarea bind:value={text} rows="1" placeholder={isRecording?"Recording...":"Type a message"} disabled={sending||isRecording} onkeydown={keyDown}></textarea>

        <button type="button" class="icon-btn inside" disabled={sending||isRecording} onclick={toggleAttachMenu} title="Attach">📎</button>
        <button type="button" class="icon-btn inside" disabled={sending||isRecording} onclick={chooseTemplate} title="Template">📋</button>

        {#if text.trim()||selectedFiles.length>0}
            <button type="button" class="send-btn inside" onclick={send} disabled={sending||isRecording}>➤</button>
        {:else}
            <button type="button" class:recording={isRecording} class="icon-btn inside mic" onclick={startVoice} disabled={sending}>{#if isRecording}■{:else}🎤{/if}</button>
        {/if}
    </div>
</div>

<style>
.chat-input-wrapper{position:relative;background:#111b21;border-top:1px solid #222d34;padding-bottom:env(safe-area-inset-bottom);}
.recording-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#233138;border-bottom:1px solid #2a3942;}
.recording-left{display:flex;gap:8px;align-items:center;}
.recording-dot{width:10px;height:10px;border-radius:50%;background:#ef4444;animation:pulse 1s infinite;}
.recording-text{font-weight:700;color:#ff6b6b;font-size:13px;}
.rec-actions{display:flex;gap:8px;}
.cancel-recording{border:none;background:#3a4a54;color:#e9edef;padding:6px 12px;border-radius:16px;cursor:pointer;}
.stop-recording{border:none;background:#00a884;color:#fff;padding:6px 14px;border-radius:16px;cursor:pointer;font-weight:700;}
@keyframes pulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}

/* ATTACH POPUP */
.attach-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:99;}
.attach-menu{
    position:absolute; left:10px; bottom:calc(100% + 8px);
    background:#233138; border:1px solid #2a3942; border-radius:16px;
    padding:10px; display:grid; grid-template-columns:repeat(3,1fr); gap:10px;
    z-index:100; width:min(320px, calc(100vw - 20px));
    box-shadow:0 8px 24px rgba(0,0,0,0.4);
    animation:slideUp 0.2s ease;
}
@keyframes slideUp{ from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:translateY(0); } }
.attach-item{ display:flex; flex-direction:column; align-items:center; gap:6px; background:transparent; border:none; color:#e9edef; font-size:12px; font-weight:500; cursor:pointer; padding:8px; border-radius:10px; }
.attach-item:hover{ background:#2a3942; }
.attach-icon{ width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; }

.emoji-picker{position:absolute;left:10px;bottom:calc(100% + 8px);width:min(360px,calc(100vw - 20px));max-height:320px;background:#233138;border:1px solid #2a3942;border-radius:16px;overflow:hidden;z-index:1000;}
.emoji-header{display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #2a3942;color:#e9edef;font-weight:700;}
.emoji-close{border:none;background:transparent;color:#8696a0;font-size:20px;cursor:pointer;}
.emoji-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:8px;max-height:260px;overflow-y:auto;}
.emoji-item{width:38px;height:38px;border:none;border-radius:8px;background:transparent;font-size:22px;cursor:pointer;}
.emoji-item:hover{background:#2a3942;}
.file-preview{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;}
.file-chip{display:flex;align-items:center;gap:6px;background:#2a3942;border:1px solid #374045;border-radius:16px;padding:5px 10px;font-size:12px;color:#e9edef;max-width:220px;}
.file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.remove-file{background:none;border:none;color:#8696a0;font-size:16px;cursor:pointer;}

/* ✅ INPUT BOX INSIDE ALL */
.chat-input-inside{
    display:flex; align-items:flex-end; gap:2px;
    background:#2a3942; border-radius:26px;
    margin:8px 10px; padding:4px 6px;
    border:1px solid #2a3942;
}
.chat-input-inside textarea{
    flex:1; min-height:24px; max-height:110px; resize:none;
    border:none; outline:none; background:transparent;
    color:#e9edef; font-size:15px; padding:10px 6px;
    font-family:inherit; line-height:20px;
}
.chat-input-inside textarea::placeholder{ color:#8696a0; }
.icon-btn.inside{
    width:34px; height:34px; border:none; border-radius:50%;
    background:transparent; color:#8696a0; font-size:19px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; flex-shrink:0;
}
.icon-btn.inside:hover{ background:#202c33; color:#e9edef; }
.icon-btn.inside.mic{ background:#00a884; color:#fff; width:36px; height:36px; }
.icon-btn.inside.mic.recording{ background:#ef4444; animation:pulse 1s infinite; }
.send-btn.inside{ width:36px; height:36px; border:none; border-radius:50%; background:#00a884; color:#fff; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
</style>