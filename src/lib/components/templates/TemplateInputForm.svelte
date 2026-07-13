<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    
    export let template: any;
    
    const dispatch = createEventDispatcher();
    
    let fields: any[] = [];
    let values: Record<string, any> = {};
    let loading = true;

    function getToken() {
        return localStorage.getItem("token") || "";
    }

    function authHeader() {
        const t = getToken();
        return t ? { Authorization: `Bearer ${t}` } : {};
    }

    async function loadFields() {
        try {
            loading = true;
            const res = await fetch(`/api/templates/fields?template_id=${template.id}`, {
                headers: authHeader()
            });
            
            if (!res.ok) {
                console.error('Fields load failed:', res.status);
                fields = [];
                return;
            }
            
            const data = await res.json();
            fields = data.data || [];
            
            // Init values with defaults
            fields.forEach(f => {
                values[f.field_name] = f.default_value || '';
            });
            
        } catch (err) {
            console.error('Load error:', err);
            fields = [];
        } finally {
            loading = false;
        }
    }

    function send() {
        // Validate required fields
        for (const field of fields) {
            if (field.required && !values[field.field_name]) {
                alert(`${field.field_label} is required`);
                return;
            }
        }
        
        dispatch('send', { values });
    }

    function cancel() {
        dispatch('cancel');
    }

    onMount(loadFields);
</script>

<div class="form-container">
    <h3>{template.icon} {template.name}</h3>
    <p class="desc">{template.description}</p>
    
    {#if loading}
        <div class="loading">Loading fields...</div>
    {:else if fields.length === 0}
        <div class="empty">No fields configured for this template</div>
    {:else}
        <div class="fields">
            {#each fields as field}
                <div class="field">
                    <label>
                        {field.field_label}
                        {#if field.required}<span class="required">*</span>{/if}
                    </label>
                    
                    {#if field.field_type === 'number'}
                        <input 
                            type="number" 
                            bind:value={values[field.field_name]}
                            placeholder={field.field_label}
                        />
                    {:else if field.field_type === 'text'}
                        <input 
                            type="text" 
                            bind:value={values[field.field_name]}
                            placeholder={field.field_label}
                        />
                    {:else if field.field_type === 'textarea'}
                        <textarea 
                            bind:value={values[field.field_name]}
                            placeholder={field.field_label}
                        ></textarea>
                    {:else if field.field_type === 'date'}
                        <input 
                            type="date" 
                            bind:value={values[field.field_name]}
                        />
                    {:else}
                        <input 
                            type="text" 
                            bind:value={values[field.field_name]}
                            placeholder={field.field_label}
                        />
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
    
    <div class="actions">
        <button class="btn-cancel" on:click={cancel}>Cancel</button>
        <button class="btn-send" on:click={send} disabled={loading}>Send Report</button>
    </div>
</div>

<style>
    .form-container {
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
    }
    h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
    }
    .desc {
        color: #666;
        margin: 0 0 20px 0;
        font-size: 14px;
    }
    .loading, .empty {
        padding: 40px;
        text-align: center;
        color: #666;
    }
    .fields {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 20px;
    }
    .field label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        font-size: 14px;
    }
    .required {
        color: red;
        margin-left: 4px;
    }
    .field input, .field textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
    }
    .field textarea {
        min-height: 80px;
        resize: vertical;
    }
    .actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    .actions button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
    }
    .btn-cancel {
        background: #f0f2f5;
    }
    .btn-send {
        background: #2563eb;
        color: white;
    }
    .btn-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>