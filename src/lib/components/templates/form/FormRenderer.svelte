<script lang="ts">
    export let fields: any[] = [];
    export let values: Record<string, any> = {};

    let initializedSignature = "";

    function safeNumber(v: any) {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }

    function parseOptions(field: any) {
        if (Array.isArray(field.options)) return field.options;

        try {
            return JSON.parse(field.options || "[]");
        } catch {
            return [];
        }
    }

    /* ----------------------------------
       Initialize whenever template values change
    ----------------------------------- */

    $: {
        const signature =
            JSON.stringify(fields.map(f => f.field_name)) +
            JSON.stringify(values);

        if (fields.length && signature !== initializedSignature) {

            initializedSignature = signature;

            const next: Record<string, any> = {};

            fields.forEach(field => {

                next[field.field_name] =
                    values[field.field_name] ??
                    field.default_value ??
                    "";

            });

            values = structuredClone(next);

            calculateFormulas();
        }
    }

    /* ----------------------------------
       Formula Engine
    ----------------------------------- */

    function calculateFormulas() {

        const next = { ...values };

        let changed = false;

        fields.forEach(field => {

            if (field.field_type !== "formula") return;
            if (!field.formula) return;

            try {

                let expr = field.formula;

                fields.forEach(ref => {

                    const val = safeNumber(
                        next[ref.field_name]
                    );

                    expr = expr.replace(
                        new RegExp(`\\{${ref.field_name}\\}`, "g"),
                        val.toString()
                    );

                });

                const result = Function(
                    `"use strict"; return (${expr})`
                )();

                const formatted =
                    Number(result).toFixed(2);

                if (next[field.field_name] !== formatted) {

                    next[field.field_name] = formatted;

                    changed = true;

                }

            }
            catch {

                if (next[field.field_name] !== "0.00") {

                    next[field.field_name] = "0.00";

                    changed = true;

                }

            }

        });

        if (changed) {

            values = { ...next };

        }

    }

    /* ----------------------------------
       Update
    ----------------------------------- */

    function update(field: any, value: any) {

        let newValue = value;

        if (field.field_type === "number") {

            newValue =
                value === ""
                    ? ""
                    : safeNumber(value);

        }

        values = {
            ...values,
            [field.field_name]: newValue
        };

        calculateFormulas();

    }
</script>

<div class="form-container">

{#each fields as field (field.id)}

<div class="form-group">

<label>
    {field.label}
    {#if field.required}
        <span class="required">*</span>
    {/if}
</label>

{#if field.field_type === "text"}

<input
    type="text"
    bind:value={values[field.field_name]}
    placeholder={field.placeholder}
    readonly={field.readonly}
    on:input={(e) => update(field, e.currentTarget.value)}
/>

{:else if field.field_type === "number"}

<input
    type="number"
    bind:value={values[field.field_name]}
    placeholder={field.placeholder}
    readonly={field.readonly}
    on:input={(e) => update(field, e.currentTarget.value)}
/>

{:else if field.field_type === "textarea"}

<textarea
    rows="4"
    bind:value={values[field.field_name]}
    placeholder={field.placeholder}
    readonly={field.readonly}
    on:input={(e) => update(field, e.currentTarget.value)}
></textarea>

{:else if field.field_type === "dropdown"}

<select
    bind:value={values[field.field_name]}
    disabled={field.readonly}
    on:change={(e) => update(field, e.currentTarget.value)}
>

<option value="">Select...</option>

{#each parseOptions(field) as option}

<option value={option}>
    {option}
</option>

{/each}

</select>

{:else if field.field_type === "formula"}

<input
    class="formula"
    readonly
    value={values[field.field_name]}
/>

{/if}

</div>

{/each}

</div>

<style>
.form-container{
    display:flex;
    flex-direction:column;
    gap:18px;
    padding:20px;
}

.form-group{
    display:flex;
    flex-direction:column;
    gap:6px;
}

.form-group label{
    font-weight:600;
}

.required{
    color:red;
}

input,
select,
textarea{
    width:100%;
    padding:10px;
    border:1px solid #d1d5db;
    border-radius:8px;
    box-sizing:border-box;
}

textarea{
    resize:vertical;
}

.formula{
    background:#ecfeff;
    color:#0369a1;
    font-weight:bold;
}
</style>