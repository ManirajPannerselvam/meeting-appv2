<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    export let fields: any[] = [];
    export let values: Record<string, any> = {};

    const dispatch = createEventDispatcher();

    onMount(()=>{
        let init: Record<string,any> = {...values};
        for(let f of fields){
            if(init[f.field_name] === undefined) init[f.field_name] = "";
        }
        if(Object.keys(init).length!== Object.keys(values).length){
            values = init;
            dispatch('update', values);
        }
    });

    function parseOptions(field: any) {
        if (Array.isArray(field.options)) return field.options;
        if (typeof field.options === 'string') {
            try {
                const p = JSON.parse(field.options);
                return Array.isArray(p)? p : [];
            } catch {
                return field.options.split(',').map((s:string)=>s.trim()).filter(Boolean);
            }
        }
        return [];
    }

    function evaluateFormula(formulaStr: string, vals: Record<string,any>): string {
        if(!formulaStr) return "0.00";
        try {
            let expr = formulaStr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/—/g, '-');
            expr = expr.replace(/\{([^}]+)\}/g, (_, key) => {
                let k = key.trim();
                let v = vals[k]?? vals[k.toLowerCase()]?? vals[k.toLowerCase().replace(/\s+/g,"_")];
                if(v === undefined || v === "" || v === null) return "0";
                let num = Number(String(v).replace(/[^0-9.\-]/g,''));
                return isNaN(num)? "0" : String(num);
            });
            expr = expr.replace(/%/g, '');
            if(/[^0-9+\-*/().\s]/.test(expr)) return "0.00";
            let result = Function('"use strict"; return (' + expr + ')')();
            if(result === undefined || isNaN(result) ||!isFinite(result)) return "0.00";
            return Number(result).toFixed(2);
        } catch {
            return "0.00";
        }
    }

    function getFormulaValue(field: any): string {
        let raw = field.formula || field.expression || field.calculation || "";
        if(!raw) return values[field.field_name]?? "0.00";
        if(typeof raw === 'string' && raw.includes('{')){
          return evaluateFormula(raw, values);
        }
        return values[field.field_name]?? "0.00";
    }

    $: {
        for(let f of fields){
            if(f.field_type === "formula"){
                let val = getFormulaValue(f);
                if(values[f.field_name]!== val){
                    values[f.field_name] = val;
                    values = values;
                    dispatch('update', values);
                }
            }
        }
    }

    function update(field: any, val: any) {
        values[field.field_name] = val;
        values = values;
        dispatch('update', values);
        dispatch('change', { field: field.field_name, value: val, all: values });
        console.log("Updated", field.field_name, "=", val, "ALL:", values);
    }
</script>

<div class="form-renderer">
{#each fields as field (field.field_name)}
<div class="group">
<label>{field.label} {#if field.required}<span class="req">*</span>{/if}</label>

{#if field.field_type === "text"}
<input type="text" value={values[field.field_name]?? ""} placeholder={field.placeholder || ''} autocomplete="off" on:input={(e)=>update(field, e.currentTarget.value)} />
{:else if field.field_type === "number"}
<input type="text" inputmode="numeric" pattern="[0-9]*" value={values[field.field_name]?? ""} placeholder={field.placeholder || '0'} autocomplete="off" on:input={(e)=>{
    let v = e.currentTarget.value.replace(/[^0-9]/g,'');
    e.currentTarget.value = v;
    update(field, v);
  }} />
{:else if field.field_type === "textarea"}
<textarea rows="3" value={values[field.field_name]?? ""} placeholder={field.placeholder || ''} on:input={(e)=>update(field, e.currentTarget.value)}></textarea>
{:else if field.field_type === "dropdown"}
<select value={values[field.field_name]?? ""} on:change={(e)=>update(field, e.currentTarget.value)}>
<option value="">Select...</option>
{#each parseOptions(field) as opt}<option value={opt}>{opt}</option>{/each}
</select>
{:else if field.field_type === "formula"}
<input class="formula" readonly value={getFormulaValue(field) + " %"} />
{:else}
<input type="text" value={values[field.field_name]?? ""} on:input={(e)=>update(field, e.currentTarget.value)} />
{/if}
</div>
{/each}
</div>

<style>
.form-renderer{ display:flex; flex-direction:column; gap:12px; }
.group{ display:flex; flex-direction:column; gap:5px; }
.group label{ color:#8696a0; font-size:12px; font-weight:600; }
.req{ color:#f15c6d; }
input,select,textarea{ width:100%; padding:12px 10px; background:#2a3942; color:#e9edef!important; border:1px solid #374045; border-radius:8px; outline:none; font-size:16px; pointer-events:auto!important; user-select:text!important; -webkit-user-select:text!important; }
input:focus,select:focus,textarea:focus{ border-color:#00a884; }
.formula{ background:#0a332c; color:#00a884!important; font-weight:800; text-align:center; }
</style>