<script lang="ts">
  export let mode: 'chat'|'template'|'meeting' = 'chat';
  export let templates: any[] = [];
  export let meetings: any[] = [];
  export let selectedTemplate: any = null;
  export let onChangeMode: (m:any)=>void = ()=>{};
  export let onSelectTemplate: (t:any)=>void = ()=>{};
  export let onSelectMeeting: (m:any)=>void = ()=>{};

  let openMode = false;
  let openList = false;
  let selectedMeeting: any = null;

  function clickOutside(node: HTMLElement, cb: () => void) {
    const h = (e: MouseEvent) => { if(!node.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h, true);
    return { destroy(){ document.removeEventListener('mousedown', h, true); } };
  }

  function pickMode(m:any){
    mode = m;
    openMode=false;
    openList=false;
    selectedTemplate=null;
    selectedMeeting=null;
    onChangeMode(m);
  }
  function pickTemplate(t:any){
    selectedTemplate=t;
    openList=false;
    onSelectTemplate(t);
  }
  function pickMeeting(m:any){
    selectedMeeting=m;
    openList=false;
    onSelectMeeting(m);
  }

  $: modeLabel = mode==='chat' ? 'Chat' : mode==='template' ? 'Template' : 'Meeting';
  $: modeIcon = mode==='chat' ? '💬' : mode==='template' ? '📋' : '📅';
</script>

<div class="mode-bar">
  <!-- 1st Dropdown: Chat | Template | Meeting -->
  <div class="first-row">
    <div class="dd-wrap" use:clickOutside={()=>openMode=false}>
      <button class="mode-btn" onclick={(e)=>{e.stopPropagation(); openMode=!openMode}}>
        <span>{modeIcon}</span> <b>{modeLabel}</b> <span class="arr">{openMode?'▲':'▼'}</span>
      </button>
      {#if openMode}
        <div class="dd" onclick={(e)=>{e.stopPropagation()}}>
          <button class:active={mode==='chat'} onclick={()=>pickMode('chat')}><span>💬</span> Chat <small>default messages</small></button>
          <button class:active={mode==='template'} onclick={()=>pickMode('template')}><span>📋</span> Template <small>list all templates</small></button>
          <button class:active={mode==='meeting'} onclick={()=>pickMode('meeting')}><span>📅</span> Meeting <small>meeting & actions</small></button>
        </div>
      {/if}
    </div>

    <!-- 2nd Dropdown: dynamic list -->
    {#if mode!=='chat'}
      <div class="dd-wrap second" use:clickOutside={()=>openList=false}>
        <button class="list-btn" onclick={(e)=>{e.stopPropagation(); openList=!openList}}>
          <span>
            {#if mode==='template'}
              {selectedTemplate?.name || 'Select Template'}
            {:else}
              {selectedMeeting?.title || 'Select Meeting'}
            {/if}
          </span>
          <span class="arr">{openList?'▲':'▼'}</span>
        </button>
        {#if openList}
          <div class="dd dd2" onclick={(e)=>{e.stopPropagation()}}>
            {#if mode==='template'}
              {#each templates as t}
                <button onclick={()=>pickTemplate(t)} class:active={selectedTemplate?.id===t.id}>
                  <b>{t.name || t.template_code}</b><small>{t.template_code}</small>
                </button>
              {:else}
                <div class="empty">No templates</div>
              {/each}
            {:else}
              {#each meetings as m}
                <button onclick={()=>pickMeeting(m)} class:active={selectedMeeting?.id===m.id}>
                  <b>{m.title || m.name}</b><small>{m.date || m.time || ''}</small>
                </button>
              {:else}
                <div class="empty">No meetings</div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Down side data -->
  {#if mode==='template' && selectedTemplate}
    <div class="data-box">
      <div class="data-head">📋 {selectedTemplate.name} <span>{selectedTemplate.template_code}</span></div>
      <div class="grid">
        {#each Object.entries(selectedTemplate.data||{}) as [k,v]}
          <div class="field"><span class="fk">{k.replace(/_/g,' ')}</span><b class="fv">{String(v).slice(0,60)}</b></div>
        {:else}
          <div class="field"><span class="fk">Info</span><b class="fv">No fields</b></div>
        {/each}
      </div>
    </div>
  {/if}

  {#if mode==='meeting' && selectedMeeting}
    <div class="data-box">
      <div class="data-head">📅 {selectedMeeting.title} <span>{selectedMeeting.date || ''}</span></div>
      <div class="grid">
        {#each Object.entries(selectedMeeting).slice(0,6) as [k,v]}
          <div class="field"><span class="fk">{k}</span><b class="fv">{String(v||'-').slice(0,60)}</b></div>
        {/each}
      </div>
      <div class="actions">
        <button class="a-btn">Join</button>
        <button class="a-btn sec">Details</button>
      </div>
    </div>
  {/if}
</div>

<style>
.mode-bar{background:#f0f2f5; border-bottom:1px solid #d1d7db; padding:8px 10px; display:flex; flex-direction:column; gap:8px;}
.first-row{display:flex; gap:8px; align-items:center;}
.dd-wrap{position:relative;}
.mode-btn{background:white; border:1px solid #d1d7db; padding:8px 12px; border-radius:8px; display:flex; gap:6px; align-items:center; cursor:pointer; font-size:13px; min-width:120px; box-shadow:0 1px 2px rgba(0,0,0,0.07);}
.list-btn{background:white; border:1px solid #d1d7db; padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:12px; cursor:pointer; font-size:13px; min-width:200px; max-width:260px; white-space:nowrap; overflow:hidden;}
.second{flex:1;}
.arr{color:#667781; font-size:10px;}
.dd{position:absolute; left:0; top:42px; background:white; border:1px solid #d1d7db; border-radius:10px; z-index:300; min-width:220px; max-height:300px; overflow:auto; box-shadow:0 10px 30px rgba(0,0,0,0.15);}
.dd2{width:100%; min-width:100%;}
.dd button{width:100%; border:none; background:transparent; padding:10px 12px; text-align:left; display:flex; flex-direction:column; gap:2px; cursor:pointer; border-bottom:1px solid #f5f5f5;}
.dd button:hover{background:#f0f2f5;} .dd button.active{background:#e7fce3;}
.dd b{font-size:13px; color:#111b21;} .dd small{font-size:11px; color:#667781;}
.empty{padding:12px; font-size:13px; color:#667781;}
.data-box{background:white; border:1px solid #e9edef; border-radius:10px; padding:10px;}
.data-head{font-size:13px; font-weight:700; display:flex; justify-content:space-between; margin-bottom:8px;}
.data-head span{font-size:11px; color:#667781; font-weight:400;}
.grid{display:grid; grid-template-columns:1fr 1fr; gap:6px;}
.field{background:#f0f2f5; padding:6px 8px; border-radius:6px; display:flex; flex-direction:column;}
.fk{font-size:10px; color:#667781; text-transform:capitalize;} .fv{font-size:12px; font-weight:600;}
.actions{display:flex; gap:8px; margin-top:10px;}
.a-btn{background:#00a884; color:white; border:none; padding:6px 14px; border-radius:16px; font-size:12px; font-weight:700; cursor:pointer;}
.a-btn.sec{background:#e9edef; color:#111b21;}
@media(max-width:768px){.first-row{flex-direction:column; align-items:stretch;} .list-btn{max-width:100%;}}
</style>