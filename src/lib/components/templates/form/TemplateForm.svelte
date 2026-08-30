<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    export let template: any;
    const dispatch = createEventDispatcher();

    let fields: any[] = [];
    let values: any = {};
    let lastId = "";

    $: if (template?.id && template.id!== lastId) {
        lastId = template.id;
        let dataObj: any = {};
        if (typeof template.data === 'string') {
            try { dataObj = JSON.parse(template.data); } catch { dataObj = {}; }
        } else { dataObj = template.data || {}; }
        const raw = dataObj.fields || [];
        fields = raw;
        const last = dataObj.last_values || {};
        let init: any = {};
        raw.forEach((f:any)=>{ init[f.field_name] = last[f.field_name]?? f.default_value?? ""; });
        values = init;
        // calc once on open
        setTimeout(()=>liveCalc(), 50);
    }

    function getNum(key: string){
        let v = values[key]?? values[key.toLowerCase()]?? values[key.toLowerCase().replace(/\s+/g,"_")]?? "";
        if(v==="" && typeof document!=='undefined'){
            let el = document.getElementById(key) as HTMLInputElement;
            if(el) v = el.value;
        }
        let num = Number(String(v).replace(/[^0-9.\-]/g,''));
        return isNaN(num)? 0 : num;
    }

    function calcFormula(formulaStr: string){
        if(!formulaStr) return "0.00";
        try{
            let expr = formulaStr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/—/g,'-');
            expr = expr.replace(/\{([^}]+)\}/g, (_, k)=> String(getNum(k.trim())) );
            expr = expr.replace(/%/g,'').trim();
            if(/[^0-9+\-*/().\s]/.test(expr)) return "0.00";
            let r = Function('"use strict";return ('+expr+')')();
            if(r===undefined || isNaN(r) ||!isFinite(r)) return "0.00";
            return Number(r).toFixed(2);
        }catch{ return "0.00"; }
    }

    function liveCalc(){
        // called on every keystroke
        fields.forEach((f:any)=>{
            if((f.type==='formula' || f.field_type==='formula') && f.formula){
                let calc = calcFormula(f.formula);
                values[f.field_name] = calc;
                let el = document.getElementById(f.field_name) as HTMLInputElement;
                if(el) el.value = calc + " %";
            }
        });
        values = {...values};
    }

    function onInput(e: Event, f: any){
        let target = e.currentTarget as HTMLInputElement;
        values[f.field_name] = target.value;
        liveCalc(); // parallel calc
    }

    function send() {
        fields.forEach((f:any)=>{
            const el = document.getElementById(f.field_name) as HTMLInputElement;
            if (el && f.field_type!=='formula' && f.type!=='formula') {
                values[f.field_name] = el.value;
            }
        });
        fields.forEach((f:any)=>{
            if((f.type==='formula' || f.field_type==='formula') && f.formula){
                values[f.field_name] = calcFormula(f.formula);
            }
        });
        dispatch('submit', { template, fields, values: {...values} });
    }

    function parseOptions(optStr: string){
        try{ let arr = JSON.parse(optStr || "[]"); return Array.isArray(arr)?arr:[]; }
        catch{ return (optStr||"").split(',').map((s:string)=>s.trim()).filter(Boolean); }
    }
</script>

<div class="form-overlay">
  <div class="header"><h3>📋 {template.name}</h3><button on:click={()=>dispatch('close')}>✕</button></div>
  <div class="body">
    {#each fields as f}
      <div class="fg">
        <label>{f.label}</label>
        {#if f.field_type === 'dropdown' || f.type === 'dropdown'}
          <select id={f.field_name} value={values[f.field_name]} on:change={(e)=>onInput(e,f)}>
            <option value="">Select</option>
            {#each parseOptions(f.options) as opt}<option>{opt}</option>{/each}
          </select>
        {:else if f.field_type === 'formula' || f.type === 'formula'}
          <input id={f.field_name} type="text" readonly class="formula-input" value={calcFormula(f.formula) + " %"} />
        {:else}
          <input id={f.field_name} type="text" value={values[f.field_name]??""} placeholder={f.placeholder} on:input={(e)=>onInput(e,f)} />
        {/if}
      </div>
    {/each}
  </div>
  <div class="footer">
    <button on:click={()=>dispatch('close')}>Cancel</button>
    <button on:click={send}>Send Report</button>
  </div>
</div>

<style>
.form-overlay{ width:380px; max-width:95vw; max-height:85vh; background:#111b21; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; border:1px solid #2a3942; }
.header{ display:flex; justify-content:space-between; align-items:center; padding:16px; background:#202c33; color:#e9edef; }
.body{ padding:14px; display:flex; flex-direction:column; gap:12px; max-height:60vh; overflow:auto; }
.fg{ display:flex; flex-direction:column; gap:4px; }
.fg label{ color:#8696a0; font-size:12px; font-weight:600; }
.fg input,.fg select{ background:#e9edef; color:#111b21; border:1px solid #374045; padding:10px; border-radius:8px; outline:none; }
.formula-input{ background:#0a332c!important; color:#00a884!important; font-weight:800; text-align:center; border:2px solid #059669!important; font-size:17px; }
.footer{ display:flex; gap:10px; padding:14px; border-top:1px solid #2a3942; }
.footer button{ flex:1; padding:11px; border-radius:8px; border:none; cursor:pointer; }
.footer button:last-child{ background:#00a884; font-weight:700; color:#111b21; }
</style>