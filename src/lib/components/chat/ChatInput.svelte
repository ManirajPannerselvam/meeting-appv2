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
    let lastSend = 0;

    const emojis = ["😀","😃","😄","😁","😂","😊","😍","❤️","👍","👏","🙏","💪","🔥","✅","📌"];

    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let isRecording = $state(false);
    let recordingSeconds = $state(0);
    let recordingTimer: ReturnType<typeof setInterval> | null = null;
    let audioStream: MediaStream | null = null;
    let recordingTimeLabel = $derived(`${String(Math.floor(recordingSeconds/60)).padStart(2,"0")}:${String(recordingSeconds%60).padStart(2,"0")}`);

    function clearTimer(){ if(recordingTimer){ clearInterval(recordingTimer); recordingTimer=null; } }
    function startTimer(){ clearTimer(); recordingSeconds=0; recordingTimer=setInterval(()=>{ recordingSeconds+=1; if(recordingSeconds>=120) stopVoiceRecording(); },1000); }
    function getMime(){ if(typeof MediaRecorder!=="undefined"){ if(MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a")) return "audio/mp4;codecs=mp4a"; if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus"; } return ""; }
    function sanitize(s:string, max=600){ return String(s||'').trim().slice(0,max).replace(/[<>\"'`$\\]/g,'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').trim(); }
    
    function chooseEmoji(){ if(sending||isRecording) return; showEmojiPicker=!showEmojiPicker; showAttachMenu=false; }
    function insertEmoji(e:string){ text=`${text}${e}`.slice(0,600); }
    
    function send(){
      const now = Date.now(); if(now - lastSend < 500) return; lastSend = now;
      const msg = sanitize(text, 600);
      if((!msg && selectedFiles.length===0) || sending || isRecording) return;
      try{ 
        // FIXED: if files, send as object for chatState to upload
        if(selectedFiles.length>0){
          onSendMessage?.({ content: msg || "__FILE__", files: selectedFiles });
        } else {
          onSendMessage?.(msg);
        }
      }catch(e){ console.error(e); }
      text=""; selectedFiles=[]; 
      if(fileInput) fileInput.value=""; if(imageInput) imageInput.value=""; if(videoInput) videoInput.value=""; if(docInput) docInput.value="";
      showEmojiPicker=false; showAttachMenu=false;
    }
    function keyDown(e:KeyboardEvent){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }
    function toggleAttachMenu(){ if(sending||isRecording) return; showAttachMenu=!showAttachMenu; showEmojiPicker=false; }
    function closeMenus(){ showAttachMenu=false; showEmojiPicker=false; }
    function chooseImage(){ imageInput?.click(); showAttachMenu=false; }
    function chooseVideo(){ videoInput?.click(); showAttachMenu=false; }
    function chooseDoc(){ docInput?.click(); showAttachMenu=false; }
    function handleFileSelect(e:Event){
        const t=e.target as HTMLInputElement; const files=Array.from(t.files||[]); if(!files.length) return;
        const valid=files.filter(f=>f.size<=5*1024*1024 && f.name.length<=100).slice(0,3);
        if(valid.length!==files.length) alert("Max 5MB, 3 files"); selectedFiles=[...selectedFiles,...valid].slice(0,3); t.value="";
    }
    function removeFile(i:number){ selectedFiles=selectedFiles.filter((_,idx)=>idx!==i); }
    async function sendLocation(){
        showAttachMenu=false; if(sending||isRecording||sendingLoc) return; if(!navigator.geolocation){ alert("Location not supported"); return; }
        sendingLoc=true;
        try{
            const pos:any=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:8000}));
            const lat=Number(pos.coords.latitude); const lng=Number(pos.coords.longitude);
            if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) throw new Error('Invalid');
            onSendLocation?.({detail:{latitude:lat, longitude:lng, url:`https://maps.google.com/?q=${lat},${lng}`}});
        }catch{ alert("Location failed"); } finally{ sendingLoc=false; }
    }

    // FIXED VOICE - no truncated base64, send as File
    async function startVoice(){
        if(sending) return; if(isRecording){ stopVoiceRecording(); return; }
        if(!navigator.mediaDevices?.getUserMedia){ alert("Mic not supported"); return; }
        try{
            audioStream=await navigator.mediaDevices.getUserMedia({ audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true} });
            audioChunks=[]; const mime=getMime();
            mediaRecorder=mime? new MediaRecorder(audioStream,{mimeType:mime}) : new MediaRecorder(audioStream);
            mediaRecorder.ondataavailable=(e)=>{ if(e.data?.size>0) audioChunks.push(e.data); };
            mediaRecorder.onstop=async()=>{
                const finalMime=mediaRecorder?.mimeType||mime||"audio/webm"; const blob=new Blob(audioChunks,{type:finalMime});
                if(audioStream) audioStream.getTracks().forEach(t=>t.stop()); audioStream=null;
                const dur=recordingSeconds; const shouldSend=isRecording; clearTimer(); isRecording=false; mediaRecorder=null;
                if(!shouldSend||blob.size<800){ audioChunks=[]; return; }
                if(blob.size>2*1024*1024){ alert("Voice max 2MB"); audioChunks=[]; return; }
                try{
                  const ext = finalMime.includes('mp4')?'m4a':'webm';
                  const fileName = `voice_${Date.now()}.${ext}`;
                  const file = new File([blob], fileName, {type: finalMime});
                  // send as FILE - chatState will upload to storage
                  onSendMessage?.({ content: "__VOICE__", files: [file], voiceMessage: true, duration: Math.min(dur,120), _blob: blob });
                }catch(e){ console.error(e); }
                audioChunks=[];
            };
            mediaRecorder.start(250); isRecording=true; startTimer(); closeMenus();
        }catch{ isRecording=false; clearTimer(); alert("Mic denied"); }
    }
    function stopVoiceRecording(){ if(!mediaRecorder||!isRecording) return; if(mediaRecorder.state!=="inactive") try{ mediaRecorder.stop(); }catch{} }
    function cancelVoiceRecording(){ if(!mediaRecorder) return; isRecording=false; clearTimer(); audioChunks=[]; try{ if(mediaRecorder.state!=="inactive") mediaRecorder.stop(); }catch{} mediaRecorder=null; if(audioStream){ audioStream.getTracks().forEach(t=>t.stop()); audioStream=null; } }
    onDestroy(()=>{ clearTimer(); if(mediaRecorder&&mediaRecorder.state!=="inactive") try{ mediaRecorder.stop(); }catch{} if(audioStream) audioStream.getTracks().forEach(t=>t.stop()); });
    let touchStartX = 0;
    function handleTouchStart(e:TouchEvent){ touchStartX = e.touches[0].clientX; }
    function handleTouchEnd(e:TouchEvent){ const diff = e.changedTouches[0].clientX - touchStartX; if(touchStartX < 50 && diff > 80){ goto('/chat'); } }
