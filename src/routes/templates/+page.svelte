<script lang="ts">
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
    import TemplateSidebar from "$lib/components/templates/TemplateSidebar.svelte";
    import TemplateList from "$lib/components/templates/TemplateList.svelte";
    import TemplatePreview from "$lib/components/templates/TemplatePreview.svelte";
    import PropertiesPanel from "$lib/components/templates/PropertiesPanel.svelte";

    let templates: any[] = [];
    let selectedTemplate: any = null;
    let selectedRoomId: string | null = null;
    let selectedContactId: string | null = null;
    let loading = true;
    let error = '';
    let successMsg = '';

    onMount(async () => {
        await loadTemplates();
        await loadDefaultRoom();
    });

    async function loadTemplates() {
        try {
            loading = true;
            error = '';
            
            // Fetch templates WITH fields
            const { data, error: dbError } = await supabase
               .from('templates')
               .select(`
                    *,
                    fields:template_fields(*)
                `)
               .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            
            templates = data || [];

            // Auto-select first template if none selected
            if (templates.length > 0 && !selectedTemplate) {
                selectTemplate(templates[0]);
            }
        } catch (err: any) {
            console.error('Template load error:', err);
            error = 'Failed to load templates';
        } finally {
            loading = false;
        }
    }

    async function loadDefaultRoom() {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const { data: rooms } = await supabase
               .from('rooms')
               .select('id, user1_id, user2_id')
               .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
               .limit(1)
               .maybeSingle();

            if (rooms) {
                selectedRoomId = rooms.id;
                selectedContactId = rooms.user1_id === userId ? rooms.user2_id : rooms.user1_id;
            }
        } catch (err) {
            console.error('Room load error:', err);
        }
    }

    function selectTemplate(t: any) {
        selectedTemplate = t;
    }

    function handleSaved(event: CustomEvent) {
        console.log('Report saved:', event.detail.reportId);
        successMsg = 'Template report sent successfully!';
        setTimeout(() => successMsg = '', 3000);
    }

    async function handleTemplateCreated() {
        await loadTemplates();
        successMsg = 'Template created successfully!';
        setTimeout(() => successMsg = '', 3000);
    }

    async function handleTemplateUpdated() {
        await loadTemplates();
        successMsg = 'Template updated successfully!';
        setTimeout(() => successMsg = '', 3000);
    }

    async function handleTemplateDeleted() {
        selectedTemplate = null;
        await loadTemplates();
        successMsg = 'Template deleted';
        setTimeout(() => successMsg = '', 3000);
    }
</script>

<svelte:head>
    <title>EMS Template Designer</title>
</svelte:head>

<div class="page">

    <!-- Left -->
    <aside class="leftPanel">
        <TemplateSidebar 
            on:create={() => {}}
            on:refresh={loadTemplates}
        />
    </aside>

    <!-- Center -->
    <main class="centerPanel">

        <div class="titleCard">
            <div>
                <h1>📄 EMS Template Designer</h1>
                <p>Create Production, Quality, Engineering and Maintenance Templates</p>
            </div>
        </div>

        {#if successMsg}
            <div class="toast success">
                ✅ {successMsg}
            </div>
        {/if}

        {#if loading}
            <div class="panel">
                <p>Loading templates...</p>
            </div>
        {:else if error}
            <div class="panel error">
                <p>❌ {error}</p>
                <button on:click={loadTemplates}>Retry</button>
            </div>
        {:else}
            <TemplateList
                {templates}
                {selectedTemplate}
                on:select={(e) => selectTemplate(e.detail)}
                on:delete={handleTemplateDeleted}
            />

            {#if selectedTemplate}
                <TemplatePreview
                    template={selectedTemplate}
                    {selectedRoomId}
                    {selectedContactId}
                    on:saved={handleSaved}
                    on:updated={handleTemplateUpdated}
                />
            {:else}
                <div class="panel">
                    <p>Select a template to preview</p>
                </div>
            {/if}
        {/if}

    </main>

    <!-- Right -->
    <aside class="rightPanel">
        <PropertiesPanel 
            {selectedTemplate}
            on:saved={handleTemplateUpdated}
        />
    </aside>

</div>

<style>
:global(body){
    margin:0;
    background:#edf2f7;
    font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;
}

.page{
    display:grid;
    grid-template-columns: 280px 1fr 320px;
    gap:20px;
    padding:20px;
    min-height:100vh;
    box-sizing:border-box;
}

.leftPanel,
.centerPanel,
.rightPanel{
    display:flex;
    flex-direction:column;
    gap:20px;
    min-width: 0;
}

.titleCard{
    background:white;
    border-radius:18px;
    padding:24px;
    box-shadow:0 6px 20px rgba(0,0,0,.08);
}

.titleCard h1{
    margin:0;
    font-size:30px;
    color:#1e293b;
}

.titleCard p{
    margin-top:8px;
    color:#64748b;
}

.panel{
    background:white;
    padding:25px;
    border-radius:20px;
    box-shadow:0 5px 18px rgba(0,0,0,.08);
    text-align: center;
    color: #64748b;
}

.panel.error{
    border: 2px solid #ef4444;
    color: #dc2626;
}

.panel button{
    margin-top: 12px;
    padding: 8px 16px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
}

.panel button:hover{
    background: #059669;
}

.toast{
    padding: 14px 20px;
    border-radius: 12px;
    font-weight: 600;
    animation: slideIn 0.3s ease;
}

.toast.success{
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #10b981;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media(max-width:1400px){
  .page{
        grid-template-columns: 260px 1fr 300px;
    }
}

@media(max-width:1100px){
  .page{
        grid-template-columns: 1fr;
    }
  .leftPanel,
  .rightPanel{
        order:2;
    }
  .centerPanel{
        order:1;
    }
}
</style>