<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let selectedField: any = {
        field_label: "",
        field_name: "",
        field_type: "text",
        placeholder: "",
        required: false,
        readonly: false,
        hidden: false,
        formula: "",
        defaultValue: "",
        min_value: "",
        max_value: ""
    };

    const dispatch = createEventDispatcher();

    const fieldTypes = [
        "text",
        "number",
        "textarea",
        "date",
        "time",
        "dropdown",
        "checkbox",
        "formula"
    ];

    function update() {
        dispatch("change", { ...selectedField });
    }
</script>

<div class="panel">

    <h3>⚙ Field Properties</h3>
    <small>Edit the selected field</small>

    <h4>Basic</h4>

    <label>Label</label>
    <input
        bind:value={selectedField.field_label}
        on:input={update}
    >

    <label>Field Name</label>
    <input
        bind:value={selectedField.field_name}
        placeholder="Example: Input"
        on:input={update}
    >

    <label>Type</label>

    <select
        bind:value={selectedField.field_type}
        on:change={update}
    >
        {#each fieldTypes as t}
            <option value={t}>
                {t}
            </option>
        {/each}
    </select>

    <label>Placeholder</label>

    <input
        bind:value={selectedField.placeholder}
        on:input={update}
    >

    <h4>Validation</h4>

    <label class="check">
        <input
            type="checkbox"
            bind:checked={selectedField.required}
            on:change={update}
        >
        Required
    </label>

    <label class="check">
        <input
            type="checkbox"
            bind:checked={selectedField.readonly}
            on:change={update}
        >
        Read Only
    </label>

    <label class="check">
        <input
            type="checkbox"
            bind:checked={selectedField.hidden}
            on:change={update}
        >
        Hidden
    </label>

    {#if selectedField.field_type === "formula"}

        <h4>Formula</h4>

        <input
            bind:value={selectedField.formula}
            placeholder="(RetestQty/Input)*100"
            on:input={update}
        >

    {/if}

    <h4>Default Value</h4>

    <input
        bind:value={selectedField.defaultValue}
        on:input={update}
    >

    <label>Minimum</label>

    <input
        type="number"
        bind:value={selectedField.min_value}
        on:input={update}
    >

    <label>Maximum</label>

    <input
        type="number"
        bind:value={selectedField.max_value}
        on:input={update}
    >

</div>

<style>
.panel{
    padding:20px;
}

label{
    display:block;
    margin-top:14px;
    font-weight:600;
}

input,
select{
    width:100%;
    padding:10px;
    margin-top:5px;
    border:1px solid #ddd;
    border-radius:8px;
    box-sizing:border-box;
}

.check{
    display:flex;
    align-items:center;
    gap:8px;
    margin-top:10px;
}

.check input{
    width:auto;
}

h4{
    margin-top:20px;
    margin-bottom:8px;
}
</style>