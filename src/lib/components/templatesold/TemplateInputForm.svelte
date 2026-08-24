<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { browser } from "$app/environment";
    
    export let template: any;
    
    const dispatch = createEventDispatcher();
    
    let fields: any[] = [];
    let values: Record<string, any> = {};
    let loading = true;
    let sending = false;
    let errorMessage = "";
    let currentTemplateId = "";
    let controller: AbortController | null = null;

    function getToken() {
        if (!browser) return "";
        return localStorage.getItem("token") || "";
    }

    function authHeader() {
        const t = getToken();
        return t ? { Authorization: `Bearer ${t}` } : {};
    }

    // FIX 2: Reload when template changes
    $: if (template?.id && template.id !== currentTemplateId) {
        currentTemplateId = template.id;
        loadFields();
    }

    async function loadFields() {
        // FIX 3: Abort previous fetch
        controller?.abort();
        controller = new AbortController();
        
        try {
            loading = true;
            errorMessage = "";
            
            // FIX 4: Reset values before loading
            values = {};
            fields = [];

            const res = await fetch(`/api/templates/fields?template_id=${template.id}`, {
                headers: authHeader(),
                signal: controller.signal
            });
            
            if (!res.ok) {
                throw new Error(`Failed to load: ${res.status}`);
            }
            
            const data = await res.json();
            fields = data.data || [];
            
            // FIX 5: Safer initialization
            fields.forEach(f => {
                const defaultVal = f.default_value;
                if (f.field_type === "number") {
                    values[f.field_name] = defaultVal ?? 0;
                } else {
                    values[f.field_name] = defaultVal ?? "";
                }
            });
            
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            console.error('Load error:', err);
            errorMessage = "Unable to load template fields.";
            fields = [];
        } finally {
            loading = false;
        }
    }

    // FIX 8: Disable while submitting + FIX 9: Deep copy
    async function send() {
        if (sending) return;

        // FIX 6: Better validation
        for (const field of fields) {
            const value = values[field.field_name];
            if (
                field.required &&
                (value === null || value === undefined || value === "")
            ) {
                alert(`${field.field_label} is required`);
                return;
            }
        }
        
        sending = true;
        try {
            dispatch('send', { 
                values: structuredClone(values) // FIX 9
            });
        } finally {
            sending = false;
        }
    }

    function cancel() {
        controller?.abort();
        dispatch('cancel');
    }

    // FIX 1 + 10: Helper for input binding
    function updateValue(field: any, e: Event) {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        const v = target.value;
        
        if (field.field_type === 'number') {
            values[field.field_name] = v === "" ? "" : Number(v);
        } else {
            values[field.field_name] = v;
        }
    }

    onMount(() => {
        if (template?.id) loadFields();
    });
</script>

<div class="form-container">
    <h3>{template.icon} {template.name}</h3>
    <p class="desc">{template.description}</p>
    
    {#if loading}
        <div class="loading">Loading fields...</div>
    {:else if errorMessage}
        <div class="error">{errorMessage}</div>
    {:else if fields.length === 0}
        <div class="empty">No fields configured for this template</div>
    {:else}
        <div class="fields">
            {#each fields as field}
                {@const type = field.field_type ?? "text"}
                <div class="field">
                    <label for={field.field_name}>
                        {field.field_label}
                        {#if field.required}<span class="required">*</span>{/if}
                    </label>
                    
                    <!-- FIX 10: Use type const + FIX 1: Manual binding -->
                    {#if type === 'textarea'}
                        <textarea 
                            id={field.field_name}
                            value={values[field.field_name] ?? ""}
                            on:input={(e) => updateValue(field, e)}
                            placeholder={field.field_label}
                        ></textarea>
                    {:else if type === 'select'}
                        <select
                            id={field.field_name}
                            value={values[field.field_name] ?? ""}
                            on:change={(e) => updateValue(field, e)}
                        >
                            <option value="">Select {field.field_label}</option>
                            {#each field.options || [] as opt}
                                <option value={opt.value}>{opt.label}</option>
                            {/each}
                        </select>
                    {:else}
                        <input 
                            id={field.field_name}
                            type={type}
                            value={values[field.field_name] ?? ""}
                            on:input={(e) => updateValue(field, e)}
                            placeholder={field.field_label}
                        />
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
    
    <div class="actions">
        <button class="btn-cancel" on:click={cancel} disabled={sending}>Cancel</button>
        <button class="btn-send" on:click={send} disabled={loading || sending}>
            {#if sending} Sending... {:else} Send Report {/if}
        </button>
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
    .error {
        padding: 16px;
        text-align: center;
        color: #dc2626;
        background: #fee2e2;
        border-radius: 8px;
        margin-bottom: 16px;
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
    .field input, .field textarea, .field select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        box-sizing: border-box;
        font-family: inherit;
    }
    .field textarea {
        min-height: 80px;
        resize: vertical;
    }
    .field select {
        cursor: pointer;
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
        font-weight: 600;
    }
    .btn-cancel {
        background: #f0f2f5;
    }
    .btn-cancel:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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