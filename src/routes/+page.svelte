<script lang="ts">
  import { onMount } from "svelte";
  import { supabaseTemplates } from '$lib/supabase';
  import type { Template, TemplateField } from '$lib/types';

  let templates: Template[] = [];
  let selectedTemplateId: string = '';
  $: selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;

  let formData: Record<string, any> = {};
  let previewValues: Record<string, any> = {};
  let shift: string = 'A';
  let station: string = '';
  let loading = false;
  let loadingTemplates = true;
  let message = '';
  let messageType: 'success' | 'error' = 'success';
  let previousTemplateId = '';

  let allFields: TemplateField[] = [];
  let stationOptions: string[] = [];
  let formFields: TemplateField[] = [];
  let computedFields: TemplateField[] = [];

  function normalizeFields(template: Template | null): TemplateField[] {
    if (!template) return [];
    return (template.data?.fields || []).map((f: any) => {
        let options: any[] = [];
        try {
            options = typeof f.options === 'string'? JSON.parse(f.options || '[]') : (f.options || []);
        } catch { options = []; }
        const formula = (f.formula || '').trim();
        return {
            name: f.field_name || f._key || f.name,
            label: f.label || f.field_name,
            type: f.field_type || f.type,
            options,
            required:!!f.required,
            default_value: f.default_value?? '',
            formula,
            computed: formula.length > 0 || f.field_type === 'formula'
        };
    });
  }

  // SAFE formula - no direct eval
  function evaluateFormula(formula: string, values: Record<string, any>): number {
    if (!formula) return 0;
    try {
        let expression = formula;
        Object.entries(values).forEach(([key, value]) => {
            const number = Number(value) || 0;
            const regex = new RegExp(`\\{${key}\\}`, 'gi');
            expression = expression.replace(regex, number.toString());
        });
        expression = expression.replace(/[^0-9+\-*/().% ]/g, '').replace(/%/g, '');
        if(!expression.trim()) return 0;
        // eslint-disable-next-line no-new-func
        const result = new Function(`return (${expression})`)();
        if (!isFinite(result)) return 0;
        return Number(Number(result).toFixed(2));
    } catch (err) {
        console.error('Formula Error', formula, err);
        return 0;
    }
  }

  onMount(async () => {
    loadingTemplates = true;
    const { data, error } = await supabaseTemplates.from("templates").select('*').order('name');
    if (error) {
      message = "Failed to load templates: " + error.message;
      messageType = 'error';
    } else {
      templates = data || [];
    }
    loadingTemplates = false;
  });

  $: allFields = normalizeFields(selectedTemplate);
  $: stationOptions = allFields.find(f => f.name.toLowerCase() === "station")?.options || [];
  $: formFields = allFields.filter(f => f.name.toLowerCase()!== "station" &&!f.computed);
  $: computedFields = allFields.filter(f => f.computed);

  $: if (selectedTemplate && previousTemplateId!== selectedTemplate.id) {
    previousTemplateId = selectedTemplate.id;
    const newData: Record<string, any> = {};
    const stationField = allFields.find((f) => f.name.toLowerCase() === 'station');
    station = stationField?.options?.[0] || '';
    formFields.forEach((field) => {
        newData[field.name] = field.type === 'number'? Number(field.default_value) || 0 : field.default_value || '';
    });
    formData = newData;
  }

  $: {
    const values: Record<string, any> = {};
    computedFields.forEach(field => {
        values[field.name] = field.formula? evaluateFormula(field.formula, {...formData,...values}) : 0;
    });
    previewValues = values;
  }

  async function handleSubmit() {
    if (loading ||!selectedTemplate) return;
    for (const field of formFields) {
        const value = formData[field.name];
        if (field.required && (value === "" || value === null || value === undefined || (field.type === "number" && isNaN(Number(value))))) {
            message = `${field.label} is required`; messageType = "error"; return;
        }
    }
    if (stationOptions.length &&!station) { message = "Please select Station"; messageType = "error"; return; }

    loading = true; message = "";
    const calculated: Record<string, any> = {};
    computedFields.forEach((field) => {
        calculated[field.name] = evaluateFormula(field.formula || "", {...formData,...calculated});
    });

    const payload = {
        reference_template_id: selectedTemplate.id,
        t_code: selectedTemplate.template_code,
        ts: new Date().toISOString(),
        shift, station,
        user_name: "guest-user-001",
        data: {...formData,...calculated }
    };

    try {
        const { error } = await supabaseTemplates.from("records").insert([payload]).select();
        if (error) throw error;
        message = "✅ Saved Successfully"; messageType = "success";
        const cleared: Record<string, any> = {};
        formFields.forEach(field => {
            cleared[field.name] = field.type === 'number'? Number(field.default_value) || 0 : field.default_value || "";
        });
        formData = cleared;
    } catch (err: any) {
        message = err.message || "Insert Failed"; messageType = "error";
    } finally {
        loading = false;
        setTimeout(() => message = "", 3000);
    }
}
</script>

