<script lang="ts">
    export let fields: any[] = [];
    export let values: Record<string, any> = {};

    function parseOptions(field: any) {
        if (Array.isArray(field.options)) return field.options;
        if (typeof field.options === 'string') {
            try { 
                const p = JSON.parse(field.options);
                return Array.isArray(p) ? p : [];
            } catch { 
                return field.options.split(',').map((s:string)=>s.trim()).filter(Boolean); 
            }
        }
        return [];
    }

    function update(field: any, val: any) {
        // Force reactivity
        values = { ...values, [field.field_name]: val };
        console.log("Updated", field.field_name, "=", val, "ALL:", values);
    }
</script>

<div class="form-renderer">
{#each fields as field (field.field_name)}
<div class="group">
<label>{field.label} {#if field.required}<span class="req">*</span>{/if}</label>

{#if field.field_type === "text"}
<input type="text" value={values[field.field_name] ?? ""} placeholder={field.placeholder || ''} on:input={(e)=>update(field, e.currentTarget.value)} />

{:else if field.field_type === "number"}
<input type="text" inputmode="numeric" value={values[field.field_name] ?? ""} placeholder={field.placeholder || '0'} on:input={(e)=>update(field, e.currentTarget.value)} />

{:else if field.field_type === "textarea"}
<textarea rows="3" value={values[field.field_name] ?? ""} placeholder={field.placeholder || ''} on:input={(e)=>update(field, e.currentTarget.value)}></textarea>

{:else if field.field_type === "dropdown"}
<select value={values[field.field_name] ?? ""} on:change={(e)=>update(field, e.currentTarget.value)}>
<option value="">Select...</option>
{#each parseOptions(field) as opt}<option value={opt}>{opt}</option>{/each}
</select>

{:else if field.field_type === "formula"}
<input class="formula" readonly value={values[field.field_name] ?? "0.00"} />

{:else}
<input type="text" value={values[field.field_name] ?? ""} on:input={(e)=>update(field, e.currentTarget.value)} />
{/if}
</div>
{/each}
</div>

<style>
.form-renderer{ display:flex; flex-direction:column; gap:12px; }
.group{ display:flex; flex-direction:column; gap:5px; }
.group label{ color:#8696a0; font-size:12px; font-weight:600; }
.req{ color:#f15c6d; }
input,select,textarea{ width:100%; padding:10px; background:#2a3942; color:#e9edef; border:1px solid #374045; border-radius:8px; outline:none; font-size:14px; }
input:focus,select:focus,textarea:focus{ border-color:#00a884; }
.formula{ background:#0a332c; color:#00a884; font-weight:700; }
</style>