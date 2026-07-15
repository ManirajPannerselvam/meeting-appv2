<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
 import TemplateDesigner from '$lib/components/templates/designer/TemplateDesigner.svelte';

    import UseTemplateModal from '$lib/components/UseTemplateModal.svelte';
const dispatch = createEventDispatcher();

    type Template = { 
        id: string; 
        name: string; 
        template_code?: string; 
        description?: string; 
        data: string | { fields?: any[]; department?: string; reference_template?: string } 
    }

    let templates: Template[] = [];
    let searchQuery = '';
    let debouncedSearch = '';
    let showList = true;
    let showCreateModal = false;
    let showUseModal = false;
    let showDeleteModal = false;
    let isDeleting = false;
    let selectedTemplate: any = null;
    let templateToDelete: Template | null = null;
    let timeout: any;
let editingTemplate = null;

    onMount(loadTemplates);
    onDestroy(() => clearTimeout(timeout));
    $: { clearTimeout(timeout); timeout = setTimeout(() => debouncedSearch = searchQuery, 300) }

    function parseData(t: Template): any {
        if (!t.data) return { fields: [] };
        if(typeof t.data === 'string'){
            try { return JSON.parse(t.data) } catch(e){ console.error("PARSE ERROR", e); return { fields: [] } }
        }
        return t.data;
    }

    // ADD DEFAULT FIELDS IF MISSING - but don't mutate original
    function ensureDefaultFields(data: any){
        const newData = structuredClone(data); // don't mutate cache
        if(!newData.fields) newData.fields = [];
        
        const hasShift = newData.fields.some((f: any) => f.field_name === 'shift');
        const hasStation = newData.fields.some((f: any) => f.field_name === 'station');
        
        if(!hasShift){
            newData.fields.unshift({
                id: crypto.randomUUID?.() || Date.now().toString(),
                label: 'Shift',
                field_name: 'shift',
                field_type: 'dropdown',
                options: JSON.stringify(["A","B","C"]),
                required: true,
                display_order: 0
            })
        }
        if(!hasStation){
            newData.fields.unshift({
                id: crypto.randomUUID?.() || (Date.now()+1).toString(),
                label: 'Station',
                field_name: 'station',
                field_type: 'text',
                placeholder: 'Line 1',
                required: true,
                display_order: 1
            })
        }
        
        // fix display_order
        newData.fields = newData.fields.map((f:any, i:number) => ({...f, display_order: i}))
        return newData;
    }

    $: filtered = templates.filter(t => {
        const s = debouncedSearch.toLowerCase();
        const data = parseData(t);
        return t.name.toLowerCase().includes(s) || 
               t.template_code?.toLowerCase().includes(s) ||
               data.department?.toLowerCase().includes(s)
    })
