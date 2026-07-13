<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let field: any = {};

    const dispatch = createEventDispatcher();

    function update() {
        dispatch("update", { ...field });
    }
</script>

<div class="panel">

    <div class="title">
        <h2>⚙ Field Properties</h2>
        <small>Edit the selected field</small>
    </div>

    <!-- BASIC -->

    <div class="section">

        <h3>Basic</h3>

        <label>Label</label>
        <input
            bind:value={field.label}
            on:input={update}
        />

        <label>Field Name</label>
        <input
            bind:value={field.name}
            on:input={update}
        />

        <label>Type</label>

        <select
            bind:value={field.type}
            on:change={update}
        >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="textarea">Textarea</option>
            <option value="date">Date</option>
            <option value="time">Time</option>
            <option value="dropdown">Dropdown</option>
            <option value="formula">Formula</option>
        </select>

        <label>Placeholder</label>

        <input
            bind:value={field.placeholder}
            on:input={update}
        />

    </div>

    <!-- VALIDATION -->

    <div class="section">

        <h3>Validation</h3>

        <div class="check">

            <input
                type="checkbox"
                bind:checked={field.required}
                on:change={update}
            />

            Required

        </div>

        <div class="check">

            <input
                type="checkbox"
                bind:checked={field.readonly}
                on:change={update}
            />

            Read Only

        </div>

        <div class="check">

            <input
                type="checkbox"
                bind:checked={field.hidden}
                on:change={update}
            />

            Hidden

        </div>

    </div>

    <!-- FORMULA -->

    {#if field.type==="formula"}

    <div class="section">

        <h3>Formula</h3>

        <textarea
            rows="4"
            bind:value={field.formula}
            placeholder="(output/input)*100"
            on:input={update}
        />

    </div>

    {/if}

    <!-- DEFAULT -->

    <div class="section">

        <h3>Default Value</h3>

        <input
            bind:value={field.defaultValue}
            on:input={update}
        />

    </div>

</div>

<style>

.panel{
    display:flex;
    flex-direction:column;
    gap:18px;
    padding:18px;
}

.title h2{
    margin:0;
    font-size:18px;
}

.title small{
    color:#64748b;
}

.section{
    background:#f8fafc;
    border-radius:12px;
    padding:14px;
    border:1px solid #e5e7eb;
}

.section h3{
    margin:0 0 12px;
    font-size:14px;
    color:#2563eb;
}

label{
    display:block;
    font-size:12px;
    margin:8px 0 4px;
    color:#64748b;
    font-weight:600;
}

input,
textarea,
select{
    width:100%;
    box-sizing:border-box;
    padding:9px 10px;
    border-radius:8px;
    border:1px solid #d1d5db;
    font-size:13px;
    outline:none;
}

input:focus,
textarea:focus,
select:focus{
    border-color:#2563eb;
    box-shadow:0 0 0 3px rgba(37,99,235,.15);
}

.check{
    display:flex;
    align-items:center;
    gap:8px;
    margin-bottom:10px;
}

.check input{
    width:auto;
}

textarea{
    resize:vertical;
}

</style>