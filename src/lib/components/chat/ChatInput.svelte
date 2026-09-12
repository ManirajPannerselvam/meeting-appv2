<script lang="ts">
    import { onDestroy } from "svelte";
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
    let selectedFiles: File[] = $state([]);
    let showEmojiPicker = $state(false);
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
    
    // FIXED: CLEAN MIME - MP4 FIRST = NO NOISE
    function getMime(){
        if(typeof MediaRecorder!=="undefined"){
            if(MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a")) return "audio/mp4;codecs=mp4a";
            if(MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
            if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
            if(MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
        }
        return "";
    }

    function blobToBase64(blob:Blob):Promise<string>{
        return new Promise((res,rej)=>{
            const r=new FileReader();
            r.onload=()=>res(r.result as string);
            r.onerror=rej;
            r.readAsDataURL(blob);
        });
    }

    function chooseEmoji(){ if(sending||isRecording) return; showEmojiPicker=!showEmojiPicker; }
    function chooseTemplate(){ console.log("Template btn clicked in ChatInput - V53"); if(sending||isRecording) return; showEmojiPicker=false; onOpenTemplate?.(); }
    function insertEmoji(e:string){ text=`${text}${e}`; }
    function send(){ const msg=text.trim(); if((!msg && selectedFiles.length===0)||sending||isRecording) return; onSendMessage?.({ content: msg, files: selectedFiles }); text=""; selectedFiles=[]; if(fileInput) fileInput.value=""; showEmojiPicker=false; }
    function keyDown(e:KeyboardEvent){ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }
    function chooseAttachment(){ if(sending||isRecording) return; fileInput?.click(); }
    function handleFileSelect(e:Event){
        const t=e.target as HTMLInputElement;
        const files=Array.from(t.files||[]);
        if(!files.length) return;
        const valid=files.filter(f=>f.size<=10*1024*1024).slice(0,5);
        if(valid.length!==files.length) alert("Max 10MB, max 5 files");
        selectedFiles=[...selectedFiles,...valid].slice(0,5);
        t.value="";
    }
    function removeFile(i:number){ selectedFiles=selectedFiles.filter((_,idx)=>idx!==i); }

    async function sendLocation(){
        if(sending||isRecording||sendingLoc) return;
        if(!navigator.geolocation){ alert("Location not supported"); return; }
        sendingLoc=true;
        try{
            const pos:any=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:8000}));
            onSendLocation?.({detail:{latitude:pos.coords.latitude, longitude:pos.coords.longitude, url:`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`}});
        }catch(err:any){ alert("Location failed: "+err.message); } finally{ sendingLoc=false; }
    }

    // FIXED VOICE - NO NOISE - CLEAN PLAY
    async function startVoice(){
        if(sending) return;
        if(isRecording){ stopVoiceRecording(); return; }
        if(!navigator.mediaDevices?.getUserMedia){ alert("Mic not supported"); return; }
        try{
            audioStream=await navigator.mediaDevices.getUserMedia({
                audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true, sampleRate:48000}
            });
            audioChunks=[];
            const mime=getMime();
            mediaRecorder=mime? new MediaRecorder(audioStream,{mimeType:mime, audioBitsPerSecond:128000}) : new MediaRecorder(audioStream);
            mediaRecorder.ondataavailable=(e)=>{ if(e.data?.size>0) audioChunks.push(e.data); };
            mediaRecorder.onstop=async()=>{
                const finalMime=mediaRecorder?.mimeType||mime||"audio/mp4";
                const blob=new Blob(audioChunks,{type:finalMime});
                if(audioStream) audioStream.getTracks().forEach(t=>t.stop());
                audioStream=null;
                const dur=recordingSeconds;
                const shouldSend=isRecording;
                clearTimer(); isRecording=false; mediaRecorder=null;
                if(!shouldSend){ audioChunks=[]; return; }
                if(blob.size<1000){ audioChunks=[]; return; } // ignore <1k
                try{
                    const dataUrl=await blobToBase64(blob);
                    if(dataUrl.length>4*1024*1024){ alert("Voice too long (max 120s)"); audioChunks=[]; return; }
                    const content=`__VOICE__${dataUrl}__DUR__${dur}`;
                    onSendMessage?.({ content, files:[], voiceMessage:true, duration:dur, audioUrl:dataUrl });
                    console.log("Voice shared clean", dur+"s");
                }catch(e){ console.error(e); }
                audioChunks=[];
            };
            mediaRecorder.onerror=()=>{
                if(audioStream) audioStream.getTracks().forEach(t=>t.stop());
                isRecording=false; clearTimer(); mediaRecorder=null; audioChunks=[];
            };
            mediaRecorder.start(250); // FIXED: 250 not 200 = no corruption
            isRecording=true; startTimer(); showEmojiPicker=false;
        }catch(err:any){ console.error(err); isRecording=false; clearTimer(); alert("Mic denied"); }
    }

    function stopVoiceRecording(){ if(!mediaRecorder||!isRecording) return; if(mediaRecorder.state!=="inactive") mediaRecorder.stop(); }
    function cancelVoiceRecording(){
        if(!mediaRecorder) return;
        isRecording=false; clearTimer(); audioChunks=[];
        try{ if(mediaRecorder.state!=="inactive") mediaRecorder.stop(); }catch{}
        mediaRecorder=null;
        if(audioStream){ audioStream.getTracks().forEach(t=>t.stop()); audioStream=null; }
    }
    onDestroy(()=>{ clearTimer(); if(mediaRecorder&&mediaRecorder.state!=="inactive") try{ mediaRecorder.stop(); }catch{} if(audioStream) audioStream.getTracks().forEach(t=>t.stop()); });
