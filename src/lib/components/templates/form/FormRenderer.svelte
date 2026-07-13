<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import FormField from "./FormField.svelte";
    import { calculateFormula } from "$lib/utils/formula";
    import { validateForm } from "./ValidationEngine";

    export let template: any;
    export let fields: any[] = [];
    export let values: Record<string, any> = {};

    const dispatch = createEventDispatcher();
    let errors: Record<string, string> = {};

    // 1. Initialize default values once per field
    $: if (fields?.length && Object.keys(values).length === 0) {
        fields.forEach(field => {
            // FIX: Use field_type not type
            if (field.field_type !== 'formula') {
                values[field.field_name] = field.default_value ?? '';
            }
        });
        values = { ...values };
    }

    function updateValue(field: any, value: any) {
        // Update the field that changed
        values = {
            ...values,
            [field.field_name]: value
        };

        // Recalculate ALL formula fields after any change
        fields.forEach((f: any) => {
            // FIX: Use field_type to match DB
            if (f.field_type === "formula" && f.formula) {
                try {
                    const newVal = calculateFormula(f.formula, values);
                    if (values[f.field_name] !== newVal) {
                        values[f.field_name] = newVal;
                    }
                } catch (err) {
                    console.error('Formula error for', f.field_name, err);
                    values[f.field_name] = 0;
                }
            }
        });

        values = { ...values };
    }

    function submit() {
        const result = validateForm(fields, values);
        errors = result.errors;
        if (!result.valid) return;

        dispatch("submit", { template, values });
    }
</script>

<div class="renderer">
    <!-- Remove this debug line -->
    <!-- <p style="color:red">Fields Count = {fields.length}</p> -->

    {#each fields.filter(f => !f.hidden).sort((a,b) => a.display_order - b.display_order) as field (field.id)}
        <div class="row">
            <FormField
                {field}
                value={values[field.field_name] ?? ""}
                on:change={(e) => updateValue(field, e.detail)}
            />

            {#if errors[field.field_name]}
                <small class="error">
                    {errors[field.field_name]}
                </small>
            {/if}
        </div>
    {/each}
</div>

<style>
.renderer{
    display:flex;
    flex-direction:column;
    gap:18px;
}
.row{
    display:flex;
    flex-direction:column;
    gap:6px;
}
.error{
    color:#dc2626;
    font-size:12px;
}
</style>