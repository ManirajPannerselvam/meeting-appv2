<script lang="ts">
  import { onDestroy } from "svelte";
  let {
    messages = [] as any[],
    currentUser = null as any,
    selectedContact = null as any,
    selectedGroup = null as any,
    replyingTo = null as any,
    onReply = (m:any)=>{},
    onForward = (m:any)=>{},
    onLongPress = (m:any,e:any)=>{},
    onPressEnd = ()=>{},
    onOpenDetail = (e:any)=>{}
  } = $props();

  function formatTime(d:string){ if(!d) return ''; try{ return new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }catch{ return ''; } }
  function sanitizeText(s:string){ let t=(s||'').toString().slice(0,4000); t=t.replace(/</g,'&lt;').replace(/>/g,'&gt;'); return t; }

  function calcYield(input:any, output:any){
    const i = Number(input)||0; const o = Number(output)||0;
    if(i<=0) return 0;
    const pct = (o / i) * 100;
    return Number.isFinite(pct)? Math.min(Math.max(pct,0),100) : 0;
  }

  function parseVoice(content:string){
    if(!content ||!content.includes('__VOICE__')) return null;
    try{
      const after=content.split('__VOICE__')[1]||"";
      const [urlPart, durPart]=after.split('__DUR__');
      let url=urlPart?.trim()||"";
      if(!url.startsWith('data:audio')) return null;
      if(url.length>2*1024*1024) return null;
      let dur=Number(durPart)||0;
      return { url, dur: Math.min(dur,600) };
    }catch{ return null; }
  }
  function parseTemplate(content:string){
    if(!content ||!content.includes('__TEMPLATE_DATA__')) return null;
    try{
      const parts=content.split('__TEMPLATE_DATA__');
      const data=JSON.parse(parts[1]?.trim()||'{}');
      if(typeof data!=='object'||data===null) return null;
      const hasInput = data.input!=null || data.Enter_Input!=null || data.input_qty!=null;
      if(hasInput){
        const input = data.input?? data.Enter_Input?? data.input_qty?? 0;
        const output = data.output?? data.Enter_Output?? data.output_qty?? 0;
        const currentYield = Number(data.yield_percent?? data.Yield?? data['Yield%']?? 0);
        if(!currentYield || currentYield===0){
          data.yield_percent = Number(calcYield(input, output).toFixed(2));
          data.input = Number(input); data.output = Number(output);
        }
      }
      return { display: sanitizeText(parts[0]||'').slice(0,500), data };
    }catch{ return null; }
  }
  function parseLocation(content:string){
    if(!content ||!content.includes('__LOCATION_DATA__')) return null;
    try{ const parts=content.split('__LOCATION_DATA__'); const loc=JSON.parse(parts[1]?.trim()||'{}'); const lat=Number(loc.latitude), lng=Number(loc.longitude); if(!isFinite(lat)||!isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180) return null; return { latitude:lat, longitude:lng, displayText: sanitizeText(parts[0]?.replace('📍 Location:','').trim()||'') }; }catch{ return null; }
  }
  function parseMentions(text:string){
    if(!text ||!text.includes('@')) return null;
    const mentionRegex=/@(All|Everyone|[a-zA-Z0-9_.-]+)/g;
    const parts=[]; let lastIndex=0; let match;
    while((match=mentionRegex.exec(text))!==null){ if(match.index>lastIndex) parts.push({type:'text', value:text.slice(lastIndex, match.index)}); parts.push({type:'mention', value:match[0], isAll:match[1].toLowerCase()==='all'||match[1].toLowerCase()==='everyone'}); lastIndex=match.index+match[0].length; if(parts.length>20) break; }
    if(lastIndex<text.length) parts.push({type:'text', value:text.slice(lastIndex)});
    return parts.length>0? parts:null;
  }

  const parsedCache = new Map<string,any>();
  function getParsed(msg:any){
    if(parsedCache.has(msg.id)) return parsedCache.get(msg.id);
    const voice=parseVoice(msg.content||'');
    const tpl=voice? null : parseTemplate(msg.content||'');
    const loc=voice||tpl? null : parseLocation(msg.content||'');
    const mentionParts=!tpl &&!loc &&!voice? parseMentions(msg.content||'') : null;
    const res={voice, tpl, loc, mentionParts};
    parsedCache.set(msg.id,res);
    if(parsedCache.size>300) parsedCache.delete(parsedCache.keys().next().value);
    return res;
  }

  let blobCache = $state<Map<string,string>>(new Map());
  function getBlobUrlLazy(dataUrl:string, msgId:string){
    if(blobCache.has(msgId)) return blobCache.get(msgId)!;
    if(typeof window!== 'undefined'){
      const idle = (window as any).requestIdleCallback || ((cb:any)=>setTimeout(cb,150));
      idle(()=>{
        try{
          if(blobCache.has(msgId)) return;
          const arr = dataUrl.split(','); if(arr.length<2) return;
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch? mimeMatch[1] : 'audio/webm';
          const bstr = atob(arr[1].slice(0,1000000));
          let n=bstr.length; const u8arr=new Uint8Array(n); while(n--) u8arr[n]=bstr.charCodeAt(n);
          const blob=new Blob([u8arr],{type:mime});
          const blobUrl=URL.createObjectURL(blob);
          blobCache.set(msgId,blobUrl);
          if(blobCache.size>10){ const first=blobCache.keys().next().value; const old=blobCache.get(first); if(old?.startsWith('blob:')) URL.revokeObjectURL(old); blobCache.delete(first); }
        }catch{}
      });
    }
    return dataUrl;
  }
  onDestroy(()=>{ for(let u of blobCache.values()){ if(u.startsWith('blob:')) try{URL.revokeObjectURL(u);}catch{} } blobCache.clear(); parsedCache.clear(); });

  function formatDur(sec:number){ if(!sec||sec<=0) return ""; const m=Math.floor(sec/60); const s=sec%60; return `${m}:${String(s).padStart(2,'0')}`; }

  let uniqueMessages = $derived.by(()=>{
    const seen=new Set<string>(); const out:any[]=[];
    for(let m of (messages||[])){ if(!m?.id){ out.push(m); continue; } if(seen.has(m.id)) continue; seen.add(m.id); out.push(m); }
    return out.slice(-150);
  });

  let pressTimer:any=null; let pressStart=$state<{x:number,y:number}|null>(null);
  function onTouchStartWrapper(msg:any,e:any){ const t=e.touches?.[0]; const x=t? t.clientX:e.clientX; const y=t? t.clientY:e.clientY; pressStart={x,y}; if(pressTimer) clearTimeout(pressTimer); pressTimer=setTimeout(()=>{ if(pressStart) onLongPress(msg,e); },500); }
  function onTouchMoveWrapper(e:any){ if(!pressStart) return; const t=e.touches?.[0]; const x=t? t.clientX:e.clientX; const y=t? t.clientY:e.clientY; if(Math.abs(x-pressStart.x)>12||Math.abs(y-pressStart.y)>12){ if(pressTimer) clearTimeout(pressTimer); pressTimer=null; pressStart=null; onPressEnd(); } }
  function onTouchEndWrapper(){ if(pressTimer) clearTimeout(pressTimer); pressTimer=null; pressStart=null; onPressEnd(); }

  function handleViewDetails(tpl:any, msg:any, e:MouseEvent){
    e.stopPropagation();
    const payload = {
      template: {...tpl.data, yield_percent: tpl.data.yield_percent?? calcYield(tpl.data.input, tpl.data.output) },
      message: msg
    };
    onOpenDetail({detail: payload});
  }
