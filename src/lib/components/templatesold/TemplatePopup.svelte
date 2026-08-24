<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    
    type TemplateData = { fields?: any[]; [key: string]: any }
    type Template = {
        id: string;
        name: string;
        template_code?: string;
        category?: string;
        description?: string;
        data: string | TemplateData;
    }

    export let templates: Template[] = [];
    const dispatch = createEventDispatcher();

    let search = '';
    let debouncedSearch = '';
    let deletingId: string | null = null;
    let timeout: any;

    // debounce search
    $: {
        clearTimeout(timeout);
        timeout = setTimeout(() => debouncedSearch = search, 200);
    }
    onDestroy(() => clearTimeout(timeout));

    function parse(t: Template): TemplateData { 
        if(!t.data) return {}; 
        if(typeof t.data === 'string'){
            try { return JSON.parse(t.data) } catch(e){ 
                console.warn('Failed to parse template data', t.id, e);
                return {} 
            }
        }
        return t.data as TemplateData; 
    }

    function getFields(t: Template){ return parse(t).fields?.length || 0 }
    
    function handleUse(t: Template) {

    const data: TemplateData = structuredClone(parse(t));

    const normalizedFields = (data.fields || []).map((f: any) => ({
        ...f,

        // Keep the original database field name
        field_name: f.field_name ?? f.name ?? "",

        // Keep the original field type
        field_type: f.field_type ?? f.type ?? "text"
    }));

    const parsedTemplate = {

        ...t,

        data: {
            ...data,
            fields: normalizedFields,

            // Explicitly preserve saved values
            last_values: data.last_values ?? {}
        }

    };

    console.log("========== TEMPLATE ==========");
    console.table(
        normalizedFields.map((f: any) => ({
            label: f.label,
            field_name: f.field_name,
            field_type: f.field_type
        }))
    );

    console.log("LAST VALUES");
    console.log(parsedTemplate.data.last_values);

    dispatch("use", parsedTemplate);
}


    function handleKeydown(e: KeyboardEvent){
        if(e.key === 'Escape') dispatch('close');
    }

    $: filtered = templates.filter(t => {
        const s = debouncedSearch.toLowerCase();
        return t.name.toLowerCase().includes(s) || 
               t.template_code?.toLowerCase().includes(s) ||
               t.category?.toLowerCase().includes(s)
    })
</script>

<svelte:window on:keydown={handleKeydown}/>

<div class="popup-card" on:click|stopPropagation>
    <div class="header">
        <h2>📋 Templates</h2>
        <button class="close" on:click={() => dispatch('close')} aria-label="Close">✕</button>
    </div>

    <div class="search">
        <span>🔍</span>
        <input bind:value={search} placeholder="Search template by name, code, category..." />
        <button class="btn-new" on:click={() => dispatch('new')}>+ New</button>
    </div>

    <div class="list">
        {#if filtered.length === 0}
            <p class="empty">
                {debouncedSearch ? `No templates found for "${debouncedSearch}"` : 'No templates yet. Click + New to create one.'}
            </p>
        {:else}
            {#each filtered as t (t.id)}
            <div class="row">
                <div class="info">
                    <div class="icon">📄</div>
                    <div class="content">
                        <div class="name">
                            {t.name} 
                            {#if t.template_code}<span class="code">{t.template_code}</span>{/if}
                        </div>
                        <div class="meta">Fields: {getFields(t)} • {t.category || 'Uncategorized'}</div>
                        {#if t.description}<div class="desc">{t.description}</div>{/if}
                    </div>
                </div>
                <div class="actions">
                    <button class="btn-edit" on:click={() => handleEdit(t)}>Edit</button>
                    <button 
                        class="btn-del" 
                        disabled={deletingId === t.id}
                        on:click={() => deleteTemplate(t.id)}
                    >
                        {deletingId === t.id ? '...' : 'Delete'}
                    </button>
                    <button class="btn-use" on:click={() => handleUse(t)}>Use</button>
                </div>
            </div>
            {/each}
        {/if}
    </div>

    <div class="footer">{filtered.length} of {templates.length} templates</div>
</div>

<style>
.popup-card{ background:white; border-radius:16px; width:700px; max-width:90vw; max-height:80vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.1); }
.header{ display:flex; justify-content:space-between; align-items:center; padding:16px; border-bottom:1px solid #eee; }
.header h2{ margin:0; font-size:18px; font-weight:600; }
.close{ background:none; border:none; font-size:20px; cursor:pointer; color:#64748b; }
.close:hover{ color:#000; }
.search{ display:flex; gap:8px; padding:12px 16px; border-bottom:1px solid #eee; align-items:center; }
.search input{ flex:1; border:1px solid #ddd; border-radius:8px; padding:8px 12px; outline:none; }
.search input:focus{ border-color:#2563eb; }
.btn-new{ background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; }
.btn-new:hover{ background:#1d4ed8; }
.list{ flex:1; overflow:auto; padding:8px 16px; }
.row{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:12px; border:1px solid #f1f1f1; border-radius:10px; margin-bottom:8px; transition:0.15s; }
.row:hover{ background:#f8fafc; border-color:#e2e8f0; }
.info{ display:flex; gap:12px; flex:1; min-width:0; }
.icon{ font-size:24px; background:#eff6ff; padding:8px; border-radius:8px; flex-shrink:0; }
.content{ min-width:0; }
.name{ font-weight:600; font-size:15px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.code{ font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; }
.meta{ font-size:12px; color:#64748b; margin-top:2px; }
.desc{ font-size:12px; color:#94a3b8; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.actions{ display:flex; gap:8px; flex-shrink:0; }
.actions button{ border:none; padding:8px 14px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; }
.actions button:disabled{ opacity:0.5; cursor:not-allowed; }
.btn-use{ background:#16a34a; color:white; }
.btn-use:hover{ background:#15803d; }
.btn-edit{ background:#f1f5f9; color:#334155; }
.btn-edit:hover{ background:#e2e8f0; }
.btn-del{ background:#ef4444; color:white; }
.btn-del:hover{ background:#dc2626; }
.footer{ padding:12px 16px; text-align:center; font-size:12px; color:#64748b; border-top:1px solid #eee; }
.empty{ text-align:center; color:#999; padding:40px 0; }
</style>