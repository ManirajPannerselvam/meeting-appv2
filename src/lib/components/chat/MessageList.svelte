<script lang="ts">
  import dayjs from 'dayjs';

  let {
    messages = [],
    selectedContact = null,
    selectedGroup = null,
    currentUserId = null,
    currentUser = null,
    selectedUser = null,
    replyingTo = null,
    onReply = () => {},
    onDelete = () => {},
    onForward = () => {},
    onLongPress = () => {},
    onPressEnd = () => {}
  } = $props();

  let uid = $derived(currentUserId || currentUser?.id || '');

  let groupedMessages = $derived(
    messages.reduce((acc:any, msg:any, idx:number) => {
      const prev = messages[idx-1];
      const isSameSender = prev && prev.sender_id === msg.sender_id;
      const timeDiff = prev? dayjs(msg.created_at).diff(dayjs(prev.created_at), 'minute') : 10;
      const groupedPrev = isSameSender && timeDiff < 2;
      acc.push({...msg, groupedPrev, mine: msg.sender_id === uid });
      return acc;
    }, [])
  );

  function formatTime(ts:string){
    return dayjs(ts).format('h:mm A');
  }

  function isTemplate(content:string){
    if(!content) return false;
    return content.includes('__TEMPLATE_DATA__') || content.includes('TEMPLATE_REPORT');
  }

  function parseTemplate(content:string){
    try {
      if(content.includes('__TEMPLATE_DATA__')){
        const jsonStr = content.split('__TEMPLATE_DATA__')[1]?.trim();
        const parsed = JSON.parse(jsonStr);
        return parsed;
      }
      return null;
    } catch { return null; }
  }

  function getTheme(code:string){
    if(!code) return { bg:'#e6f0ff', border:'#c7dbff', title:'#0f172a' };
    if(code.includes('PROD') || code.includes('PRO')) return { bg:'#e6f0ff', border:'#c7dbff', title:'#0f172a' };
    if(code.includes('MAINT')) return { bg:'#fef3c7', border:'#fde68a', title:'#92400e' };
    if(code.includes('QUAL')) return { bg:'#dcfce7', border:'#bbf7d0', title:'#166534' };
    return { bg:'#e6f0ff', border:'#c7dbff', title:'#0f172a' };
  }

  function getYield(v:any){
    const inp = Number(v?.input01 || 0);
    const out = Number(v?.output01 || 0);
    if(!inp) return '-';
    return ((out / inp) * 100).toFixed(2) + '%';
  }
</script>

<div class="message-list">
  {#each groupedMessages as m}
    {@const tpl = isTemplate(m.content)? parseTemplate(m.content) : null}
    {@const vals = tpl?.values || {}}
    {@const theme = tpl? getTheme(tpl.template_code || tpl.template_name) : null}

    <div class="msg-row" class:mine={m.mine} class:grouped={m.groupedPrev}
         role="button" tabindex="0"
         oncontextmenu={(e)=>{ e.preventDefault(); onLongPress(m, e); }}
         ontouchstart={(e)=>onLongPress(m, e)}
         ontouchend={onPressEnd}
         onmousedown={(e)=>onLongPress(m, e)}
         onmouseup={onPressEnd}
    >
      {#if !m.groupedPrev}
        {#if selectedGroup &&!m.mine}
          <div class="sender-name">{m.sender_name || m.profiles?.name || 'User'}</div>
        {/if}
      {/if}

      <div class="bubble" class:mine-bubble={m.mine} class:template-bubble={tpl}>

        {#if tpl}
          <!-- TEMPLATE CARD - YOUR SCREENSHOT STYLE -->
          <div class="t-card" style="background:{theme.bg}; border: 1px solid {theme.border}">
            <div class="t-header">
              <span>📋</span>
              <b style="color:{theme.title}">{tpl.template_name || 'Production Tracker'}</b>
            </div>
            <div class="t-body">
              {#if vals.shift}<div class="t-row"><span>Shift:</span><b>{vals.shift}</b></div>{/if}
              {#if vals.station}<div class="t-row"><span>Station:</span><b>{vals.station}</b></div>{/if}
              <div class="t-row"><span>RAT Input:</span><b>{vals.input01?? '-'}</b></div>
              <div class="t-row"><span>RAT Output:</span><b>{vals.output01?? '-'}</b></div>
              <div class="t-row"><span>RAT Yield:</span><b>{vals.yield || getYield(vals)}</b></div>
              {#if vals.remark01}<div class="t-row remark"><span>Remark:</span><b>{vals.remark01}</b></div>{/if}

              <!-- Show all other values dynamically -->
              {#each Object.entries(vals) as [k,v]}
                {#if !['shift','station','input01','output01','yield','remark01'].includes(k)}
                  <div class="t-row"><span>{k}:</span><b>{v || '-'}</b></div>
                {/if}
              {/each}
            </div>
          </div>
        {:else}
          <div class="content">{m.content}</div>
        {/if}

        <div class="meta">
          <span class="time">{formatTime(m.created_at)}</span>
          {#if m.mine}<span class="tick">✓✓</span>{/if}
        </div>
      </div>
    </div>
  {/each}
</div>

<style>
.message-list{ flex:1; overflow-y:auto; padding:12px 16px; display:flex; flex-direction:column; gap:2px; background:#0b141a; }
.msg-row{ display:flex; flex-direction:column; max-width:75%; align-self:flex-start; margin-bottom:4px; outline:none; }
.msg-row.mine{ align-self:flex-end; }
.msg-row.grouped{ margin-top:-2px; }
.sender-name{ font-size:12px; font-weight:600; color:#53bdeb; margin:4px 8px 2px; }
.bubble{ background:#202c33; color:#e9edef; padding:6px 8px 6px 10px; border-radius:8px; border-top-left-radius:0; position:relative; box-shadow:0 1px 0.5px rgba(0,0,0,0.13); min-width:120px; }
.mine-bubble{ background:#005c4b; border-radius:8px; border-top-right-radius:0; }
.bubble.template-bubble{ background:#005c4b; padding:6px; }
.bubble.template-bubble.mine-bubble{ background:#005c4b; }
.content{ font-size:14.2px; line-height:19px; white-space:pre-wrap; word-break:break-word; }

/* TEMPLATE CARD - EXACT SCREENSHOT */
.t-card{ border-radius:12px; overflow:hidden; min-width:220px; max-width:300px; }
.t-header{ display:flex; align-items:center; gap:6px; padding:10px 14px; border-bottom:1px solid rgba(0,0,0,0.08); background:rgba(255,255,255,0.65); }
.t-header b{ font-size:14px; font-weight:800; }
.t-body{ padding:10px 14px; display:flex; flex-direction:column; gap:7px; background:transparent; }
.t-row{ display:flex; justify-content:space-between; align-items:center; gap:16px; }
.t-row span{ font-size:13px; color:#334155; font-weight:400; }
.t-row b{ font-size:13px; color:#0f172a; font-weight:700; text-align:right; max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.t-row.remark{ flex-direction:column; align-items:flex-start; gap:2px; margin-top:4px; padding-top:6px; border-top:1px dashed rgba(0,0,0,0.12); }
.t-row.remark b{ text-align:left; max-width:100%; font-weight:500; white-space:normal; }

.meta{ display:flex; justify-content:flex-end; align-items:center; gap:4px; margin-top:4px; }
.template-bubble.meta{ padding:0 4px 2px 0; }
.template-bubble.meta.time{ color:#d1d7db; }
.time{ font-size:11px; color:#8696a0; }
.mine-bubble.time{ color:#8696a0; }
.tick{ font-size:11px; color:#53bdeb; }
</style>