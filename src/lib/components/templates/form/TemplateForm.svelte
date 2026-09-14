<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    export let template: any;
    const dispatch = createEventDispatcher();

    let fields: any[] = [];
    let values: any = {};
    let lastId = "";
    let calculating = false;
    let valuesLowerMap: Map<string,string> = new Map();

    $: if (template?.id && template.id!== lastId) {
        lastId = template.id;
        let dataObj: any = {};
        if (typeof template.data === 'string') {
            try {
              dataObj = JSON.parse(template.data.slice(0,50000));
            } catch { dataObj = {}; }
        } else { dataObj = template.data || {}; }
        const raw = (dataObj.fields || dataObj.form_fields || template.fields || []).slice(0,100);
        fields = raw;
        const last = dataObj.last_values || {};
        let init: any = {};
        valuesLowerMap = new Map();
        raw.forEach((f:any)=>{
          let key = String(f.field_name||'').slice(0,100).trim();
          if(!key) return;
          let v = last[key]?? last[key?.toLowerCase()]?? last[key?.toUpperCase()]?? f.default_value?? f.defaultValue?? "";
          let sv = String(v).slice(0,500);
          init[key] = sv;
          // build lower map once for 50k speed
          valuesLowerMap.set(key.toLowerCase(), sv);
          valuesLowerMap.set(key.toLowerCase().replace(/\s+/g,"_"), sv);
        });
        values = init;
        setTimeout(()=>liveCalc(), 40);
    }

    function sanitizeKey(k:string): string{
      return String(k||'').slice(0,100).trim().replace(/[^a-zA-Z0-9_ \-]/g,'');
    }

    function getRaw(key: string): string {
        if(!key) return "";
        let k = sanitizeKey(key);
        if(!k) return "";
        if(values[k]!==undefined && values[k]!=="") return String(values[k]).slice(0,500);
        let lower = k.toLowerCase();
        if(valuesLowerMap.has(lower)) {
          const v = valuesLowerMap.get(lower);
          if(v) return v;
        }
        let under = lower.replace(/\s+/g,"_");
        if(valuesLowerMap.has(under)){
          const v = valuesLowerMap.get(under);
          if(v) return v;
        }
        // secure fuzzy only in map, not full scan
        return "";
    }

    function safeNum(key: string): number {
        let v = getRaw(key);
        let num = Number(String(v).replace(/[^0-9.\-]/g,'').slice(0,20));
        if(isNaN(num) ||!isFinite(num)) return 0;
        return Math.max(-1e9, Math.min(1e9, num));
    }

    function calcFormula(formulaStr: string): string {
        if(!formulaStr) return "0.00";
        try{
            let expr = String(formulaStr).slice(0,500)
             .replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/—/g,'-');
            // 50k secure: only allow {key}
            expr = expr.replace(/\{([^}]{1,100})\}/g, (_, k)=> {
              const clean = sanitizeKey(k.trim());
              if(!clean) return "0";
              return String(safeNum(clean));
            });
            expr = expr.replace(/%/g,'').trim();
            // high security regex
            if(!/^[0-9+\-*/().\s]+$/.test(expr) || expr.length>200 || expr.includes('**') || expr.length===0) return "0.00";
            // block consecutive operators
            if(/[\+\-\*\/]{2,}/.test(expr.replace(/\s/g,''))) return "0.00";
            let r = Function('"use strict";return ('+expr+')')();
            if(r===undefined ||!isFinite(r)) return "0.00";
            const nr = Number(r);
            if(nr>1e12 || nr<-1e12) return "0.00";
            return nr.toFixed(2);
        }catch{ return "0.00"; }
    }

    function liveCalc(){
        if(calculating) return;
        calculating = true;
        try{
          let next = {...values};
          let changed = false;
          for(let f of fields){
              if((f.type==='formula' || f.field_type==='formula') && f.formula){
                  let c = calcFormula(f.formula);
                  let key = String(f.field_name||'').slice(0,100);
                  if(next[key]!==c){ next[key]=c; changed=true; }
              }
          }
          if(changed){
            values = next;
            // rebuild map
            valuesLowerMap = new Map();
            for(let k of Object.keys(next)){
              const v = String(next[k]||'').slice(0,500);
              valuesLowerMap.set(k.toLowerCase(), v);
              valuesLowerMap.set(k.toLowerCase().replace(/\s+/g,"_"), v);
            }
          }
        }finally{
          calculating = false;
        }
    }

    function onInput(e: Event, f: any){
        let target = e.target as HTMLInputElement | HTMLSelectElement;
        let val = String(target.value||'').slice(0,500).replace(/[<>]/g,'');
        let key = String(f.field_name||'').slice(0,100).trim();
        if(!key) return;
        values[key] = val;
        // sync aliases for card
        const low = key.toLowerCase();
        const up = key.toUpperCase();
        const under = low.replace(/\s+/g,"_");
        values[low] = val;
        values[up] = val;
        values[under] = val;
        valuesLowerMap.set(low, val);
        valuesLowerMap.set(under, val);
        valuesLowerMap.set(up.toLowerCase(), val);
        values = {...values};
        liveCalc();
    }

    function send() {
        let finalValues: any = {};
        for(let f of fields){
            let key = String(f.field_name||'').slice(0,100).trim();
            if(!key) continue;
            if(f.type==='formula' || f.field_type==='formula'){
                finalValues[key] = calcFormula(f.formula);
            } else {
                let v = getRaw(key);
                finalValues[key] = String(v).slice(0,500).replace(/[<>]/g,'');
            }
        }
        // keep all aliases for bom1 card - secure
        for(let k of Object.keys(finalValues)){
            let v = String(finalValues[k]||'').slice(0,500).replace(/[<>]/g,'');
            let lk = k.toLowerCase().slice(0,100);
            finalValues[lk] = v;
            finalValues[k.toUpperCase().slice(0,100)] = v;
            finalValues[lk.replace(/\s+/g,"_")] = v;
        }
        // also include any typed values that are not in fields (station fix)
        for(let k of Object.keys(values)){
            const sk = String(k).slice(0,100);
            if(finalValues[sk]===undefined) finalValues[sk]=String(values[k]).slice(0,500).replace(/[<>]/g,'');
        }

        dispatch('submit', { template, fields, values: finalValues });
        dispatch('send', { template, values: finalValues });
    }

    function parseOptions(opt:any){
        if(!opt) return [];
        if(Array.isArray(opt)) return opt.slice(0,100).map((o:any)=>String(o).slice(0,100).trim().replace(/[<>]/g,'')).filter(Boolean);
        if(typeof opt === 'string'){
            const s = opt.trim().slice(0,2000);
            if(!s) return [];
            try{
                let p = JSON.parse(s);
                if(Array.isArray(p)) return p.slice(0,100).map((o:any)=>String(o).slice(0,100).trim().replace(/[<>]/g,'')).filter(Boolean);
            }catch{}
            return s.split(/[,;\n]+/).slice(0,100).map((x:string)=>x.trim().slice(0,100).replace(/[<>]/g,'')).filter(Boolean);
        }
        return [];
    }
