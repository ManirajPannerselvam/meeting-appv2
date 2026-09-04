<script lang="ts">
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

  function formatTime(d:string){
    if(!d) return '';
    try{ return new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }catch{ return ''; }
  }
  function parseTemplate(content:string){
    if(!content || !content.includes('__TEMPLATE_DATA__')) return null;
    try{
      const parts = content.split('__TEMPLATE_DATA__');
      const data = JSON.parse(parts[1]?.trim() || '{}');
      return { display: parts[0]?.trim() || '', data };
    }catch{ return null; }
  }
  function parseLocation(content:string){
    if(!content || !content.includes('__LOCATION_DATA__')) return null;
    try{
      const parts = content.split('__LOCATION_DATA__');
      const loc = JSON.parse(parts[1]?.trim() || '{}');
      const cleanText = parts[0]?.replace('📍 Location:', '').trim() || '';
      if(loc.latitude && loc.longitude) return { ...loc, displayText: cleanText };
      return null;
    }catch{ return null; }
  }
  function handleImgError(e: Event){
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
  }

  let uniqueMessages = $derived.by(()=>{
    const seen = new Set();
    return (messages || []).filter((m:any)=>{
      if(!m?.id) return true;
      if(seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  });
</script>

<div class="messages-container">
  {#each uniqueMessages as msg, idx (msg.id + '_' + idx)}
    {@const tpl = parseTemplate(msg.content || '')}
    {@const loc = parseLocation(msg.content || '')}
    {@const isOwn = msg.is_own ?? msg.sender_id === currentUser?.id}
    <div class="message-wrapper" class:own={isOwn}
      ontouchstart={(e)=>onLongPress(msg,e)} ontouchend={onPressEnd} ontouchmove={onPressEnd}
      onmousedown={(e)=>onLongPress(msg,e)} onmouseup={onPressEnd}
      role="button" tabindex="0">
      <div class="message-bubble" class:own={isOwn} class:sending={msg.status==='sending'}>
        {#if tpl}
          <div class="template-card">
            <div class="tpl-header">📋 {tpl.data.template_name || tpl.data.template_code || 'Report'}</div>
            <div class="tpl-preview">{tpl.display.slice(0,200)}</div>
            <button class="tpl-view-btn" onclick={(e)=>{e.stopPropagation(); onOpenDetail({detail:{template:tpl.data, message:msg}})}}>View Details</button>
          </div>
        {:else if loc}
          <div class="location-card">
            <div class="loc-header">📍 Location</div>
            <a class="loc-link" href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noopener">
              {loc.displayText || `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`}
            </a>
            <div class="loc-map-preview">
              <a href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`} target="_blank">
                <img src={`https://maps.googleapis.com/maps/api/staticmap?center=${loc.latitude},${loc.longitude}&zoom=15&size=300x150&markers=color:red%7C${loc.latitude},${loc.longitude}`} alt="map" onerror={handleImgError} />
                <div class="loc-fallback">🗺️ Tap to open in Maps</div>
              </a>
            </div>
          </div>
        {:else}
          <div class="msg-text">{msg.content || ''}</div>
        {/if}
        <div class="msg-meta">
          <span class="msg-time">{formatTime(msg.created_at)}</span>
          {#if isOwn}
            {#if msg.status==='read'}<span class="msg-tick read">✓✓</span>
            {:else if msg.status==='delivered'}<span class="msg-tick delivered">✓✓</span>
            {:else if msg.status==='sending'}<span class="msg-tick sending">◷</span>
            {:else}<span class="msg-tick sent">✓</span>{/if}
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="empty-msg"><div>💬</div><p>No messages yet</p><span>Start conversation</span></div>
  {/each}
</div>

<style>
.messages-container{ display:flex; flex-direction:column; gap:6px; padding:16px 12px 24px; width:100%; min-height:100%; background:transparent; }
.message-wrapper{ display:flex; width:100%; }
.message-wrapper.own{ justify-content:flex-end; }
.message-bubble{ max-width:68%; background:#202c33; color:#e9edef; padding:7px 10px 6px; border-radius:8px; border-top-left-radius:0; box-shadow:0 1px 0.5px rgba(0,0,0,0.13); word-break:break-word; }
.message-bubble.own{ background:#005c4b; border-top-right-radius:0; border-top-left-radius:8px; }
.message-bubble.sending{ opacity:0.6; }
.msg-text{ font-size:14.6px; line-height:19px; white-space:pre-wrap; word-wrap:break-word; }
.template-card{ background:#111b21; border:1px solid #2a3942; border-radius:10px; padding:10px; min-width:220px; }
.tpl-header{ color:#00a884; font-weight:700; font-size:13px; margin-bottom:5px; }
.tpl-preview{ font-size:12.5px; color:#8696a0; margin-bottom:8px; white-space:pre-wrap; }
.tpl-view-btn{ background:#00a884; border:none; color:#111b21; padding:6px 14px; border-radius:20px; font-weight:700; font-size:12px; cursor:pointer; }
.location-card{ background:#111b21; border:1px solid #2a3942; border-radius:10px; padding:10px; min-width:240px; max-width:300px; }
.loc-header{ color:#00a884; font-weight:700; font-size:13px; margin-bottom:6px; }
.loc-link{ color:#53bdeb; font-size:13px; text-decoration:none; word-break:break-all; display:block; margin-bottom:8px; }
.loc-map-preview a{ text-decoration:none; display:block; border-radius:8px; overflow:hidden; background:#1a242c; }
.loc-map-preview img{ width:100%; height:120px; object-fit:cover; border-radius:8px; display:block; }
.loc-fallback{ padding:30px 10px; text-align:center; color:#8696a0; font-size:13px; background:#1a242c; border-radius:8px; }
.msg-meta{ display:flex; justify-content:flex-end; align-items:center; gap:4px; font-size:11px; color:#8696a0; margin-top:4px; }
.msg-tick{ font-size:12px; }.msg-tick.sent,.msg-tick.delivered{ color:#8696a0; }.msg-tick.read{ color:#53bdeb; }.msg-tick.sending{ color:#8696a0; }
.empty-msg{ display:flex; flex-direction:column; align-items:center; justify-content:center; color:#8696a0; gap:6px; margin-top:80px; }
.empty-msg div{ font-size:42px; opacity:0.5; }.empty-msg p{ margin:0; }
@media (max-width:768px){.message-bubble{ max-width:84%; } .location-card{ min-width:200px; max-width:260px; } }
</style>