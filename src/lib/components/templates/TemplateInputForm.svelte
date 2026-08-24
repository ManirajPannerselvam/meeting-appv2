<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let template: any;
    const dispatch = createEventDispatcher();
    
    let fields: any[] = [];
    let values: Record<string, any> = {};
    let loading = false;
    let sending = false;
    let currentTemplateId = "";

    // Parse fields from template.data (no API call needed)
    $: if (template?.id && template.id !== currentTemplateId) {
        currentTemplateId = template.id;
        loadFromTemplate();
    }

    function loadFromTemplate() {
        loading = true;
        try {
            let dataObj: any = {};
            if (typeof template.data === 'string') {
                try { dataObj = JSON.parse(template.data); } catch { dataObj = {}; }
            } else {
                dataObj = template.data || {};
            }
            
            const raw = dataObj.fields || template.fields || [];
            fields = raw.map((f:any, i:number) => ({
                ...f,
                field_name: (f.field_name || f.name || `field_${i}`).trim(),
                field_label: f.label || f.field_label || f.field_name || `Field ${i+1}`,
                label: f.label || f.field_label || f.field_name,
                field_type: f.field_type || f.type || "text",
                required: f.required || false,
                default_value: f.default_value ?? ""
            }));

            // Init values from last_values
            const lastValues = dataObj.last_values || {};
            const init: any = {};
            fields.forEach(f => {
                init[f.field_name] = lastValues[f.field_name] ?? f.default_value ?? "";
            });
            values = init;
            console.log("LOADED:", fields.map(f=>f.field_name), values);
        } finally {
            loading = false;
        }
    }

    function updateValue(field: any, e: Event) {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        values = { ...values, [field.field_name]: target.value };
    }

    function send() {
        if (sending) return;
        // validation
        for (const f of fields) {
            if (f.required && (values[f.field_name] === "" || values[f.field_name] == null)) {
                alert(`${f.field_label} is required`);
                return;
            }
        }
        sending = true;
        try {
            // FIX: dispatch 'submit' with template + fields + values
            dispatch('submit', { 
                template, 
                fields, 
                values: JSON.parse(JSON.stringify(values))
            });
            console.log("DISPATCHED submit:", values);
        } finally {
            sending = false;
        }
    }

    function cancel() {
        dispatch('close');
    }
</script>

<div class="form-overlay">
  <div class="form-header">
    <h3>📋 {template?.name || 'Report'}</h3>
    <button class="close" on:click={cancel}>✕</button>
  </div>

  <div class="form-body">
    {#if loading}
      <p class="loading">Loading...</p>
    {:else if fields.length === 0}
      <p class="loading">No fields in template</p>
    {:else}
      {#each fields as field}
        {@const type = (field.field_type || "text").toLowerCase()}
        <div class="field">
          <label>{field.field_label}{#if field.required}<span class="req">*</span>{/if}</label>
          
          {#if type === 'textarea'}
            <textarea value={values[field.field_name] ?? ""} on:input={(e)=>updateValue(field,e)} placeholder={field.field_label}></textarea>
          {:else if type === 'dropdown' || type === 'select'}
            <select value={values[field.field_name] ?? ""} on:change={(e)=>updateValue(field,e)}>
              <option value="">Select {field.field_label}</option>
              {#each (Array.isArray(field.options) ? field.options : (()=>{try{return JSON.parse(field.options||"[]")}catch{return []}})()) as opt}
                <option value={typeof opt === 'string' ? opt : opt.value || opt.label}>{typeof opt === 'string' ? opt : opt.label || opt.value}</option>
              {/each}
            </select>
          {:else if type === 'number'}
            <input type="text" inputmode="numeric" value={values[field.field_name] ?? ""} on:input={(e)=>updateValue(field,e)} placeholder={field.field_label} />
          {:else}
            <input type="text" value={values[field.field_name] ?? ""} on:input={(e)=>updateValue(field,e)} placeholder={field.field_label} />
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <div class="form-footer">
    <button class="btn-cancel" on:click={cancel} disabled={sending}>Cancel</button>
    <button class="btn-send" on:click={send} disabled={loading || sending}>{#if sending}Sending...{:else}Send Report{/if}</button>
  </div>
</div>

<style>
.form-overlay{ width:380px; max-width:95vw; max-height:85vh; background:#111b21; border-radius:12px; display:flex; flex-direction:column; overflow:hidden; border:1px solid #2a3942; }
.form-header{ display:flex; justify-content:space-between; align-items:center; padding:16px; border-bottom:1px solid #2a3942; background:#202c33; }
.form-header h3{ color:#e9edef; margin:0; font-size:15px; }
.close{ background:#2a3942; border:none; color:#e9edef; width:30px; height:30px; border-radius:50%; cursor:pointer; }
.form-body{ flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:12px; }
.loading{ color:#8696a0; text-align:center; padding:20px; }
.field{ display:flex; flex-direction:column; gap:5px; }
.field label{ color:#8696a0; font-size:12px; font-weight:600; }
.req{ color:#f15c6d; margin-left:4px; }
.field input,.field textarea,.field select{ width:100%; padding:10px; background:#2a3942; color:#e9edef; border:1px solid #374045; border-radius:8px; outline:none; }
.field input:focus,.field textarea:focus,.field select:focus{ border-color:#00a884; }
.form-footer{ display:flex; gap:10px; padding:14px; border-top:1px solid #2a3942; }
.btn-cancel{ flex:1; background:#2a3942; color:#e9edef; border:none; padding:11px; border-radius:8px; cursor:pointer; }
.btn-send{ flex:1; background:#00a884; color:#111b21; border:none; padding:11px; border-radius:8px; font-weight:700; cursor:pointer; }
</style>