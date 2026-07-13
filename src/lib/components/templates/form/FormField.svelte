<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let field: any;
    export let value: any;
    
    const dispatch = createEventDispatcher();
    
    $: fieldId = `field-${field.field_name || field.id || Math.random().toString(36)}`;
    
    function handleInput(e: Event) {
        const target = e.currentTarget as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const val = field.field_type === 'number' ? Number(target.value) : target.value;
        dispatch('change', val);
    }
</script>

<div class="field">
    <label for={fieldId}>
        {field.field_label}
        {#if field.required}<span class="required">*</span>{/if}
    </label>

    {#if field.field_type === 'formula'}
        <input
            id={fieldId}
            type="number"
            value={value ?? 0}
            readonly
            disabled
            class="formula-field"
            title="Calculated automatically"
        />
    {:else if field.field_type === 'number'}
        <input
            id={fieldId}
            type="number"
            {value}
            placeholder={field.placeholder || ''}
            required={field.required}
            readonly={field.readonly}
            disabled={field.readonly}
            min={field.min_value}
            max={field.max_value}
            step={field.step_value || 'any'}
            on:input={handleInput}
        />
    {:else if field.field_type === 'select' && field.options_json}
        <select
            id={fieldId}
            {value}
            required={field.required}
            disabled={field.readonly}
            on:change={handleInput}
        >
            <option value="">Select {field.field_label}</option>
            {#each JSON.parse(field.options_json) as opt}
                <option value={opt.value || opt}>{opt.label || opt}</option>
            {/each}
        </select>
    {:else if field.field_type === 'textarea'}
        <textarea
            id={fieldId}
            {value}
            placeholder={field.placeholder || ''}
            required={field.required}
            readonly={field.readonly}
            disabled={field.readonly}
            rows="3"
            on:input={handleInput}
        ></textarea>
    {:else if field.field_type === 'date'}
        <input
            id={fieldId}
            type="date"
            {value}
            required={field.required}
            readonly={field.readonly}
            disabled={field.readonly}
            on:input={handleInput}
        />
    {:else}
        <input
            id={fieldId}
            type="text"
            {value}
            placeholder={field.placeholder || ''}
            required={field.required}
            readonly={field.readonly}
            disabled={field.readonly}
            on:input={handleInput}
        />
    {/if}
    
    {#if field.description}
        <small class="hint">{field.description}</small>
    {/if}
</div>

<style>
.field { 
    display: flex; 
    flex-direction: column; 
    gap: 6px; 
    margin-bottom: 16px;
}

label { 
    font-weight: 600; 
    font-size: 14px;
    color: #334155;
}

.required { 
    color: #ef4444; 
    margin-left: 2px;
}

input, textarea, select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 15px;
    font-family: inherit;
    transition: border-color 0.15s;
    box-sizing: border-box;
}

input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

input:disabled, textarea:disabled, select:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
    opacity: 0.7;
}

.formula-field {
    background: #f1f5f9;
    color: #059669;
    font-weight: 600;
    cursor: not-allowed;
}

.hint {
    color: #64748b;
    font-size: 12px;
}
</style>