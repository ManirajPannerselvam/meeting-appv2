<script lang="ts">
let { messages=[], selectedContact, selectedGroup, currentUser, replyingTo, onReply, onForward, onOpenDetail } = $props();

function sanitize(s:string, max=2000){
  return String(s||'').slice(0,max).replace(/[<>]/g,'').replace(/[\x00-\x1F\x7F]/g,'');
}
function isReport(m:any){
  if(!m) return false;
  if(m._template || m.template_name) return true;
  const c = String(m.content||'').toLowerCase();
  return c.startsWith('__report__') || c.includes('daily yield') || (c.includes('station:') && c.includes('yield:'));
}
function parseReport(m:any){
  try{
    const t = m._template || {};
    let c = String(m.content||'');
    const station = sanitize(t.station || c.match(/Station:\s*([^\n|]+)/i)?.[1] || 'S-OTA',20);
    const input = sanitize(String(t.input || c.match(/Input:\s*(\d+)/i)?.[1] || '654'),10);
    const output = sanitize(String(t.output || c.match(/Output:\s*(\d+)/i)?.[1] || '650'),10);
    const yieldP = sanitize(String(t.yield_percent || c.match(/Yield:\s*([\d.]+)/i)?.[1] || '99.39'),10);
    const name = sanitize(t.template_name || m.template_name || 'Daily Yield',30);
    const time = m.created_at? new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
    return { station, input, output, yieldP, name, time };
  }catch{ return { station:'S-OTA', input:'654', output:'650', yieldP:'99.39', name:'Daily Yield', time:'' }; }
}
function formatTime(iso:string){
  try{ return new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }catch{ return ''; }
}
function getStatus(m:any){
  return (m.status||'sent') as 'sent'|'delivered'|'read';
}
</script>

<div class="list">
{#each messages as m (m.id)}
  {@const own =!!(m.is_own || m.sender_id===currentUser?.id)}
  {@const report = isReport(m)}
  {@const status = getStatus(m)}

  {#if report}
    {@const r = parseReport(m)}
    <div class="bubble-wrap own">
      <div class="report-card">
        <div class="card-inner">
          <div class="card-header">
            <span class="doc-icon">📄</span>
            <span class="title">{r.name}</span>
          </div>
          <div class="card-data">
            <div class="row"><span class="label">Station:</span><span class="val">{r.station}</span></div>
            <div class="row"><span class="label">Input:</span><span class="val">{r.input}</span></div>
            <div class="row"><span class="label">Output:</span><span class="val">{r.output}</span></div>
            <div class="row"><span class="label">Yield:</span><span class="val green">{r.yieldP.includes('%')?r.yieldP:r.yieldP+'%'}</span></div>
          </div>
          <button type="button" class="view-btn" onclick={()=>onOpenDetail?.({detail:{template:{...m._template, station:r.station, input:r.input, output:r.output, yield_percent:r.yieldP, template_name:r.name}, message:m}})}>
            View Details
          </button>
        </div>
        <div class="card-time">
          {formatTime(m.created_at)}
          {#if own}
            {#if status==='read'}<span class="tick blue">✓✓</span>
            {:else if status==='delivered'}<span class="tick grey">✓✓</span>
            {:else}<span class="tick single">✓</span>{/if}
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="bubble-wrap" class:own>
      <div class="bubble chat-bubble" class:own>
        <div class="chat-text">{sanitize(String(m.content||'').slice(0,2000),2000)}</div>
        <div class="chat-meta">
          <span>{formatTime(m.created_at)}</span>
          {#if own}
            {#if status==='read'}<span class="tick blue">✓✓</span>
            {:else if status==='delivered'}<span class="tick grey">✓✓</span>
            {:else}<span class="tick single">✓</span>{/if}
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/each}
</div>

<style>
.list{display:flex;flex-direction:column;gap:8px;padding:12px 8px 90px;background:#0b141a;min-height:100%;}
.bubble-wrap{display:flex;max-width:85%;align-self:flex-start;}
.bubble-wrap.own{align-self:flex-end;justify-content:flex-end;}

.report-card{
  background:#134e4a;
  border-radius:16px;
  padding:6px;
  min-width:260px;
  max-width:320px;
  box-shadow:0 2px 8px rgba(0,0,0,0.3);
}
.card-inner{
  background:#0f172a;
  border-radius:12px;
  padding:12px 12px 10px;
  border:1px solid #1e293b;
}
.card-header{display:flex;align-items:center;gap:6px;margin-bottom:10px;}
.doc-icon{font-size:13px;opacity:0.9;}
.title{color:#14b8a6;font-size:13px;font-weight:700;letter-spacing:0.2px;}
.card-data{
  background:#0b1220;
  border-radius:10px;
  padding:10px 12px;
  display:flex;
  flex-direction:column;
  gap:8px;
}
.row{display:flex;justify-content:space-between;align-items:center;}
.label{color:#94a3b8;font-size:12px;font-weight:400;}
.val{color:#e2e8f0;font-size:13px;font-weight:600;}
.val.green{color:#22c55e;font-weight:700;}
.view-btn{
  width:100%;
  margin-top:12px;
  background:#14b8a6;
  color:#042f2e;
  border:none;
  border-radius:20px;
  padding:9px 0;
  font-size:13px;
  font-weight:700;
  cursor:pointer;
}
.view-btn:active{transform:scale(0.98);}

.bubble{border-radius:14px;padding:8px 10px;word-break:break-word;max-width:100%;}
.chat-bubble{background:#202c33;color:#e9edef;border-top-left-radius:4px;font-size:13.5px;line-height:1.35;}
.chat-bubble.own{background:#005c4b;color:#e9edef;border-top-right-radius:4px;}
.chat-text{white-space:pre-wrap;}
.chat-meta{font-size:10px;color:#8696a0;text-align:right;margin-top:4px;display:flex;justify-content:flex-end;align-items:center;gap:4px;}

.card-time{font-size:10px;color:#6b8a7f;text-align:right;margin-top:6px;padding-right:6px;display:flex;justify-content:flex-end;gap:4px;align-items:center;}

.tick{font-size:11px;line-height:1;}
.tick.single{color:#8696a0;}
.tick.grey{color:#8696a0;letter-spacing:-2px;}
.tick.blue{color:#53bdeb;letter-spacing:-2px;}
</style>