<script lang="ts">
  export let messages: any[] = [];
  export let selectedContact: any = null;
  export let selectedGroup: any = null;
  export let currentUser: any = null;
  export let selectedUser: any = null;

  import { afterUpdate, createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  let listEl: HTMLDivElement;

  $: me = currentUser || selectedUser;
  $: myId = me?.id || me?.userId || "";
  let selectedMessages = new Set<string>();
  let longPressTimer: any = null;

  function isMine(m: any){ return m.sender_id === myId; }
  function getTime(t: string){ if(!t) return ""; return new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  function isSameSenderAsPrev(i: number){
    if(i===0) return false;
    const curr = messages[i]; const prev = messages[i-1];
    if(curr.sender_id!== prev.sender_id) return false;
    const diff = new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
    return diff < 120000;
  }
  function isSameSenderAsNext(i: number){
    if(i===messages.length-1) return false;
    const curr = messages[i]; const next = messages[i+1];
    if(curr.sender_id!== next.sender_id) return false;
    const diff = new Date(next.created_at).getTime() - new Date(curr.created_at).getTime();
    return diff < 120000;
  }
  function startPress(id: string){ clearTimeout(longPressTimer); longPressTimer = setTimeout(()=> toggleSelect(id), 500); }
  function endPress(){ clearTimeout(longPressTimer); }
  function toggleSelect(id: string){
    if(selectedMessages.has(id)) selectedMessages.delete(id); else selectedMessages.add(id);
    selectedMessages = new Set(selectedMessages);
    dispatch("selectMessage", { id, selected: Array.from(selectedMessages) });
    if(navigator.vibrate) navigator.vibrate(50);
  }
  function onClickMessage(id: string){ if(selectedMessages.size>0){ toggleSelect(id); return; } }
  function parseTags(text: string){ if(!text) return ""; return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>'); }
  function onTagClick(e: any){ const target = e.target as HTMLElement; if(target.classList.contains('mention')){ dispatch("tagClick", { tag: target.innerText }); } }

  function isTemplateContent(text:string){ return text?.includes('__TEMPLATE_DATA__'); }
  function parseTemplate(content:string){
    try{
      if(!content?.includes('__TEMPLATE_DATA__')) return null;
      const jsonStr = content.split('__TEMPLATE_DATA__')[1]?.trim();
      return JSON.parse(jsonStr);
    }catch{ return null; }
  }
  function getDisplayText(content:string){ if(!content) return ""; return content.split('__TEMPLATE_DATA__')[0]?.trim() || content; }
  function getValFromText(display:string, key:string){
    if(!display) return '-';
    const k1 = key.replace(/_/g, '[ _]'); // match RAT_Input or RAT Input
    const re = new RegExp(`${k1}\\s*:\\s*([^\\n•]+)`, 'i');
    const m = display.match(re);
    return m? m[1].trim() : '-';
  }
  afterUpdate(()=>{ if(listEl) listEl.scrollTop = listEl.scrollHeight; });
</script>

<div class="message-list" bind:this={listEl}>
  {#if messages.length === 0}
    <div class="empty"><p>No messages yet</p><span>Say hello</span></div>
  {:else}
    {#each messages as m, i (m.id)}
      {@const mine = isMine(m)}
      {@const groupedPrev = isSameSenderAsPrev(i)}
      {@const groupedNext = isSameSenderAsNext(i)}
      {@const selected = selectedMessages.has(m.id)}
      {@const isTpl = isTemplateContent(m.content)}
      {@const tmpl = parseTemplate(m.content)}
      {@const display = getDisplayText(m.content)}

      <div class="msg-row" class:mine={mine} class:grouped-prev={groupedPrev} class:grouped-next={groupedNext} class:selected={selected}
        on:mousedown={()=>startPress(m.id)} on:mouseup={endPress} on:mouseleave={endPress}
        on:touchstart={()=>startPress(m.id)} on:touchend={endPress}
        on:click={()=>onClickMessage(m.id)} role="button" tabindex="0"
      >
        {#if !groupedPrev}
          {#if selectedGroup &&!mine}<div class="sender-name">{m.sender_name || 'User'}</div>{/if}
        {/if}
        <div class="bubble-wrap">
          {#if !mine && groupedPrev}<div class="thread-line"></div>{/if}
          <div class="bubble" class:tail={!groupedNext} class:template-bubble={isTpl}>
            {#if m.reply_to}
              <div class="reply-box"><div class="reply-line"></div><div class="reply-text">{m.reply_to.content || 'Reply'}</div></div>
            {/if}

            {#if isTpl}
              {@const v = tmpl?.values || {}}
              <div class="template-card">
                <div class="tpl-title">📋 {tmpl?.template_name || 'RAT YIELD'}</div>
                <div class="tpl-rows">
                  <div class="tpl-row"><span>Shift:</span><span>{v.Shift || getValFromText(display,'Shift')}</span></div>
                  <div class="tpl-row"><span>Station:</span><span>{v.Station || getValFromText(display,'Station')}</span></div>
                  <div class="tpl-row"><span>RAT Input:</span><span>{v.RAT_Input || v['RAT Input'] || getValFromText(display,'RAT_Input')}</span></div>
                  <div class="tpl-row"><span>RAT Output:</span><span>{v.RAT_Output || v['RAT Output'] || getValFromText(display,'RAT_Output')}</span></div>
                  <div class="tpl-row"><span>RAT Yield:</span><span>{v.RAT_Yield || getValFromText(display,'RAT_Yield')}</span></div>
                </div>
              </div>
              <div class="tpl-footer">*{tmpl?.template_name || 'RAT YIELD'}* `{v.Station || getValFromText(display,'Station')}`</div>
            {:else if m.content}
              <div class="text" on:click={onTagClick} on:keydown={()=>{}} role="button" tabindex="-1">{@html parseTags(display)}</div>
            {/if}
            <div class="meta"><span class="time">{getTime(m.created_at)}</span>{#if mine}{#if m.status==='read'}<span class="ticks read">✓✓</span>{:else if m.status==='delivered'}<span class="ticks">✓✓</span>{:else}<span class="ticks single">✓</span>{/if}{/if}</div>
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>

{#if selectedMessages.size>0}
  <div class="action-bar">
    <span>{selectedMessages.size} selected</span>
    <button on:click={()=>{ dispatch("replyTo", { ids: Array.from(selectedMessages) }); selectedMessages=new Set(); }}>Reply</button>
    <button on:click={()=>{ dispatch("forward", { ids: Array.from(selectedMessages) }); selectedMessages=new Set(); }}>Forward</button>
    <button on:click={()=>selectedMessages=new Set()}>✕</button>
  </div>
{/if}

<style>
.message-list{ flex:1; overflow-y:auto; padding:20px 12px; background:#0b141a; position:relative; display:flex; flex-direction:column; }
.empty{ text-align:center; color:#8696a0; margin-top:40%; }
.msg-row{ display:flex; flex-direction:column; margin-bottom:2px; max-width:78%; position:relative; }
.msg-row.mine{ align-self:flex-end; margin-left:auto; }
.msg-row:not(.mine){ align-self:flex-start; }
.msg-row.selected{ outline:2px solid #00a884; background:rgba(0,168,132,0.15); }
.sender-name{ font-size:12px; color:#00a884; font-weight:600; margin-left:8px; margin-bottom:2px; }
.bubble-wrap{ display:flex; position:relative; }
.thread-line{ width:2px; background:#2a3942; margin:0 8px 0 18px; border-radius:2px; }
.bubble{ background:#202c33; color:#e9edef; padding:8px 10px 5px; border-radius:18px; border-top-left-radius:0; position:relative; word-break:break-word; min-width:80px; }
.mine.bubble{ background:#005c4b; border-radius:18px; border-top-right-radius:0; }
.bubble.tail::after{ content:""; position:absolute; bottom:0; width:12px; height:12px; background:inherit; }
.mine.bubble.tail::after{ right:-4px; clip-path:polygon(0 0, 0 100%, 100% 100%); }
:not(.mine).bubble.tail::after{ left:-4px; clip-path:polygon(100% 0, 0 100%, 100% 100%); }
.reply-box{ display:flex; gap:6px; background:rgba(0,0,0,0.2); border-radius:6px; padding:6px 8px; margin-bottom:6px; }
.reply-line{ width:3px; background:#00a884; border-radius:2px; }
.reply-text{ font-size:12px; color:#8696a0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px; }
.text{ font-size:14.5px; line-height:19px; white-space:pre-wrap; }
:global(.mention){ color:#53bdeb; font-weight:700; background:rgba(83,189,235,0.15); padding:0 4px; border-radius:4px; cursor:pointer; }
.meta{ display:flex; justify-content:flex-end; gap:6px; margin-top:4px; }
.time{ font-size:11px; color:#8696a0; }
.ticks{ font-size:11px; color:#8696a0; }
.ticks.read{ color:#53bdeb; }
.action-bar{ position:absolute; bottom:70px; left:50%; transform:translateX(-50%); background:#233138; border:1px solid #2a3942; border-radius:24px; padding:8px 16px; display:flex; gap:12px; align-items:center; color:#e9edef; z-index:10; }
.action-bar button{ background:#00a884; border:none; color:#111b21; padding:6px 12px; border-radius:16px; font-weight:600; cursor:pointer; font-size:12px; }
.action-bar button:last-child{ background:#2a3942; color:#e9edef; }
.template-bubble{ padding:4px!important; background:#005c4b!important; }
.template-card{ background:#d7e8ff; border-radius:12px; border:1px solid #a8c6f0; overflow:hidden; min-width:230px; color:#111; }
.tpl-title{ font-weight:800; text-align:center; padding:10px 8px; font-size:14px; border-bottom:1px solid #b9d2f5; }
.tpl-rows{ padding:8px 12px; font-size:13px; line-height:24px; }
.tpl-row{ display:flex; justify-content:space-between; gap:12px; }
.tpl-row span:last-child{ font-weight:700; }
.tpl-footer{ color:#e9edef; font-weight:700; padding:8px 4px 2px; font-size:14px; }
</style>