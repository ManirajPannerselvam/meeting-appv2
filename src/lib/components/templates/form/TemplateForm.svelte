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
        raw.forEach((f:any)=>{
            init[f.field_name] = last[f.field_name]?? f.default_value?? "";
        });
        values = init;
    }

    function send() {
        fields.forEach((f:any)=>{
            const el = document.getElementById(f.field_name) as HTMLInputElement;
            if (el) values[f.field_name] = el.value;
        });
        dispatch('submit', { template, fields, values: {...values} });
    }
</script>

<div class="form-overlay">
  <div class="header"><h3>📋 {template.name}</h3><button on:click={()=>dispatch('close')}>✕</button></div>
  <div class="body">
    {#each fields as f}
      <div class="fg">
        <label>{f.label}</label>
        {#if f.field_type === 'dropdown'}
          <select id={f.field_name} bind:value={values[f.field_name]}>
            <option value="">Select</option>
            {#each JSON.parse(f.options || "[]") as opt}<option>{opt}</option>{/each}
          </select>
        {:else}
          <input id={f.field_name} type="text" bind:value={values[f.field_name]} placeholder={f.placeholder} />
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
.fg input,.fg select{ background:#2a3942; color:#e9edef; border:1px solid #374045; padding:10px; border-radius:8px; outline:none; }
.footer{ display:flex; gap:10px; padding:14px; border-top:1px solid #2a3942; }
.footer button{ flex:1; padding:11px; border-radius:8px; border:none; cursor:pointer; }
.footer button:last-child{ background:#00a884; font-weight:700; color:#111b21; }
</style>