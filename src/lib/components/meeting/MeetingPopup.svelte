<script lang="ts">
import { goto } from "$app/navigation";
import { supabaseTemplates, getTemplateClient } from '$lib/supabase/client';

export let open = false;
export let meetings: any[] = [];
export let onClose: () => void = ()=>{ console.log('[DEBUG] onClose default called'); };

let search = "";
$: filtered = meetings.filter(m => {
  if(!search) return true;
  return `${m.title} ${m.code || ''}`.toLowerCase().includes(search.toLowerCase());
}).slice(0,20);

$: console.log('[DEBUG] open=', open, 'meetings len=', meetings.length, 'filtered len=', filtered.length);

function getClient(){ try{ return getTemplateClient() || supabaseTemplates; }catch{ return supabaseTemplates; } }

function safeGoto(url:string){
  console.log('[DEBUG] safeGoto called ->', url);
  try{ onClose(); console.log('[DEBUG] onClose executed'); }catch(e){ console.log('[DEBUG] onClose error', e); }
  setTimeout(async ()=>{
    console.log('[DEBUG] setTimeout goto start ->', url);
    try{ 
      console.log('[DEBUG] trying goto()'); 
      await goto(url); 
      console.log('[DEBUG] goto() success');
    }catch(e){ 
      console.log('[DEBUG] goto() failed, fallback to window.location', e); 
      window.location.href = url; 
    }
  }, 100);
}

function handleNew(){
  console.log('[DEBUG] handleNew CLICKED');
  safeGoto('/meetings');
}
function handleEdit(m:any){
  console.log('[DEBUG] handleEdit CLICKED', m);
  safeGoto(`/meetings/${m.id}/edit`);
}
function handleMinutes(m:any){
  console.log('[DEBUG] handleMinutes CLICKED', m);
  safeGoto(`/minutes/${m.id}`);
}
async function handleShare(m:any){
  console.log('[DEBUG] handleShare CLICKED', m);
  const url = `${location.origin}/minutes/${m.id}`;
  console.log('[DEBUG] share url', url);
  try{
    if(navigator.share){ 
      console.log('[DEBUG] using navigator.share');
      await navigator.share({title:m.title, url}); 
      console.log('[DEBUG] share success');
    } else { 
      console.log('[DEBUG] using clipboard');
      await navigator.clipboard.writeText(url); 
      alert('Copied: '+url); 
    }
  }catch(e){ console.log('[DEBUG] share failed', e); prompt('Copy:', url); }
}
async function handleDelete(m:any){
  console.log('[DEBUG] handleDelete CLICKED', m);
  if(!confirm(`Delete ${m.title}?`)){ console.log('[DEBUG] delete cancelled'); return; }
  const client = getClient();
  console.log('[DEBUG] client', !!client);
  try{
    console.log('[DEBUG] deleting meeting_actions');
    await client.from('meeting_actions').delete().eq('meeting_id', m.id);
    console.log('[DEBUG] deleting minutes');
    await client.from('minutes').delete().eq('meeting_id', m.id);
    console.log('[DEBUG] deleting meetings id', m.id);
    const { error } = await client.from('meetings').delete().eq('id', m.id);
    if(error){ console.log('[DEBUG] delete error', error); throw error; }
    meetings = meetings.filter(x=>x.id!==m.id);
    console.log('[DEBUG] deleted from local array, new len', meetings.length);
    alert('Deleted');
  }catch(e:any){ console.log('[DEBUG] delete catch', e); alert(e.message); }
}
</script>

{#if open}
<div class="overlay" on:click={()=>{console.log('[DEBUG] overlay CLICK -> close'); onClose();}}>
  <div class="popup-card" on:click|stopPropagation={()=>{console.log('[DEBUG] popup-card CLICK (should NOT close)');}}>
    <div class="head">
      <div class="head-left"><span>📋</span><div><h2>Meetings</h2><small>{filtered.length} shown</small></div></div>
      <button class="close" on:click={()=>{console.log('[DEBUG] X close CLICK'); onClose();}}>✕</button>
    </div>
    <div class="green-line"></div>
    <div class="search-row">
      <div class="search-box"><span>🔍</span><input bind:value={search} placeholder="Search..." on:input={()=>console.log('[DEBUG] search input', search)} /></div>
      <button class="btn-new" on:click|stopPropagation={()=>{console.log('[DEBUG] +New BTN CLICKED'); handleNew();}}>+ New</button>
    </div>
    <div class="list">
      {#each filtered as m (m.id)}
        <div class="card" on:click={()=>console.log('[DEBUG] card CLICK', m.id)}>
          <div class="card-top"><div class="doc-icon">📄</div><div class="info"><b>{m.title}</b><div>Code: {m.code||'MT0'+m.id}</div></div></div>
          <div class="btn-row">
            <button type="button" class="b-edit" on:click|stopPropagation={(e)=>{console.log('[DEBUG] Edit BTN raw click', e); handleEdit(m);}}>Edit</button>
            <button type="button" class="b-share" on:click|stopPropagation={()=>{console.log('[DEBUG] Share BTN CLICKED'); handleShare(m);}}>Share</button>
            <button type="button" class="b-del" on:click|stopPropagation={()=>{console.log('[DEBUG] Del BTN CLICKED'); handleDelete(m);}}>Del</button>
            <button type="button" class="b-minutes" on:click|stopPropagation={()=>{console.log('[DEBUG] Minutes BTN CLICKED'); handleMinutes(m);}}>Minutes</button>
          </div>
        </div>
      {:else}<div class="empty">No meetings</div>{/each}
    </div>
  </div>
</div>
{/if}

<style>
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;}
.popup-card{background:#fff;width:100%;max-width:480px;border-radius:22px;overflow:hidden;max-height:90dvh;display:flex;flex-direction:column;}
.head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;}
.head-left{display:flex;gap:10px;align-items:center;} .head-left h2{margin:0;font-size:18px;}
.close{width:36px;height:36px;border-radius:50%;border:none;background:#f1f5f9;cursor:pointer;}
.green-line{height:4px;background:#10b981;}
.search-row{display:flex;gap:8px;padding:12px;}
.search-box{flex:1;display:flex;gap:8px;border:1.5px solid #cbd5e1;border-radius:12px;padding:8px 12px;}
.search-box input{border:none;outline:none;flex:1;}
.btn-new{background:#10b981;color:#fff;border:none;padding:0 22px;border-radius:12px;font-weight:800;cursor:pointer;}
.list{overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:10px;background:#f8fafc;}
.card{background:#f0fdf4;border:1px solid #dcfce7;border-left:5px solid #f59e0b;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;}
.card-top{display:flex;gap:10px;} .doc-icon{width:48px;height:48px;border:1.5px solid #10b981;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#fff;}
.btn-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;}
.btn-row button{padding:12px 4px;border-radius:10px;border:1.5px solid;font-weight:700;font-size:13px;cursor:pointer;pointer-events:auto;position:relative;z-index:10;}
.b-edit{background:#f8fafc;border-color:#e2e8f0;} .b-share,.b-minutes{background:#10b981;border-color:#10b981;color:#fff;} .b-del{background:#ffe4e6;border-color:#ffe4e6;color:#991b1b;}
</style>