</script>

<div class="chat-input-wrapper" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
    {#if isRecording}
        <div class="recording-bar">
            <div class="recording-left"><span class="recording-dot"></span><span>Rec {recordingTimeLabel}</span></div>
            <div class="rec-actions"><button type="button" class="cancel-recording" onclick={cancelVoiceRecording}>Cancel</button><button type="button" class="stop-recording" onclick={stopVoiceRecording}>Send</button></div>
        </div>
    {/if}
    {#if selectedFiles.length>0}
        <div class="file-preview">{#each selectedFiles as file,i}<div class="file-chip"><span>{file.type.startsWith("image/")?"🖼️":file.type.startsWith("video/")?"🎥":"📎"}</span><span class="file-name">{sanitize(file.name,16)}</span><button type="button" class="remove-file" onclick={()=>removeFile(i)}>×</button></div>{/each}</div>
    {/if}

    {#if showAttachMenu}
        <div class="attach-overlay" role="button" tabindex="-1" onclick={closeMenus} onkeydown={(e)=>{ if(e.key==='Escape') closeMenus(); }}></div>
        <div class="attach-menu">
            <button type="button" class="attach-item" onclick={chooseImage}><span class="attach-icon blue">IMG</span><span>Gallery</span></button>
            <button type="button" class="attach-item" onclick={chooseVideo}><span class="attach-icon purple">VID</span><span>Video</span></button>
            <button type="button" class="attach-item" onclick={chooseDoc}><span class="attach-icon orange">DOC</span><span>Doc</span></button>
            <button type="button" class="attach-item" onclick={sendLocation}><span class="attach-icon green">LOC</span><span>{#if sendingLoc}...{:else}Location{/if}</span></button>
        </div>
    {/if}

    {#if showEmojiPicker &&!isRecording}
        <div class="emoji-picker"><div class="emoji-header"><span>Emoji</span><button type="button" class="emoji-close" onclick={()=>showEmojiPicker=false}>×</button></div><div class="emoji-grid">{#each emojis as emoji}<button type="button" class="emoji-item" onclick={()=>insertEmoji(emoji)}>{emoji}</button>{/each}</div></div>
    {/if}

    <div class="chat-input">
        <input bind:this={fileInput} type="file" multiple hidden onchange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
        <input bind:this={imageInput} type="file" multiple hidden onchange={handleFileSelect} accept="image/*" />
        <input bind:this={videoInput} type="file" multiple hidden onchange={handleFileSelect} accept="video/*" />
        <input bind:this={docInput} type="file" multiple hidden onchange={handleFileSelect} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" />

        <button type="button" class="icon-btn" disabled={sending||isRecording} onclick={chooseEmoji} title="Emoji">☺</button>
        <textarea bind:value={text} rows="1" placeholder={isRecording?"Recording...":"Message"} maxlength="600" disabled={sending||isRecording} onkeydown={keyDown}></textarea>
        <button type="button" class="icon-btn" disabled={sending||isRecording} onclick={toggleAttachMenu} title="Attach">＋</button>

        {#if text.trim()||selectedFiles.length>0}
            <button type="button" class="send-btn" onclick={send} disabled={sending||isRecording}>➤</button>
        {:else}
            <button type="button" class:recording={isRecording} class="icon-btn mic" onclick={startVoice} disabled={sending}>{#if isRecording}■{:else}●{/if}</button>
        {/if}
    </div>
</div>

<style>
.chat-input-wrapper{position:relative;background:#f0f2f5;border-top:1px solid #e9edef;padding-bottom:env(safe-area-inset-bottom);}
.recording-bar{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#fff;border-bottom:1px solid #e9edef;}
.recording-left{display:flex;gap:6px;align-items:center;font-size:11px;font-weight:700;color:#ef4444;}
.recording-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulse 1s infinite;}
.rec-actions{display:flex;gap:6px;}
.cancel-recording{border:1px solid #e9edef;background:#fff;color:#111b21;padding:4px 10px;border-radius:14px;cursor:pointer;font-size:11px;}
.stop-recording{border:none;background:#00a884;color:#fff;padding:4px 12px;border-radius:14px;cursor:pointer;font-weight:700;font-size:11px;}
@keyframes pulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}
.attach-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.25);z-index:99;}
.attach-menu{position:absolute; left:8px; bottom:calc(100% + 6px); background:#fff; border:1px solid #e9edef; border-radius:12px; padding:6px; display:grid; grid-template-columns:repeat(4,1fr); gap:4px; z-index:100; width:220px; box-shadow:0 8px 20px rgba(0,0,0,0.12);}
.attach-item{ display:flex; flex-direction:column; align-items:center; gap:3px; background:transparent; border:none; color:#111b21; font-size:10px; font-weight:600; cursor:pointer; padding:6px 4px; border-radius:8px; }
.attach-item:hover{ background:#f5f6f6; }
.attach-icon{ width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff;}
.attach-icon.blue{background:#0075ff;}.attach-icon.purple{background:#7f66ff;}.attach-icon.orange{background:#ff6b00;}.attach-icon.green{background:#00a884;}
.emoji-picker{position:absolute;left:8px;bottom:calc(100% + 6px);width:200px;max-height:200px;background:#fff;border:1px solid #e9edef;border-radius:12px;overflow:hidden;z-index:100;box-shadow:0 8px 20px rgba(0,0,0,0.12);}
.emoji-header{display:flex;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#111b21;font-weight:700;font-size:11px;}
.emoji-close{border:none;background:transparent;color:#8696a0;font-size:16px;cursor:pointer;}
.emoji-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:2px;padding:6px;max-height:160px;overflow-y:auto;}
.emoji-item{width:30px;height:30px;border:none;border-radius:6px;background:transparent;font-size:16px;cursor:pointer;}
.file-preview{display:flex;flex-wrap:wrap;gap:4px;padding:6px 8px 0;}
.file-chip{display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #e9edef;border-radius:14px;padding:3px 8px;font-size:10px;color:#111b21;max-width:160px;}
.file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.remove-file{background:none;border:none;color:#8696a0;font-size:12px;cursor:pointer;}
.chat-input{display:flex; align-items:center; gap:4px; background:#fff; border-radius:24px; margin:6px 8px; padding:3px 4px; border:1px solid #e9edef; box-shadow:0 1px 2px rgba(0,0,0,0.04);}
.chat-input textarea{flex:1; min-height:20px; max-height:80px; resize:none; border:none; outline:none; background:transparent; color:#111b21; font-size:13px; padding:7px 6px; font-family:inherit; line-height:18px;}
.chat-input textarea::placeholder{ color:#8696a0; font-size:13px; }
.icon-btn{width:32px; height:32px; border:none; border-radius:50%; background:transparent; color:#54656f; font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;}
.icon-btn:hover{ background:#f5f6f6; }
.icon-btn.mic{ background:#00a884; color:#fff; width:32px; height:32px; }
.icon-btn.mic.recording{ background:#ef4444; animation:pulse 1s infinite; }
.send-btn{ width:32px; height:32px; border:none; border-radius:50%; background:#00a884; color:#fff; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
</style>