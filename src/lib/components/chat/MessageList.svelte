<script lang="ts">
  import { onMount } from "svelte";

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
    onOpenDetail = (t:any,m:any)=>{}
  } = $props();

  let listEl: HTMLDivElement | undefined = $state();

  function formatTime(d:string){
    if(!d) return '';
    try{
      return new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }catch{ return ''; }
  }

  function parseTemplate(content:string){
    if(!content ||!content.includes('__TEMPLATE_DATA__')) return null;
    try{
      const parts = content.split('__TEMPLATE_DATA__');
      const jsonStr = parts[1]?.trim();
      if(!jsonStr) return null;
      const data = JSON.parse(jsonStr);
      return { display: parts[0]?.trim() || '', data };
    }catch{
      return null;
    }
  }

  // auto scroll to bottom when new message
  $effect(()=>{
    messages.length;
    setTimeout(()=>{
      if(listEl) listEl.scrollTop = listEl.scrollHeight;
    }, 50);
  });
</script>

<div class="messages-container" bind:this={listEl}>
  {#each messages as msg (msg.id)}
    {@const tpl = parseTemplate(msg.content || '')}
    {@const isOwn = msg.is_own || msg.sender_id === currentUser?.id}
    <div
      class="message-wrapper"
      class:own={isOwn}
      ontouchstart={(e)=>onLongPress(msg,e)}
      ontouchend={onPressEnd}
      onmousedown={(e)=>onLongPress(msg,e)}
      onmouseup={onPressEnd}
      role="button"
      tabindex="0"
    >
      <div class="message-bubble" class:own={isOwn}>
        {#if msg.reply_to}
          <div class="reply-line">↩ Reply</div>
        {/if}

        {#if tpl}
          <div class="template-card">
            <div class="tpl-header">📋 {tpl.data.template_name || tpl.data.template_code || 'Production Report'}</div>
            <div class="tpl-preview">{tpl.display.slice(0,180) || 'Template data'}</div>
            <button class="tpl-view-btn" onclick={()=>onOpenDetail(tpl.data, msg)}>View Details</button>
          </div>
        {:else}
          <div class="msg-text">{msg.content || ''}</div>
        {/if}

        <div class="msg-meta">
          <span class="msg-time">{formatTime(msg.created_at)}</span>
          {#if isOwn}
            <!-- FIXED TICKS: sent=1 grey, delivered=2 grey, read=2 blue -->
            {#if msg.status==='read'}
              <span class="msg-tick read">✓✓</span>
            {:else if msg.status==='delivered'}
              <span class="msg-tick delivered">✓✓</span>
            {:else if msg.status==='sent'}
              <span class="msg-tick sent">✓</span>
            {:else}
              <span class="msg-tick sent">✓</span>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="empty-msg">
      <div>💬</div>
      <p>No messages yet</p>
      <span>Start the conversation</span>
    </div>
  {/each}
</div>

<style>
.messages-container{
  flex:1;
  overflow-y:auto;
  padding:16px 16px 20px;
  background:#0b141a;
  display:flex;
  flex-direction:column;
  gap:6px;
  -webkit-overflow-scrolling:touch;
}
.message-wrapper{
  display:flex;
  width:100%;
}
.message-wrapper.own{
  justify-content:flex-end;
}
.message-bubble{
  max-width:68%;
  background:#202c33;
  color:#e9edef;
  padding:7px 10px 6px;
  border-radius:8px;
  border-top-left-radius:0;
  box-shadow:0 1px 0.5px rgba(0,0,0,0.13);
  word-break:break-word;
  position:relative;
}
.message-bubble.own{
  background:#005c4b;
  border-radius:8px;
  border-top-right-radius:0;
}
.reply-line{
  font-size:12px;
  color:#53bdeb;
  border-left:3px solid #00a884;
  padding:2px 6px;
  margin-bottom:5px;
  background:rgba(0,0,0,0.15);
  border-radius:2px;
}
.msg-text{
  font-size:14.6px;
  line-height:19px;
  white-space:pre-wrap;
  word-wrap:break-word;
}
.template-card{
  background:#111b21;
  border:1px solid #2a3942;
  border-radius:10px;
  padding:10px;
  min-width:200px;
}
.tpl-header{
  color:#00a884;
  font-weight:700;
  font-size:13px;
  margin-bottom:5px;
}
.tpl-preview{
  font-size:12.5px;
  color:#8696a0;
  margin-bottom:8px;
  white-space:pre-wrap;
}
.tpl-view-btn{
  background:#00a884;
  border:none;
  color:#111b21;
  padding:6px 14px;
  border-radius:20px;
  font-weight:700;
  font-size:12px;
  cursor:pointer;
}
.tpl-view-btn:hover{ background:#06cf9c; }
.msg-meta{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:4px;
  font-size:11px;
  color:#8696a0;
  margin-top:4px;
  user-select:none;
}
.msg-tick{ font-size:12px; line-height:1; }
.msg-tick.sent{ color:#8696a0; }
.msg-tick.delivered{ color:#8696a0; }
.msg-tick.read{ color:#53bdeb; } /* blue for read */
.empty-msg{
  flex:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  color:#8696a0;
  gap:6px;
  margin-top:120px;
}
.empty-msg div{ font-size:42px; opacity:0.5; }
.empty-msg p{ font-size:14px; margin:0; }
.empty-msg span{ font-size:12px; color:#667781; }

@media (max-width:768px){
.message-bubble{ max-width:84%; }
.messages-container{ padding:12px 10px 16px; }
}
</style>