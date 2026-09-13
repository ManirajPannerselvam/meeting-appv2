<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import type { Template, TemplateField } from '$lib/types';

  let templates: Template[] = [];
  let selectedTemplateId: string = '';
  let selectedTemplate = $derived(templates.find(t => t.id === selectedTemplateId) || null);

  let formData: Record<string, any> = $state({});
  let previewValues: Record<string, any> = $state({});
  let shift: string = $state('A');
  let station: string = $state('');
  let loading = $state(false);
  let loadingTemplates = $state(true);
  let message = $state('');
  let messageType: 'success' | 'error' = $state('success');
  let previousTemplateId = $state('');

  let allFields = $derived(normalizeFields(selectedTemplate));
  let stationOptions = $derived(allFields.find(f => f.name.toLowerCase() === "station")?.options || []);
  let formFields = $derived(allFields.filter(f => f.name.toLowerCase()!== "station" &&!f.computed));
  let computedFields = $derived(allFields.filter(f => f.computed));

  let activeTab = $state('report');

  let startX = $state(0);
  let startY = $state(0);
  const tabs = ['/chat', '/reports', '/settings'] as const;

  function onTouchStart(e: TouchEvent){
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }
  function onTouchEnd(e: TouchEvent){
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if(Math.abs(dy) > Math.abs(dx)) return;
    if(Math.abs(dx) < 80) return;
    let idx = activeTab==='chat'?0: activeTab==='report'?1:2;
    if(dx < 0) goto(tabs[(idx + 1) % tabs.length]);
    else goto(tabs[(idx - 1 + tabs.length) % tabs.length]);
  }

  function sanitizeStr(s:any, max=120){
    if(typeof s!=='string') return '';
    return s.replace(/[<>`$]/g,'').trim().slice(0,max);
  }

  function normalizeFields(template: Template | null): TemplateField[] {
    if (!template) return [];
    return (template.data?.fields || []).map((f: any) => {
        let options: any[] = [];
        try { options = typeof f.options === 'string'? JSON.parse(f.options || '[]') : (f.options || []); } catch { options = []; }
        const safeOptions = Array.isArray(options)? options.map(o=>sanitizeStr(String(o),50)).slice(0,100) : [];
        const formula = (f.formula || '').toString().slice(0,200).trim();
        return {
            name: sanitizeStr(f.field_name || f._key || f.name,50),
            label: sanitizeStr(f.label || f.field_name,80),
            type: (f.field_type || f.type || 'text').toString().slice(0,20),
            options: safeOptions,
            required:!!f.required,
            default_value: typeof f.default_value==='string'? sanitizeStr(f.default_value,100) : f.default_value?? '',
            formula,
            computed: formula.length > 0 || f.field_type === 'formula'
        } as any;
    });
  }

  function evaluateFormula(formula: string, values: Record<string, any>): number {
    if (!formula || formula.length>200) return 0;
    try {
        let expression = formula;
        // only allow known keys
        for(const [key, value] of Object.entries(values)){
          if(!/^[a-zA-Z0-9_]+$/.test(key)) continue;
          const number = Number(value);
          const safeNum = isFinite(number)? Math.max(-1e9, Math.min(1e9, number)) : 0;
          const regex = new RegExp(`\\{${key}\\}`, 'gi');
          expression = expression.replace(regex, safeNum.toString());
        }
        // SECURE: only numbers and operators left
        if(!/^[0-9+\-*/().% ]+$/.test(expression)) return 0;
        expression = expression.replace(/%/g, '');
        if(!expression.trim()) return 0;
        // block long or nested
        if(expression.length>120 || expression.includes('**')) return 0;
        const result = Function(`"use strict"; return (${expression})`)();
        if (!isFinite(result)) return 0;
        return Number(Number(result).toFixed(2));
    } catch { return 0; }
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if(!session){ goto('/login'); return; }
    loadingTemplates = true;
    try{
      const { data, error } = await supabase.from("templates").select('id,name,description,category,template_code,data').order('name').limit(200);
      if (error) { message = "Failed: " + sanitizeStr(error.message,100); messageType = 'error'; } else { templates = (data as any) || []; }
    } finally { loadingTemplates = false; }
  });

  $effect(()=>{
    if (selectedTemplate && previousTemplateId!== selectedTemplate.id) {
      previousTemplateId = selectedTemplate.id;
      const newData: Record<string, any> = {};
      const stationField = allFields.find((f) => f.name.toLowerCase() === 'station');
      station = sanitizeStr(stationField?.options?.[0] || '',50);
      formFields.forEach((field) => { newData[field.name] = field.type === 'number'? Number(field.default_value) || 0 : field.default_value || ''; });
      formData = newData;
    }
  });

  $effect(()=>{
    const values: Record<string, any> = {};
    computedFields.forEach(field => { values[field.name] = field.formula? evaluateFormula(field.formula, {...formData,...values}) : 0; });
    previewValues = values;
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (loading ||!selectedTemplate) return;
    for (const field of formFields) {
        const value = formData[field.name];
        if (field.required && (value === "" || value === null || value === undefined)) {
            message = `${sanitizeStr(field.label,30)} is required`; messageType = "error"; return;
        }
    }
    if (stationOptions.length &&!station) { message = "Please select Station"; messageType = "error"; return; }

    loading = true; message = "";
    const calculated: Record<string, any> = {};
    computedFields.forEach((field) => { calculated[field.name] = evaluateFormula(field.formula || "", {...formData,...calculated}); });

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user){ goto('/login'); return; }
        const { data: reportData, error } = await supabase.from("template_reports").insert([{
            template_id: selectedTemplate.id.slice(0,100),
            template_version: Number(selectedTemplate.data?.version) || 1,
            sender: user.id,
            room_id: 'factory-floor',
            report_date: new Date().toISOString(),
            values: {...formData,...calculated, shift: sanitizeStr(shift,10), station: sanitizeStr(station,50), t_code: sanitizeStr(selectedTemplate.template_code||'',30) },
            created_at: new Date().toISOString()
        }]).select('id').single();
        if (error) throw error;
        await supabase.from("messages").insert([{
            sender_id: user.id,
            room_id: 'factory-floor',
            type: 'template',
            report_id: String(reportData.id),
            content: `📋 ${sanitizeStr(selectedTemplate.name,50)} - ${sanitizeStr(station,20)} / Shift ${sanitizeStr(shift,5)}`,
            created_at: new Date().toISOString()
        }]);
        message = "✅ Saved + Shared to chat"; messageType = "success";
        const cleared: Record<string, any> = {};
        formFields.forEach(field => { cleared[field.name] = field.type === 'number'? Number(field.default_value) || 0 : field.default_value || ""; });
        formData = cleared;
    } catch (err: any) { message = sanitizeStr(err.message || "Insert Failed",100); messageType = "error"; }
    finally { loading = false; setTimeout(() => message = "", 3000); }
  }

  function goTab(tab: string){
    if(tab === 'chat') goto('/chat');
    if(tab === 'report') goto('/reports');
    if(tab === 'user') goto('/settings');
  }
</script>

<div class="page" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
  <div class="header">
    <div class="brand">
      <img src="/logo.png" alt="VP TIPS" width="42" height="42" class="logo-img" />
      <div><h1>VP TIPS</h1><small>Tracking at Fingertips</small></div>
    </div>
    <a href="/chat" class="btn-reports">💬 Chat →</a>
  </div>

  <div class="card">
    <label for="template">Select Template</label>
    {#if loadingTemplates}
      <p>Loading templates...</p>
    {:else}
    <select id="template" bind:value={selectedTemplateId}>
      <option value="">-- Select Template --</option>
      {#each templates as t}<option value={t.id}>{sanitizeStr(t.icon||'📋',5)} {sanitizeStr(t.name,50)} v{t.data?.version || 1}</option>{/each}
    </select>
    {/if}

    {#if selectedTemplate}
      <div class="meta"><strong>Category:</strong> {sanitizeStr(selectedTemplate.category,30)} | <strong>Desc:</strong> {sanitizeStr(selectedTemplate.description,100)}</div>
      <div class="grid-2">
        <div><label for="shift">Shift</label><select id="shift" bind:value={shift}><option value="A">Shift A</option><option value="B">Shift B</option><option value="C">Shift C</option></select></div>
        {#if stationOptions.length > 0}<div><label for="station">Station</label><select id="station" bind:value={station} required><option value="">-- Select Station --</option>{#each stationOptions as s}<option value={s}>{s}</option>{/each}</select></div>{/if}
      </div>

      <form onsubmit={handleSubmit} class="form-fields">
        {#each formFields as field}
          <div>
            <label for={field.name}>{field.label} {field.required? '*' : ''}</label>
            {#if field.type === 'number'}<input id={field.name} type="number" step="any" bind:value={formData[field.name]} required={field.required} inputmode="decimal" />
            {:else if field.type === 'dropdown'}<select id={field.name} bind:value={formData[field.name]} required={field.required}><option value="">-- Select --</option>{#each field.options || [] as opt}<option value={opt}>{opt}</option>{/each}</select>
            {:else if field.type === 'textarea'}<textarea id={field.name} bind:value={formData[field.name]} rows="3" required={field.required} maxlength="500"></textarea>
            {:else if field.type === 'date'}<input id={field.name} type="date" bind:value={formData[field.name]} required={field.required} />
            {:else}<input id={field.name} type="text" bind:value={formData[field.name]} required={field.required} maxlength="200" />{/if}
          </div>
        {/each}
        {#if computedFields.length > 0}<div class="computed-preview"><h4>Calculated Values</h4>{#each computedFields as field}<div class="computed-row"><span>{field.label}:</span><strong>{previewValues[field.name]?? 0}</strong></div>{/each}</div>{/if}
        <button type="submit" disabled={loading ||!selectedTemplate} class="btn-submit">{loading? 'Saving...' : 'Submit Data'}</button>
      </form>
    {/if}
    {#if message}<div class="alert {messageType}" role="alert">{message}</div>{/if}
  </div>

  <nav class="bottom-nav">
    <button class:active={activeTab==='chat'} onclick={()=>goTab('chat')}>💬<small>Chat</small></button>
    <button class:active={activeTab==='report'} onclick={()=>goTab('report')}>📋<small>Report</small></button>
    <button class:active={activeTab==='user'} onclick={()=>goTab('user')}>👤<small>User</small></button>
  </nav>
</div>

<style>
.page{padding:20px 20px 90px 20px;background:#f8fafc;min-height:100dvh;font-family:system-ui,sans-serif;box-sizing:border-box;touch-action:pan-y;}
.header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
.brand{display:flex;align-items:center;gap:10px;}
.brand h1{margin:0;color:#1e293b;font-size:24px;line-height:1;}
.brand small{color:#64748b;font-size:12px;font-weight:600;letter-spacing:0.5px;}
.logo-img{border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.12);}
.btn-reports{background:#00a884;color:white;padding:10px 16px;border-radius:8px;font-weight:600;text-decoration:none;white-space:nowrap;}
.card{background:white;padding:24px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.08);max-width:850px;width:100%;margin:0 auto;box-sizing:border-box;}
label{display:block;margin-bottom:6px;font-weight:600;color:#374151;font-size:14px;}
select,input,textarea{width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:16px;box-sizing:border-box;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.meta{background:#eff6ff;padding:12px;border-radius:8px;margin:16px 0;color:#1e40af;font-size:14px;word-break:break-word;}
.computed-preview{background:#f0fdf4;border:1px dashed #16a34a;padding:12px;border-radius:8px;margin-bottom:16px;}
.computed-row{display:flex;justify-content:space-between;gap:10px;font-size:14px;margin:4px 0;flex-wrap:wrap;}
.btn-submit{width:100%;padding:12px;border:none;border-radius:8px;background:#2563eb;color:white;font-weight:700;font-size:16px;cursor:pointer;}
.btn-submit:disabled{opacity:.5;cursor:not-allowed;}
.alert{padding:12px;border-radius:8px;margin-top:16px;text-align:center;font-weight:600;}
.alert.success{background:#dcfce7;color:#166534;}
.alert.error{background:#fee2e2;color:#dc2626;}
.bottom-nav{position:fixed;bottom:0;left:0;right:0;height:70px;background:#202c33;border-top:1px solid #2a3942;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;z-index:100;}
.bottom-nav button{background:none;border:none;color:#8696a0;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:22px;cursor:pointer;}
.bottom-nav button small{font-size:11px;}
.bottom-nav button.active{color:#00a884;}
.bottom-nav button.active small{font-weight:700;}
@media (max-width:600px){.page{padding:10px 10px 90px 10px;}.grid-2{grid-template-columns:1fr;}.header{flex-direction:column;align-items:stretch;}}
</style>