</script>

<div class="form-overlay">
  <div class="header"><h3>📋 {(template?.name||'').toString().slice(0,100).replace(/[<>]/g,'')}</h3><button class="close-x" on:click={()=>dispatch('close')}>✕</button></div>
  <div class="body">
    {#each fields as f}
      <div class="fg">
        <label>{String(f.label || f.field_name||'').slice(0,100).replace(/[<>]/g,'')}</label>
        {#if f.field_type === 'dropdown' || f.type === 'dropdown'}
          <select value={getRaw(f.field_name)} on:change={(e)=>onInput(e,f)}>
            <option value="">Select</option>
            {#each parseOptions(f.options) as opt}<option value={opt} selected={getRaw(f.field_name)===opt}>{opt}</option>{/each}
          </select>
        {:else if f.field_type === 'formula' || f.type === 'formula'}
          <input type="text" readonly class="formula-input" value={(values[f.field_name]?? calcFormula(f.formula)) + " %"} />
        {:else}
          <input type="text" value={getRaw(f.field_name)} placeholder={String(f.placeholder || '').slice(0,100).replace(/[<>]/g,'')} on:input={(e)=>onInput(e,f)} maxlength="500" autocomplete="off" />
        {/if}
      </div>
    {/each}
  </div>
  <div class="footer">
    <button class="cancel" on:click={()=>dispatch('close')}>Cancel</button>
    <button class="send" on:click={send}>Send Report</button>
  </div>
</div>

<style>
.form-overlay{ width:380px; max-width:95vw; max-height:85vh; background:#111b21; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; border:1px solid #2a3942; }
.header{ display:flex; justify-content:space-between; align-items:center; padding:16px; background:#202c33; color:#e9edef; }
.close-x{ background:transparent; border:0; color:#e9edef; font-size:18px; cursor:pointer; }
.body{ padding:14px; display:flex; flex-direction:column; gap:12px; max-height:60vh; overflow:auto; }
.fg{ display:flex; flex-direction:column; gap:4px; }
.fg label{ color:#8696a0; font-size:12px; font-weight:600; }
.fg input,.fg select{ background:#e9edef; color:#111b21; border:1px solid #374045; padding:10px; border-radius:8px; outline:none; font-size:14px; }
.formula-input{ background:#0a332c!important; color:#00a884!important; font-weight:800; text-align:center; border:2px solid #059669!important; font-size:17px; }
.footer{ display:flex; gap:10px; padding:14px; border-top:1px solid #2a3942; }
.footer button{ flex:1; padding:11px; border-radius:8px; border:none; cursor:pointer; font-weight:600; }
.cancel{ background:#2a3942; color:#e9edef; }
.send{ background:#00a884; font-weight:700; color:#111b21; }
</style>