</script>

<div class="messages-container">
  {#each uniqueMessages as msg (msg.id)}
    {@const parsed=getParsed(msg)}
    {@const isOwn=msg.is_own?? msg.sender_id===currentUser?.id}
    {@const blobUrl=parsed.voice? getBlobUrlLazy(parsed.voice.url, msg.id) : null}
    <div class="message-wrapper" class:own={isOwn}
      ontouchstart={(e)=>onTouchStartWrapper(msg,e)} ontouchend={onTouchEndWrapper} ontouchmove={onTouchMoveWrapper}
      onmousedown={(e)=>onTouchStartWrapper(msg,e)} onmouseup={onTouchEndWrapper} onmouseleave={onTouchEndWrapper}
      role="button" tabindex="0" onkeydown={(e)=>{ if(e.key==='Enter') onReply(msg); }}>
      <div class="message-bubble" class:own={isOwn} class:sending={msg.status==='sending' || msg.id?.toString().startsWith('temp_')} class:voice-bubble={!!parsed.voice}>
        {#if parsed.voice && blobUrl}
          <div class="voice-player">
            <div class="voice-head">🎙️ Voice {formatDur(parsed.voice.dur)? `• ${formatDur(parsed.voice.dur)}` : ''}</div>
            <audio controls src={blobUrl} preload="none" class="voice-audio"></audio>
            <div class="voice-dur">Duration: {parsed.voice.dur} sec</div>
          </div>
        {:else if parsed.tpl}
          {@const y = parsed.tpl.data.yield_percent?? calcYield(parsed.tpl.data.input, parsed.tpl.data.output)}
          <div class="template-card">
            <div class="tpl-header">📋 {sanitizeText(parsed.tpl.data.template_name || parsed.tpl.data.template_code || 'Daily Yield')}</div>
            <div class="tpl-preview">
              Station: {sanitizeText(parsed.tpl.data.station||'RAT')} | Input: {parsed.tpl.data.input} | Output: {parsed.tpl.data.output} | Yield: {Number(y).toFixed(2)}%
            </div>
            <button class="tpl-view-btn" onclick={(e)=>handleViewDetails(parsed.tpl, msg, e)}>View Details</button>
          </div>
        {:else if parsed.loc}
          <div class="location-card">
            <div class="loc-header">📍 Location</div>
            <a class="loc-link" href={`https://maps.google.com/?q=${parsed.loc.latitude},${parsed.loc.longitude}`} target="_blank" rel="noopener noreferrer">{parsed.loc.displayText || `${parsed.loc.latitude.toFixed(5)}, ${parsed.loc.longitude.toFixed(5)}`}</a>
            <div class="loc-map-preview"><a href={`https://maps.google.com/?q=${parsed.loc.latitude},${parsed.loc.longitude}`} target="_blank" rel="noopener noreferrer"><div class="loc-osm">🗺️ {parsed.loc.latitude.toFixed(4)}, {parsed.loc.longitude.toFixed(4)}<br/>Tap to open</div></a></div>
          </div>
        {:else if parsed.mentionParts}
          <div class="msg-text">{#each parsed.mentionParts as part}{#if part.type==='mention'}<span class="mention" class:mention-all={part.isAll}>{sanitizeText(part.value)}</span>{:else}<span>{sanitizeText(part.value)}</span>{/if}{/each}</div>
        {:else}
          <div class="msg-text">{sanitizeText(msg.content||'').split('__')[0].slice(0,2000)}</div>
        {/if}
        <div class="msg-meta">
          <span class="msg-time">{formatTime(msg.created_at)}</span>
          {#if isOwn}{#if msg.status==='read'}<span class="msg-tick read">✓✓</span>{:else if msg.status==='delivered'}<span class="msg-tick delivered">✓✓</span>{:else if msg.status==='sending' || msg.id?.toString().startsWith('temp_')}<span class="msg-tick sending">◷</span>{:else}<span class="msg-tick sent">✓</span>{/if}{/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="empty-msg"><div>💬</div><p>No messages yet</p><span>Start conversation</span></div>
  {/each}
</div>

<style>
.messages-container{ display:flex; flex-direction:column; gap:6px; padding:16px 12px 24px; width:100%; contain: content; }
.message-wrapper{ display:flex; width:100%; content-visibility:auto; contain-intrinsic-size: 0 90px; }
.message-wrapper.own{ justify-content:flex-end; }
.message-bubble{ max-width:68%; background:#202c33; color:#e9edef; padding:7px 10px 6px; border-radius:8px; border-top-left-radius:0; box-shadow:0 1px 0.5px rgba(0,0,0,0.13); word-break:break-word; }
.message-bubble.own{ background:#005c4b; border-top-right-radius:0; border-top-left-radius:8px; }
.message-bubble.voice-bubble{ min-width:280px; padding:10px 12px!important; }
.message-bubble.voice-bubble.own{ background:#025144; }
.msg-text{ font-size:14.6px; line-height:19px; white-space:pre-wrap; overflow-wrap:anywhere; }
.mention{ background:rgba(83,189,235,0.2); color:#53bdeb; padding:0 4px; border-radius:4px; font-weight:600; }
.mention-all{ background:rgba(0,168,132,0.25); color:#00a884; font-weight:700; border:1px solid rgba(0,168,132,0.4); }
.template-card{ background:#111b21; border:1px solid #2a3942; border-radius:10px; padding:10px; min-width:220px; }
.tpl-header{ color:#00a884; font-weight:700; font-size:13px; margin-bottom:5px; }
.tpl-preview{ font-size:12.5px; color:#8696a0; margin-bottom:8px; }
.tpl-view-btn{ background:#00a884; border:none; color:#111b21; padding:6px 14px; border-radius:20px; font-weight:700; font-size:12px; cursor:pointer; }
.location-card{ background:#111b21; border:1px solid #2a3942; border-radius:10px; padding:10px; min-width:240px; max-width:300px; }
.loc-header{ color:#00a884; font-weight:700; font-size:13px; margin-bottom:6px; }
.loc-link{ color:#53bdeb; font-size:13px; text-decoration:none; word-break:break-all; display:block; margin-bottom:8px; }
.loc-osm{ padding:22px 10px; text-align:center; color:#8696a0; font-size:13px; background:#1a242c; border-radius:8px; }
.voice-player{ display:flex; flex-direction:column; gap:6px; }
.voice-head{ font-size:13px; color:#00a884; font-weight:800; }
.voice-audio{ width:250px; height:44px; display:block; border-radius:22px; background:#111b21; }
.voice-dur{ font-size:11px; color:#8696a0; }
.msg-meta{ display:flex; justify-content:flex-end; align-items:center; gap:4px; font-size:11px; color:#8696a0; margin-top:4px; }
.msg-tick{ font-size:12px; font-weight:600; }.msg-tick.read{ color:#53bdeb; }
.empty-msg{ display:flex; flex-direction:column; align-items:center; justify-content:center; color:#8696a0; gap:6px; margin-top:80px; }
@media (max-width:768px){.message-bubble{ max-width:84%; }.voice-audio{ width:210px; } }
</style>