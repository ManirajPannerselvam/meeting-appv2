<script lang="ts">
    export let template: any = {};
    export let fields: any[] = [];

    let values: Record<string, any> = {};

    function calculateFormula(field: any) {
        if (!field.formula) return "";

        try {
            const expr = field.formula.replace(
                /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
                (m) => values[m] ?? 0
            );

            return Function(`return ${expr}`)();
        } catch {
            return "";
        }
    }
</script>

<div class="preview">

    <div class="header">

        <div>

            <h2>{template.name || "Untitled Template"}</h2>

            <small>

                {template.department} • Version {template.version}

            </small>

        </div>

    </div>

    {#if fields.length===0}

        <div class="empty">

            <div class="icon">📄</div>

            <h3>No fields configured</h3>

            <p>

                Add fields from the toolbox to preview the form.

            </p>

        </div>

    {:else}

        <div class="form">

            {#each fields as field}

                {#if !field.hidden}

                <div class="item">

                    <label>

                        {field.label}

                        {#if field.required}

                            <span>*</span>

                        {/if}

                    </label>

                    {#if field.type==="text"}

                        <input
                            bind:value={values[field.name]}
                            placeholder={field.placeholder}
                            readonly={field.readonly}
                        />

                    {:else if field.type==="number"}

                        <input
                            type="number"
                            bind:value={values[field.name]}
                            placeholder={field.placeholder}
                            readonly={field.readonly}
                        />

                    {:else if field.type==="textarea"}

                        <textarea
                            rows="3"
                            bind:value={values[field.name]}
                            placeholder={field.placeholder}
                            readonly={field.readonly}
                        />

                    {:else if field.type==="date"}

                        <input
                            type="date"
                            bind:value={values[field.name]}
                        />

                    {:else if field.type==="time"}

                        <input
                            type="time"
                            bind:value={values[field.name]}
                        />

                    {:else if field.type==="dropdown"}

                        <select
                            bind:value={values[field.name]}
                        >

                            <option>

                                Select

                            </option>

                            {#each (field.options_json || "").split(",") as op}

                                {#if op.trim()}

                                    <option>

                                        {op.trim()}

                                    </option>

                                {/if}

                            {/each}

                        </select>

                    {:else if field.type==="formula"}

                        <input
                            readonly
                            value={calculateFormula(field)}
                        />

                    {/if}

                </div>

                {/if}

            {/each}

        </div>

    {/if}

</div>

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