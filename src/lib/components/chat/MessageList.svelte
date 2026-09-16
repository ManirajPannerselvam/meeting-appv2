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

  function formatTime(d:string){ try{ return new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});}catch{return '';} }
  function safe(s:string){ return String(s||'').slice(0,120).replace(/[<>]/g,''); }

  function getVal(obj:any,...keys:string[]){
    if(!obj) return "";
    const lower:Record<string,string>={}; for(let k of Object.keys(obj)) lower[k.toLowerCase().replace(/[^a-z0-9]/g,'')] = k;
    for(let k of keys){
      if(obj[k]!=null && obj[k]!=="") return obj[k];
      const lk=k.toLowerCase().replace(/[^a-z0-9]/g,'');
      if(lower[lk] && obj[lower[lk]]!=="") return obj[lower[lk]];
      const found=Object.keys(obj).find(x=> x.toLowerCase().includes(lk) || lk.includes(x.toLowerCase().replace(/[^a-z0-9]/g,'')));
      if(found && obj[found]!=="") return obj[found];
    }
    return "";
  }

  function parseTemplate(c:string){
    if(!c?.includes('__TEMPLATE_DATA__')) return null;
    try{
      const [head, jsonPart] = c.split('__TEMPLATE_DATA__');
      const raw = JSON.parse(jsonPart.trim().slice(0,8000));
      const src = raw.values || raw.data || raw;
      const sources = [src, raw];
      let station="", input="", output="", yieldV="";
      for(let s of sources){
        if(!station) station=getVal(s,'Station','station','S-OTA','A-OTA','station_name');
        if(!input) input=getVal(s,'Input','input','input01','Enter_Input');
        if(!output) output=getVal(s,'Output','output','output01','Enter_Output');
        if(!yieldV) yieldV=getVal(s,'Yield','yield','yield_percent');
      }
      const nI=Number(String(input).replace(/[^0-9.-]/g,''))||0;
      const nO=Number(String(output).replace(/[^0-9.-]/g,''))||0;
      let nY=Number(String(yieldV).replace(/[^0-9.-]/g,''))||0;
      if(!nY && nI>0) nY=(nO/nI)*100;
      return {
        data:{
          station:String(station||'RAT').slice(0,20),
          input:nI, output:nO,
          yield_percent:Number(nY.toFixed(1)),
          template_name:String(raw.template_name||'Daily Yield').slice(0,30),
          template_code:String(raw.template_code||'PRO01').slice(0,12),
          values:src, _raw:raw
        }
      };
    }catch{return null;}
  }

  const cache=new Map<string,any>();
  function getParsed(msg:any){
    if(cache.has(msg.id)) return cache.get(msg.id);
    const tpl=parseTemplate(msg.content||'');
    const r={tpl}; cache.set(msg.id,r);
    if(cache.size>80) cache.delete(cache.keys().next().value);
    return r;
  }
  onDestroy(()=>cache.clear());

  let list=$derived.by(()=>{
    const seen=new Set(); const out=[];
    for(let m of messages||[]){ if(!m?.id ||!seen.has(m.id)){ if(m.id) seen.add(m.id); out.push(m);} }
    return out.slice(-20);
  });
</script>

<div class="wrap">
{#each list as msg (msg.id)}
  {@const p=getParsed(msg)}
  {@const own=msg.is_own || msg.sender_id===currentUser?.id}
  <div class="row" class:own={own}>
    <div class="bubble" class:own={own}>
      {#if p.tpl}
        <div class="yield">
          <div class="y-head">
            <span class="y-icon">📋</span>
            <span class="y-title">{safe(p.tpl.data.template_name)}</span>
            <span class="y-badge">{p.tpl.data.yield_percent}%</span>
          </div>
          <div class="y-grid">
            <div class="y-row"><span>Station</span><b>{safe(p.tpl.data.station)}</b></div>
            <div class="y-row"><span>Input</span><b>{p.tpl.data.input}</b></div>
            <div class="y-row"><span>Output</span><b>{p.tpl.data.output}</b></div>
            <div class="y-row"><span>Yield</span><b class="green">{p.tpl.data.yield_percent}%</b></div>
          </div>
          <button class="view-btn" onclick={(e)=>{ e.stopPropagation(); onOpenDetail({detail:{template:p.tpl.data, message:msg}}); }}>
            View Details
          </button>
        </div>
      {:else}
        <div class="text">{safe(msg.content||'').split('__')[0]}</div>
      {/if}
      <div class="meta"><span>{formatTime(msg.created_at)}</span>{#if own}<span class="tick">✓✓</span>{/if}</div>
    </div>
  </div>
{:else}
  <div class="empty">No messages - 20 max</div>
{/each}
</div>

<style>
.wrap{display:flex;flex-direction:column;gap:6px;padding:8px 8px 12px;}
.row{display:flex; width:100%;}
.row.own{justify-content:flex-end;}
.bubble{max-width:76%; background:#202c33; border-radius:12px; border-top-left-radius:0; padding:0; overflow:hidden; box-shadow:0 1px 1px rgba(0,0,0,.15);}
.bubble.own{background:#005c4b; border-top-left-radius:12px; border-top-right-radius:0;}
.text{padding:7px 10px; font-size:13px; color:#e9edef; line-height:1.35; white-space:pre-wrap; word-break:break-word;}
.yield{background:#111b21; margin:0; padding:0; width:240px;}
.y-head{display:flex; align-items:center; gap:6px; padding:8px 10px; background:#1a242c; border-bottom:1px solid #222d34;}
.y-icon{font-size:13px;}.y-title{flex:1; font-size:12px; font-weight:700; color:#e9edef; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.y-badge{background:#00a884; color:#fff; font-size:10px; font-weight:800; padding:2px 7px; border-radius:20px;}
.y-grid{padding:8px 10px; display:flex; flex-direction:column; gap:4px;}
.y-row{display:flex; justify-content:space-between; font-size:11.5px;}
.y-row span{color:#8696a0;}.y-row b{color:#e9edef; font-weight:600;}
.y-row b.green{color:#25d366; font-weight:800;}
.view-btn{width:calc(100% - 16px); margin:0 8px 8px; background:#00a884; color:#fff; border:none; padding:8px; border-radius:20px; font-size:11px; font-weight:700; cursor:pointer; letter-spacing:.2px;}
.view-btn:active{transform:scale(.97); filter:brightness(.95);}
.meta{display:flex; justify-content:flex-end; gap:4px; padding:2px 8px 4px; font-size:9px; color:#8696a0;}
.tick{color:#53bdeb; font-size:10px;}
.empty{text-align:center; color:#667781; font-size:11px; padding:30px;}
@media(max-width:768px){.bubble{max-width:84%;}.yield{width:210px;}}
</style>