</script>

<div class="chat-input-wrapper" data-single="true">
    {#if isRecording}
        <div class="recording-bar">
            <div class="recording-left"><span class="recording-dot"></span><span class="recording-text">Recording {recordingTimeLabel}</span></div>
            <div class="rec-actions"><button class="cancel-recording" onclick={cancelVoiceRecording}>Cancel</button><button class="stop-recording" onclick={stopVoiceRecording}>Send ▶</button></div>
        </div>
    {/if}
    {#if selectedFiles.length>0}
        <div class="file-preview">{#each selectedFiles as file,i}<div class="file-chip"><span>{file.type.startsWith("audio/")?"🎤":file.type.startsWith("image/")?"🖼️":"📎"}</span><span class="file-name">{file.name}</span><button class="remove-file" onclick={()=>removeFile(i)}>×</button></div>{/each}</div>
    {/if}
    {#if showEmojiPicker &&!isRecording}
        <div class="emoji-picker"><div class="emoji-header"><span>Emoji</span><button class="emoji-close" onclick={()=>showEmojiPicker=false}>×</button></div><div class="emoji-grid">{#each emojis as emoji}<button class="emoji-item" onclick={()=>insertEmoji(emoji)}>{emoji}</button>{/each}</div></div>
    {/if}
    <div class="chat-input chat-input-fixed">
        <button type="button" class="icon-btn" disabled={sending||isRecording} onclick={chooseTemplate}>📋</button>
        <button type="button" class:active={showEmojiPicker} class="icon-btn" disabled={sending||isRecording} onclick={chooseEmoji}>😊</button>
        <button type="button" class="icon-btn" disabled={sending||isRecording} onclick={chooseAttachment}>📎</button>
        <button type="button" class="icon-btn loc" disabled={sending||isRecording||sendingLoc} onclick={sendLocation}>{#if sendingLoc}⌛{:else}📍{/if}</button>
        <input bind:this={fileInput} type="file" multiple hidden onchange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" />
        <textarea bind:value={text} rows="1" placeholder={isRecording?"Recording...":"Type a message"} disabled={sending||isRecording} onkeydown={keyDown}></textarea>
        {#if text.trim()||selectedFiles.length>0}<button type="button" class="send-btn" onclick={send} disabled={sending||isRecording}>➤</button>{:else}<button type="button" class:recording={isRecording} class="icon-btn voice" onclick={startVoice} disabled={sending}>{#if isRecording}■{:else}🎤{/if}</button>{/if}
    </div>
</div>

<style>
.chat-input-wrapper{position:relative;background:#202c33;border-top:1px solid #2a3942;}
.recording-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#233138;border-bottom:1px solid #2a3942;}
.recording-left{display:flex;gap:8px;align-items:center;}
.recording-dot{width:10px;height:10px;border-radius:50%;background:#ef4444;animation:pulse 1s infinite;}
.recording-text{font-weight:700;color:#ff6b6b;font-size:13px;}
.rec-actions{display:flex;gap:8px;}
.cancel-recording{border:none;background:#3a4a54;color:#e9edef;padding:6px 12px;border-radius:16px;cursor:pointer;font-weight:600;}
.stop-recording{border:none;background:#00a884;color:#fff;padding:6px 14px;border-radius:16px;cursor:pointer;font-weight:700;}
@keyframes pulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}
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
.chat-input{display:flex;align-items:flex-end;gap:6px;padding:8px 12px;}
textarea{flex:1;min-height:40px;max-height:110px;resize:none;border:none;outline:none;border-radius:8px;padding:10px 12px;font-size:14px;background:#2a3942;color:#e9edef;font-family:inherit;}
textarea::placeholder{color:#8696a0;}
.icon-btn{width:40px;height:40px;border:none;border-radius:50%;background:transparent;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;color:#8696a0;}
.icon-btn:hover:not(:disabled){background:#2a3942;color:#e9edef;}
.icon-btn.active{background:#0a332c;color:#00a884;}
.icon-btn:disabled{opacity:.4;cursor:not-allowed;}
.icon-btn.loc{background:#0a332c;color:#00a884;}
.send-btn{width:42px;height:42px;border:none;border-radius:50%;background:#00a884;color:#fff;font-size:18px;cursor:pointer;display:flex;justify-content:center;align-items:center;flex-shrink:0;}
.voice.recording{background:#3a1a1a;color:#ff6b6b;animation:pulse 1s infinite;}
</style>