<script lang="ts">
  import { calculateFormula } from "./formula.js";

  let { template, onClose, onSubmit } = $props();

  let values = $state<Record<string,any>>({});
  let errors = $state<Record<string,string>>({});

  let fields = $derived(template?.data?.fields || template?.fields || []);

  $effect(() => {
    if(fields.length > 0 && Object.keys(values).length === 0){
      const init: Record<string,any> = {};
      fields.forEach((f:any, i:number)=>{
        const k = f.name || f.id || f.label || `field_${i}`;
        if(f.type!=='formula') init[k] = '';
      });
      values = init;
    }
  });

  $effect(() => {
    JSON.stringify(values);
    fields.forEach((f:any, i:number)=>{
      const k = f.name || f.id || f.label || `field_${i}`;
      if(f.type==='formula' && f.formula){
        const res = calculateFormula(f.formula, values);
        if(res!==null){
          values[k] = res;
        }
      }
    });
  });

  function validate(){
    let ok=true;
    const newErrors: Record<string,string> = {};
    fields.forEach((f:any, i:number)=>{
      const k = f.name || f.id || f.label || `field_${i}`;
      if(f.required && (values[k]==='' || values[k]==null)){
        newErrors[k] = `${f.label || k} required`;
        ok=false;
      }
    });
    errors = newErrors;
    return ok;
  }

  function handleSubmit(){
    if(!validate()) return;
    onSubmit?.({ detail: { template, values: {...values} } });
  }
</script>

<div class="form-overlay">
  <div class="form-card">
    <div class="form-header">
      <h3>📋 {template.name}</h3>
      <button class="close" onclick={()=>onClose?.()}>✕</button>
    </div>
    <div class="form-body">
      {#each fields as field, i (field.id || field.name || field.label || i)}
        {@const key = field.name || field.id || field.label || `field_${i}`}
        <div class="field">
          <label for={key}>{field.label || key} {#if field.required}<span class="req">*</span>{/if}</label>

          {#if field.type==='select'}
            <select id={key} bind:value={values[key]}>
              <option value="">Select {field.label}</option>
              {#each field.options || [] as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          {:else if field.type==='formula'}
            <input id={key} type="text" value={values[key]? values[key]+'%' : ''} readonly disabled placeholder="Auto calculated" />
          {:else if field.type==='number'}
            <input id={key} type="number" bind:value={values[key]} placeholder={field.placeholder||''} />
          {:else}
            <input id={key} type="text" bind:value={values[key]} placeholder={field.placeholder||''} />
          {/if}

          {#if errors[key]}<span class="err">{errors[key]}</span>{/if}
        </div>
      {/each}
    </div>
    <div class="form-footer">
      <button class="btn-cancel" onclick={()=>onClose?.()}>Cancel</button>
      <button class="btn-send" onclick={handleSubmit}>Send Report</button>
    </div>
  </div>
</div>

<style>
.form-overlay{ width:380px; max-height:85vh; background:#111b21; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; border:1px solid #2a3942; }
.form-header{ display:flex; justify-content:space-between; align-items:center; padding:16px; border-bottom:1px solid #2a3942; background:#202c33; }
.form-header h3{ color:#e9edef; margin:0; font-size:16px; }
.close{ background:#2a3942; border:none; color:#e9edef; width:32px; height:32px; border-radius:50%; cursor:pointer; }
.form-body{ flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; }
.field{ display:flex; flex-direction:column; gap:6px; }
.field label{ color:#8696a0; font-size:13px; }
.req{ color:#f15c6d; }
.field input,.field select{ background:#2a3942; color:#e9edef; border:1px solid #374045; padding:10px 12px; border-radius:8px; outline:none; font-size:14px; }
.field input:focus,.field select:focus{ border-color:#00a884; }
.err{ color:#f15c6d; font-size:11px; }
.form-footer{ display:flex; gap:10px; padding:14px 16px; border-top:1px solid #2a3942; }
.btn-cancel{ flex:1; background:#2a3942; color:#e9edef; border:none; padding:12px; border-radius:8px; cursor:pointer; }
.btn-send{ flex:1; background:#00a884; color:#111b21; border:none; padding:12px; border-radius:8px; font-weight:700; cursor:pointer; }
</style>