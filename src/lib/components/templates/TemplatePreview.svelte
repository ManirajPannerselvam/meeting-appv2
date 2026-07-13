<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let template: any = null;
    export let selectedGroupId: number | null = null;
    export let selectedContactId: number | null = null;

    let fields: any[] = [];
    let formData: Record<string, any> = {};
    let saving = false;

    $: if (template?.id) {
        loadFields(template.id);
    }

    async function loadFields(templateId: number) {
        const res = await fetch(`/api/templates/fields?template_id=${templateId}`);
        const json = await res.json();
        fields = json.data || [];
        
        // Init formData with default values
        formData = {};
        fields.forEach(f => {
            formData[f.name] = f.type === 'number' ? 0 : '';
        });
    }

    async function saveReport() {
        if (!template?.id) return;
        
        saving = true;
        try {
            const res = await fetch('/api/templates/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    template: {
                        id: template.id,
                        version: template.version || 1,
                        name: template.name
                    },
                    sender: 'Mani',
                    group_id: selectedGroupId,
                    contact_id: selectedContactId,
                    values: formData
                })
            });

            const result = await res.json();
            
            if (result.success) {
                alert(`Report saved! ID: ${result.report_id}`);
                dispatch('saved', { reportId: result.report_id });
            } else {
                alert('Failed: ' + result.message);
            }
        } catch (err) {
            console.error(err);
            alert('Error saving report');
        } finally {
            saving = false;
        }
    }

    function getInputType(type: string) {
        if (type === 'number') return 'number';
        if (type === 'date') return 'date';
        if (type === 'time') return 'time';
        return 'text';
    }
</script>

<div class="panel">
    <div class="header">
        <div>
            <h2>👁 Live Template Preview</h2>
            <small>{template?.name || 'No template selected'}</small>
        </div>
        <button>Full Screen</button>
    </div>

    {#if template}
        <div class="phone">
            <div class="title">
                <h2>{template.name}</h2>
                <span>{template.department}</span>
            </div>

            <div class="form">
                {#each fields as field}
                    <div class="item" class:full={field.type === 'textarea'}>
                        <label>{field.label}</label>
                        
                        {#if field.type === 'select'}
                            <select bind:value={formData[field.name]}>
                                {#each field.options?.split(',') || [] as opt}
                                    <option value={opt.trim()}>{opt.trim()}</option>
                                {/each}
                            </select>
                        {:else if field.type === 'textarea'}
                            <textarea bind:value={formData[field.name]} rows="3"></textarea>
                        {:else}
                            <input 
                                type={getInputType(field.type)}
                                bind:value={formData[field.name]}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                            />
                        {/if}
                    </div>
                {/each}
            </div>

            <div class="actions">
                <button class="btn template">📄 Template</button>
                <button class="btn whatsapp" on:click={saveReport} disabled={saving}>
                    {saving ? '⏳' : '📱'}
                </button>
                <button class="btn print" on:click={() => window.print()}>🖨</button>
            </div>

            <button class="save" on:click={saveReport} disabled={saving}>
                {saving? '💾 Saving...' : '💾 Save Report'}
            </button>
        </div>
    {:else}
        <div class="empty">Select a template from the list</div>
    {/if}
</div>

<style>
.panel{
    background:white;
    padding:25px;
    border-radius:20px;
    box-shadow:0 5px 18px rgba(0,0,0,.08);
}
.header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:25px;
}
.header button{
    background:#2563eb;
    color:white;
    border:none;
    padding:10px 18px;
    border-radius:10px;
    cursor:pointer;
}
.phone{
    width:100%;
    background:#f8fafc;
    border-radius:20px;
    padding:25px;
    border:1px solid #dbeafe;
}
.title{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:25px;
}
.title span{
    background:#2563eb;
    color:white;
    padding:5px 12px;
    border-radius:20px;
    font-size:13px;
}
.form{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:15px;
}
.item{
    display:flex;
    flex-direction:column;
}
.item.full{
    grid-column: span 2;
}
.item label{
    margin-bottom:6px;
    font-weight:600;
}
.item input,
.item select,
.item textarea{
    padding:10px;
    border-radius:10px;
    border:1px solid #d6dbe5;
    font-family: inherit;
}
.actions{
    display: flex;
    gap: 10px;
    margin-top: 20px;
}
.btn{
    flex: 1;
    padding: 12px;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 18px;
}
.btn:disabled{
    opacity: 0.5;
}
.save{
    margin-top:15px;
    width:100%;
    padding:15px;
    background:#2563eb;
    color:white;
    border:none;
    border-radius:12px;
    font-size:16px;
    cursor:pointer;
}
.save:disabled{
    opacity:0.6;
    cursor:not-allowed;
}
.empty{
    text-align: center;
    padding: 40px;
    color: #64748b;
}
@media print {
  .btn, .header button, .save { display: none; }
  .panel { box-shadow: none; }
}
</style>