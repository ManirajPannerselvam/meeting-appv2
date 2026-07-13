<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import FormRenderer from "./FormRenderer.svelte";

    export let template: any = null;
    export let fields: any[] = [];
    
    const dispatch = createEventDispatcher();
    let values: Record<string, any> = {};

    // Use fields from template
    $: if (template?.fields?.length) {
        fields = template.fields;
    }

    // Init default values once
    $: if (fields?.length && Object.keys(values).length === 0) {
        fields.forEach(f => {
            if (f.field_type !== 'formula') {
                values[f.field_name] = f.default_value !== null ? f.default_value : '';
            }
        });
        values = { ...values };
    }

    // Safe formula evaluator - handles DB field_type
    function calculateFormula(formulaStr: string, data: Record<string, any>): number {
        if (!formulaStr) return 0;
        try {
            let expr = formulaStr;
            // Replace all field names with values
            for (const [key, val] of Object.entries(data)) {
                const numVal = Number(val) || 0;
                expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(numVal));
            }
            // Only allow numbers and operators
            if (!/^[\d\s+\-*/().]+$/.test(expr)) return 0;
            const result = Function(`"use strict"; return (${expr})`)();
            return isFinite(result) ? Number(result.toFixed(2)) : 0;
        } catch {
            return 0;
        }
    }

    // Recalculate formulas - only when non-formula values change
    $: {
        if (fields?.length) {
            let changed = false;
            fields.forEach(field => {
                if (field.field_type === 'formula' && field.formula) {
                    const newVal = calculateFormula(field.formula, values);
                    if (values[field.field_name] !== newVal) {
                        values[field.field_name] = newVal;
                        changed = true;
                    }
                }
            });
            if (changed) values = { ...values }; // Trigger update
        }
    }

    // Auto-fill location
    onMount(() => {
        const locField = fields.find(f => f.field_name === 'location');
        if (locField && !values['location']) {
            if (navigator.geolocation) {
                values['location'] = 'Fetching location...';
                values = { ...values };
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        try {
                            const res = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
                            );
                            const data = await res.json();
                            values['location'] = data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                        } catch {
                            values['location'] = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                        }
                        values = { ...values };
                    },
                    () => {
                        values['location'] = 'Location blocked';
                        values = { ...values };
                    }
                );
            }
        }
    });

    function send() {
        // Build final message
        let msg = `*${template?.name}*\n`;
        fields
            .filter(f => !f.hidden)
            .sort((a, b) => a.display_order - b.display_order)
            .forEach(f => {
                const val = values[f.field_name] ?? '';
                msg += `${f.field_label}: ${val}${f.field_type === 'formula' ? '%' : ''}\n`;
            });
        msg += `Time: ${new Date().toLocaleString()}`;

        dispatch("submit", {
            template,
            values,
            message: msg
        });
    }

    function cancel() {
        dispatch("cancel");
    }
</script>

<div class="template-form">
    <div class="header">
        <div>
            <h2>{template?.name || 'Form'}</h2>
            <small>
                {#if template?.department}{template.department}{/if}
                {#if template?.version} • v{template.version}{/if}
                {#if fields?.length} • {fields.filter(f => !f.hidden).length} fields{/if}
            </small>
        </div>
    </div>

    <div class="body">
        <FormRenderer
            {template}
            {fields}
            bind:values
        />
    </div>

    <div class="footer">
        <button class="cancel" on:click={cancel}>
            Cancel
        </button>
        <button class="send" on:click={send}>
            Send Report
        </button>
    </div>
</div>

<style>
.template-form {
    width: 900px;
    max-width: 95vw;
    background: white;
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 90vh;
}

.header {
    padding: 22px 28px;
    border-bottom: 1px solid #e5e7eb;
    background: white;
}

.header h2 {
    margin: 0;
    font-size: 24px;
}

.header small {
    color: #64748b;
    font-size: 13px;
}

.body {
    padding: 20px 28px;
    flex: 1;
    overflow-y: auto;
}

.footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 28px;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
}

.cancel {
    padding: 10px 18px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
}

.cancel:hover {
    background: #f9fafb;
}

.send {
    padding: 10px 18px;
    border: none;
    background: #2563eb;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
}

.send:hover {
    background: #1d4ed8;
}
</style>