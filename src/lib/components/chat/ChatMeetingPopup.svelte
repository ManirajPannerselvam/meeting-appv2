<script lang="ts">
import { goto } from "$app/navigation";
import { browser } from "$app/environment";
export let chat:any;

function sanitize(s:string){ return String(s||'').slice(0,80).replace(/[<>]/g,''); }
function safeGoto(url:string){
  chat.showMeetingListPopup=false;
  chat.showMeetingPopup=false;
  if(!browser) return;
  setTimeout(async()=>{
    try{ await goto(url); }catch{ window.location.href=url; }
  }, 80);
}

// 50k - limit 20, secure, no lag
$: filtered = (() => {
  const q = String(chat.meetingSearch||'').toLowerCase().trim().slice(0,50);
  let list = (chat.meetings||[]).slice(0,20);
  if(q) list = list.filter((m:any)=> (m.title||'').toLowerCase().includes(q) || (m.code||'').toLowerCase().includes(q)).slice(0,20);
  return list;
})();
</script>

{#if chat.showMeetingListPopup}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-bg" on:click|self={()=>chat.showMeetingListPopup=false}>
<div class="modal meeting-popup" on:click|stopPropagation>
  <div class="tmp-head">
    <div class="tmp-head-left"><span class="tmp-icon">📋</span><div><h2>Meetings</h2><small>{filtered.length} shown • 20 max</small></div></div>
    <div class="tmp-head-right"><span class="emerald-pill">Emerald</span><button class="tmp-close" on:click|stopPropagation={()=>chat.showMeetingListPopup=false}>✕</button></div>
  </div>
  <div class="tmp-green-line"></div>
  <div class="tmp-search-row">
    <div class="tmp-search-box"><span>🔍</span><input bind:value={chat.meetingSearch} placeholder="Search..." maxlength="30" aria-label="Search meetings" /></div>
    <button class="tmp-new" on:click|stopPropagation={()=>safeGoto('/meetings')}>+ New</button>
  </div>
  <div class="tmp-list">
    {#each filtered as m (m.id)}
      <div class="tmp-card">
        <div class="tmp-card-top">
          <div class="tmp-doc">📄</div>
          <div class="tmp-info">
            <div class="tmp-title"><b>{sanitize(m.title)}</b><span class="emerald-mini">Emerald</span></div>
            <div class="tmp-code">Code: {sanitize(m.code||'MT'+m.id)}</div>
          </div>
        </div>
        <div class="tmp-btns">
          <button type="button" class="tb-edit" on:click|stopPropagation={()=>safeGoto(`/meetings/edit/${m.id}`)}>Edit</button>
          <button type="button" class="tb-share" on:click|stopPropagation={()=>{
            const safeTitle = sanitize(m.title);
            const txt=`📅 MEETING: ${safeTitle} - ${location.origin}/minutes/${m.id}`;
            try{ chat.sendMessage(txt); }catch{ navigator.clipboard?.writeText(txt); }
            chat.showMeetingListPopup=false;
          }}>Share</button>
          <button type="button" class="tb-del" on:click|stopPropagation={()=>{
            if(confirm(`Delete ${sanitize(m.title)}?`)){
              chat.meetings=chat.meetings.filter((x:any)=>x.id!==m.id);
              try{ chat.deleteMeeting?.(m.id); }catch{}
            }
          }}>Del</button>
          <button type="button" class="tb-use" on:click|stopPropagation={()=>safeGoto(`/minutes/${m.id}`)}>Minutes</button>
        </div>
      </div>
    {:else}
      <div class="empty">No meetings</div>
    {/each}
  </div>
</div>
</div>
{/if}

{#if chat.showMeetingPopup && chat.selectedMeeting}
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal-bg" on:click|self={()=>chat.showMeetingPopup=false}>
<div class="modal detail-popup" on:click|stopPropagation>
  <div class="detail-head"><div><small>#{sanitize(String(chat.selectedMeeting.id))}</small><h2>{sanitize(chat.selectedMeeting.title)}</h2></div><button class="tmp-close" on:click|stopPropagation={()=>chat.showMeetingPopup=false}>✕</button></div>
  <div class="detail-body"><p>{sanitize(chat.selectedMeeting.agenda||'No agenda').slice(0,200)}</p></div>
  <div class="detail-foot">
    <button class="btn-cancel" on:click|stopPropagation={()=>chat.showMeetingPopup=false}>Close</button>
    <button class="btn-dark" on:click|stopPropagation={()=>safeGoto(`/meetings/edit/${chat.selectedMeeting.id}`)}>Edit</button>
    <button class="btn-blue" on:click|stopPropagation={()=>safeGoto(`/minutes/${chat.selectedMeeting.id}`)}>Minutes</button>
  </div>
</div>
</div>
{/if}

<style>
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:8px;}
.meeting-popup{width:96%;max-width:420px;max-height:90dvh;background:#fff;border-radius:16px;padding:0;gap:0;overflow:hidden;display:flex;flex-direction:column;}
.tmp-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fff;}
.tmp-head-left{display:flex;gap:8px;align-items:center;} .tmp-head-left h2{margin:0;font-size:15px;color:#111;} .tmp-head-left small{color:#94a3b8;font-size:10px;}
.tmp-icon{font-size:18px;}
.tmp-head-right{display:flex;gap:6px;align-items:center;} .emerald-pill{border:1px solid #10b981;color:#10b981;background:#ecfdf5;padding:3px 10px;border-radius:14px;font-size:10px;font-weight:700;}
.tmp-close{width:28px;height:28px;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;font-size:12px;}
.tmp-green-line{height:3px;background:#10b981;}
.tmp-search-row{display:flex;gap:6px;padding:6px;background:#fff;}
.tmp-search-box{flex:1;display:flex;align-items:center;gap:6px;border:1px solid #e2e8f0;border-radius:10px;padding:6px 10px;}
.tmp-search-box input{border:none;outline:none;flex:1;font-size:12px;}
.tmp-new{background:#10b981;color:#fff;border:none;padding:0 14px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;height:32px;}
.tmp-list{overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:6px;background:#f8fafc;max-height:60vh;}
.tmp-card{background:#fff;border:1px solid #e2e8f0;border-left:3px solid #f59e0b;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px;}
.tmp-card-top{display:flex;gap:8px;} .tmp-doc{width:32px;height:32px;border:1px solid #10b981;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fff;flex-shrink:0;font-size:14px;}
.tmp-info{flex:1;min-width:0;} .tmp-title{display:flex;gap:6px;align-items:center;} .tmp-title b{font-size:12px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;}
.emerald-mini{background:#10b981;color:#fff;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;}
.tmp-code{font-size:10px;color:#64748b;}
.tmp-btns{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;}
.tmp-btns button{padding:8px 2px;border-radius:8px;border:1px solid;font-weight:600;font-size:10px;cursor:pointer;pointer-events:auto;position:relative;z-index:10;}
.tb-edit{background:#f8fafc;border-color:#e2e8f0;color:#0f172a;} .tb-share{background:#10b981;border-color:#10b981;color:#fff;} .tb-del{background:#fef2f2;border-color:#fecaca;color:#991b1b;} .tb-use{background:#0f172a;border-color:#0f172a;color:#fff;}
.empty{padding:20px;text-align:center;color:#94a3b8;font-size:12px;}
.detail-popup{width:92%;max-width:400px;background:#fff;border-radius:16px;padding:0;gap:0;overflow:hidden;}
.detail-head{padding:12px 14px;display:flex;justify-content:space-between;background:#f8fafc;border-bottom:1px solid #f1f5f9;}
.detail-head small{color:#94a3b8;font-size:10px;} .detail-head h2{margin:2px 0 0;font-size:14px;color:#0f172a;}
.detail-body{padding:12px 14px;} .detail-body p{font-size:12px;color:#334155;line-height:1.4;}
.detail-foot{padding:10px 12px;display:flex;gap:6px;border-top:1px solid #f1f5f9;background:#fff;}
.detail-foot button{flex:1;padding:8px;border-radius:8px;font-weight:600;font-size:11px;cursor:pointer;border:1px solid;}
.btn-cancel{background:#fff;border-color:#e2e8f0;color:#334155;} .btn-dark{background:#0f172a;color:#fff;border-color:#0f172a;} .btn-blue{background:#2563eb;color:#fff;border-color:#2563eb;}
</style>