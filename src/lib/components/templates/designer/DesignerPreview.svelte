<script lang="ts">
    export let template: any = {};
    export let fields: any[] = [];

    let values: Record<string, any> = {};

    function getOptions(field: any) {
        try {
            if (!field.options) return [];
            if (Array.isArray(field.options)) return field.options;
            return JSON.parse(field.options);
        } catch {
            return [];
        }
    }

    function calculateFormula(field: any) {
        if (!field.formula) return "";

        try {
            let formula = field.formula;

            formula = formula.replace(
                /\{([^}]+)\}/g,
                (_, key) => Number(values[key] || 0)
            );

            return Number(Function(`return ${formula}`)()).toFixed(2);
        } catch {
            return "";
        }
    }
</script>

{#each fields as field}

    {#if !field.hidden}

    <div class="item">

        <label>
            {field.label}
            {#if field.required}
                <span>*</span>
            {/if}
        </label>

        {#if field.field_type === "text"}

            <input
                bind:value={values[field.field_name]}
                placeholder={field.placeholder}
                readonly={field.readonly}
            />

        {:else if field.field_type === "number"}

            <input
                type="number"
                bind:value={values[field.field_name]}
                placeholder={field.placeholder}
                readonly={field.readonly}
            />

        {:else if field.field_type === "textarea"}

            <textarea
                rows="3"
                bind:value={values[field.field_name]}
                placeholder={field.placeholder}
                readonly={field.readonly}
            />

        {:else if field.field_type === "date"}

            <input
                type="date"
                bind:value={values[field.field_name]}
            />

        {:else if field.field_type === "time"}

            <input
                type="time"
                bind:value={values[field.field_name]}
            />

        {:else if field.field_type === "dropdown"}

            <select bind:value={values[field.field_name]}>

                <option value="">Select</option>

                {#each getOptions(field) as option}

                    <option value={option}>{option}</option>

                {/each}

            </select>

        {:else if field.field_type === "checkbox"}

            <input
                type="checkbox"
                bind:checked={values[field.field_name]}
            />

        {:else if field.field_type === "formula"}

            <input
                readonly
                value={calculateFormula(field)}
            />

        {:else if field.field_type === "rating"}

            <input
                type="number"
                min="1"
                max="5"
                bind:value={values[field.field_name]}
            />

        {:else if field.field_type === "image"}

            <input type="file" accept="image/*" />

        {:else if field.field_type === "attachment"}

            <input type="file" />

        {:else if field.field_type === "signature"}

            <input
                placeholder="Signature"
                readonly
            />

        {:else if field.field_type === "gps"}

            <input
                placeholder="Current Location"
                readonly
            />

        {:else}

            <input
                bind:value={values[field.field_name]}
            />

        {/if}

    </div>

    {/if}

{/each}

<style>

.preview{

background:white;

border-radius:14px;

padding:24px;

}

.header{

padding-bottom:16px;

border-bottom:1px solid #e5e7eb;

margin-bottom:20px;

}

.header h2{

margin:0;

font-size:24px;

}

.header small{

color:#64748b;

}

.form{

display:grid;

grid-template-columns:repeat(auto-fill,minmax(250px,1fr));

gap:18px;

}

.item{

display:flex;

flex-direction:column;

gap:6px;

}

label{

font-size:13px;

font-weight:600;

color:#374151;

}

label span{

color:red;

}

input,
textarea,
select{

padding:10px 12px;

border:1px solid #d1d5db;

border-radius:8px;

font-size:14px;

outline:none;

}

input:focus,
textarea:focus,
select:focus{

border-color:#2563eb;

box-shadow:0 0 0 3px rgba(37,99,235,.15);

}

.empty{

padding:60px;

text-align:center;

}

.icon{

font-size:60px;

opacity:.35;

margin-bottom:12px;

}

</style>