<div class="page">
  <div class="header">
    <div class="brand">
      <img src="/logo.png" alt="VP TIPS" width="42" height="42" class="logo-img" />
      <div>
        <h1>VP TIPS</h1>
        <small>Tracking at Fingertips</small>
      </div>
    </div>
    <a href="/reports" class="btn-reports">📊 View Reports →</a>
  </div>

  <div class="card">
    <label for="template">Select Template</label>
    {#if loadingTemplates}
      <p>Loading templates...</p>
    {:else}
    <select id="template" bind:value={selectedTemplateId}>
      <option value="">-- Select Template --</option>
      {#each templates as t}
        <option value={t.id}>{t.icon} {t.name} v{t.data?.version || 1}</option>
      {/each}
    </select>
    {/if}

    {#if selectedTemplate}
      <div class="meta">
        <strong>Category:</strong> {selectedTemplate.category} |
        <strong>Desc:</strong> {selectedTemplate.description}
      </div>

      <div class="grid-2">
        <div>
          <label for="shift">Shift</label>
          <select id="shift" bind:value={shift}>
            <option value="A">Shift A</option><option value="B">Shift B</option><option value="C">Shift C</option>
          </select>
        </div>
        {#if stationOptions.length > 0}
        <div>
          <label for="station">Station</label>
          <select id="station" bind:value={station} required>
            <option value="">-- Select Station --</option>
            {#each stationOptions as s}<option value={s}>{s}</option>{/each}
          </select>
        </div>
        {/if}
      </div>

      <form on:submit|preventDefault={handleSubmit} class="form-fields">
        {#each formFields as field}
          <div>
            <label for={field.name}>{field.label} {field.required? '*' : ''}</label>
            {#if field.type === 'number'}
              <input id={field.name} type="number" step="any" bind:value={formData[field.name]} required={field.required} />
            {:else if field.type === 'dropdown'}
              <select id={field.name} bind:value={formData[field.name]} required={field.required}>
                <option value="">-- Select --</option>
                {#each field.options || [] as opt}<option value={opt}>{opt}</option>{/each}
              </select>
            {:else if field.type === 'textarea'}
              <textarea id={field.name} bind:value={formData[field.name]} rows="3" required={field.required}></textarea>
            {:else if field.type === 'date'}
              <input id={field.name} type="date" bind:value={formData[field.name]} required={field.required} />
            {:else}
              <input id={field.name} type="text" bind:value={formData[field.name]} required={field.required} />
            {/if}
          </div>
        {/each}

        {#if computedFields.length > 0}
          <div class="computed-preview">
            <h4>Calculated Values</h4>
            {#each computedFields as field}
              <div class="computed-row"><span>{field.label}:</span><strong>{previewValues[field.name]?? 0}</strong></div>
            {/each}
          </div>
        {/if}
        <button type="submit" disabled={loading ||!selectedTemplate} class="btn-submit">{loading? 'Saving...' : 'Submit Data'}</button>
      </form>
    {/if}
    {#if message}<div class="alert {messageType}">{message}</div>{/if}
  </div>
</div>

<style>
.page{padding:20px;background:#f8fafc;min-height:100vh;font-family:system-ui,sans-serif;box-sizing:border-box;}
.header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.brand{display:flex;align-items:center;gap:10px;}
.brand h1{margin:0;color:#1e293b;font-size:24px;line-height:1;}
.brand small{color:#64748b;font-size:12px;font-weight:600;letter-spacing:0.5px;}
.logo-img{border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.12);}
h1{margin:0;color:#1e293b;font-size:28px;}
.btn-reports{background:#16a34a;color:white;padding:10px 16px;border-radius:8px;font-weight:600;text-decoration:none;white-space:nowrap;}
.card{background:white;padding:24px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.08);max-width:850px;width:100%;margin:0 auto;box-sizing:border-box;}
label{display:block;margin-bottom:6px;font-weight:600;color:#374151;font-size:14px;}
select,input,textarea{width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:16px;box-sizing:border-box;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.meta{background:#eff6ff;padding:12px;border-radius:8px;margin:16px 0;color:#1e40af;font-size:14px;}
.computed-preview{background:#f0fdf4;border:1px dashed #16a34a;padding:12px;border-radius:8px;margin-bottom:16px;}
.computed-row{display:flex;justify-content:space-between;gap:10px;font-size:14px;margin:4px 0;flex-wrap:wrap;}
.btn-submit{width:100%;padding:12px;border:none;border-radius:8px;background:#2563eb;color:white;font-weight:700;font-size:16px;cursor:pointer;}
.btn-submit:disabled{opacity:.5;cursor:not-allowed;}
.alert{padding:12px;border-radius:8px;margin-top:16px;text-align:center;font-weight:600;}
.alert.success{background:#dcfce7;color:#166534;}
.alert.error{background:#fee2e2;color:#dc2626;}
@media (max-width:600px){.page{padding:10px;}.grid-2{grid-template-columns:1fr;}.header{flex-direction:column;align-items:stretch;}}
</style>