function editTemplate(template) {

    editingTemplate = template;

    showCreateModal = true;

}

    async function loadTemplates() {

    try {

        const res = await fetch(
            `/api/templates?t=${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        const json = await res.json();

        templates = json.templates || json || [];

        console.log("TEMPLATES LOADED", templates);

    }
    catch (e) {

        console.error(e);

        alert("Failed to load templates");

    }

}

    function openUse(t: Template) {

    const parsedData = ensureDefaultFields(
        parseData(t)
    );

    selectedTemplate = {

        ...t,

        data: parsedData,

        fields: parsedData.fields

    };

    console.log("USE TEMPLATE", selectedTemplate);

    showUseModal = true;

}

    function openDelete(t: Template) {
        templateToDelete = t;
        showDeleteModal = true;
    }

    async function doDelete() {
        if(!templateToDelete) return;
        isDeleting = true;
        try{
            const res = await fetch(`/api/templates?id=${templateToDelete.id}`, { method: 'DELETE' });
            if(!res.ok) throw new Error('Delete failed');
            showDeleteModal = false;
            templateToDelete = null;
            await loadTemplates();
        } catch(e: any){ alert(e.message) } 
        finally { isDeleting = false; }
    }

   async function handleSubmit(event: CustomEvent) {

    console.log("REPORT RECEIVED");

    console.log(event.detail);

    showUseModal = false;

    dispatch(
        "submit",
        event.detail
    );

}
</script>

<!-- MAIN LIST WRAPPED IN OVERLAY -->
{#if showList}
<div class="overlay">
    <div class="modal">
        <div class="top">
            <div class="search">🔍 <input bind:value={searchQuery} placeholder="Search template by name, code, department..." /></div>
            <button class="blue" on:click={() => showCreateModal = true}>+ New Template</button>
        </div>

        <div class="list">
            {#if filtered.length === 0}
                <p class="empty">No templates found</p>
            {:else}
                {#each filtered as t (t.id)}
                {@const data = parseData(t)}
                {@const dataWithDefaults = ensureDefaultFields(data)}
                <div class="card">
                    <div class="left">
                        <div class="doc-icon">📄</div>
                        <div class="info">
                            <b>{t.name} {#if t.template_code}<span class="code">{t.template_code}</span>{/if}</b>
                            <div class="meta">
                                Fields: {dataWithDefaults.fields?.length || 0} • 
                                {data.department || 'General'}
                                {#if data.reference_template}
                                    • Ref: {templates.find(x=>x.id===data.reference_template)?.name}
                                {/if}
                            </div>
                            <div class="desc">{t.description}</div>
                        </div>
                    </div>
                   <div class="btn-group">

    <button
        class="blue"
        on:click={() => editTemplate(t)}
    >
        Edit
    </button>

    <button
        class="green"
        on:click={() => openUse(t)}
    >
        Use
    </button>

    <button
        class="red"
        on:click={() => openDelete(t)}
    >
        Delete
    </button>

</div>

                </div>
                {/each}
            {/if}
        </div>

        <div class="bottom">{filtered.length} of {templates.length} templates</div>
    </div>
</div>
{/if}

{#if showCreateModal}
<div class="overlay">
    <div class="modal-lg">
       <TemplateDesigner

    templates={templates}

    template={editingTemplate}

    on:saved={() => {

        editingTemplate = null;

        showCreateModal = false;

        loadTemplates();

    }}

    on:close={() => {

        editingTemplate = null;

        showCreateModal = false;

    }}

/>
    </div>
</div>
{/if}

{#if showUseModal}
<div class="overlay" style="z-index: 10000;">
    <UseTemplateModal
    template={selectedTemplate}
    show={showUseModal}
    on:close={() => showUseModal = false}
    on:submit={handleSubmit}
/>
</div>
{/if}

{#if showDeleteModal}
<div class="overlay">
    <div class="confirm">
        <h3>Delete "{templateToDelete?.name}"?</h3>
        <p>This cannot be undone.</p>
        <div class="confirm-actions">
            <button on:click={() => {showDeleteModal=false; templateToDelete=null}} disabled={isDeleting}>Cancel</button>
            <button class="red" on:click={doDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
        </div>
    </div>
</div>
{/if}

<style>
.overlay { 
    position:fixed; 
    inset:0; 
    background:rgba(0,0,0,0.6); 
    display:flex; 
    justify-content:center; 
    align-items:center; 
    z-index:9999;
}
.modal { 
    background:white; 
    border-radius:16px; 
    padding:16px; 
    width:700px; 
    max-width:90vw; 
    max-height:80vh; 
    display:flex; 
    flex-direction:column; 
}
.modal-lg { background:white; border-radius:16px; padding:20px; width:900px; max-width:95vw; max-height:90vh; overflow:auto; }

.btn-group { display:flex; gap:8px; }
.btn-group button { cursor: pointer; }

.top { display:flex; gap:8px; margin-bottom:16px; }
.search { flex:1; border:1px solid #ddd; border-radius:8px; padding:8px 12px; display:flex; gap:8px; align-items:center; }
.search input { border:none; outline:none; width:100%; background:transparent; }
.blue { background:#2563eb; color:white; border:none; padding:10px 16px; border-radius:8px; font-weight:600; cursor:pointer; }
.blue:hover { background:#1d4ed8; }
.list{ flex:1; overflow:auto; }
.card { display:flex; justify-content:space-between; align-items:center; border:1px solid #eee; border-radius:12px; padding:12px; margin-bottom:8px; }
.card:hover{ background:#f8fafc; }
.left { display:flex; gap:12px; align-items:center; }
.doc-icon { background:#eff6ff; padding:8px; border-radius:8px; font-size:20px; }
.info b{ display:flex; gap:6px; align-items:center; flex-wrap:wrap; font-size:14px; }
.code{ font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#475569; }
.meta { font-size:12px; color:#666; }
.desc { font-size:12px; color:#999; margin-top:2px; }
.green { background:#16a34a; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; }
.green:hover { background:#15803d; }
.red { background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:600; cursor:pointer; }
.red:hover { background:#dc2626; }
.bottom { text-align:center; font-size:12px; color:#666; margin-top:12px; }
.empty{ text-align:center; color:#999; padding:40px 0; }
.confirm { background:white; padding:24px; border-radius:12px; min-width:320px; }
.confirm-actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
</style>