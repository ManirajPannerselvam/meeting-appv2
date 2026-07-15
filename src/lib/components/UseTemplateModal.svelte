<script lang="ts">
import { createEventDispatcher, tick } from "svelte";

const dispatch = createEventDispatcher();

export let template: any;
export let show = false;

let fields: any[] = [];
let formData: Record<string, any> = {};
let initializedFor = "";
let error = "";

function safeNumber(v: any) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

$: fields = template?.fields || template?.data?.fields || [];

$: if (
    template?.id &&
    template.id !== initializedFor &&
    fields.length
) {
    initializedFor = template.id;

    formData = {};

    fields.forEach((field: any) => {
        const saved =
            template?.data?.last_values?.[field.field_name];

        formData[field.field_name] =
            saved ??
            field.default_value ??
            "";
    });

    tick().then(() => calculateFormulas());
}

function calculateFormulas() {
    const next = { ...formData };
    let changed = false;

    fields.forEach((field: any) => {

        if (field.field_type !== "formula") return;
        if (!field.formula) return;

        try {

            let expr = field.formula;

            fields.forEach((ref: any) => {
                expr = expr.replace(
                    new RegExp(`\\{${ref.field_name}\\}`, "g"),
                    safeNumber(next[ref.field_name]).toString()
                );
            });

            const value = Function(
                `"use strict";return (${expr})`
            )();

            const result = Number(value).toFixed(2);

            if (next[field.field_name] !== result) {
                next[field.field_name] = result;
                changed = true;
            }

        } catch {

            if (next[field.field_name] !== "0.00") {
                next[field.field_name] = "0.00";
                changed = true;
            }

        }

    });

    if (changed) {
        formData = next;
    }
}

function handleInput(field: any, e: Event) {

    const target = e.target as HTMLInputElement;

    formData = {
        ...formData,
        [field.field_name]:
            field.field_type === "number"
                ? Number(target.value || 0)
                : target.value
    };
}

function parseOptions(field: any) {

    try {
        return JSON.parse(field.options || "[]");
    } catch {
        return [];
    }

}

function validate() {

    for (const field of fields) {

        if (
            field.required &&
            (
                formData[field.field_name] === "" ||
                formData[field.field_name] === null ||
                formData[field.field_name] === undefined
            )
        ) {
            return `${field.label} is required`;
        }

    }

    return "";

}

function buildMessage() {

    let msg = `*${template.name}*\n\n`;

    [...fields]
        .sort((a, b) => a.display_order - b.display_order)
        .forEach((field: any) => {

            msg += `*${field.label}:* ${formData[field.field_name] ?? ""}\n`;

        });

    return msg;

}

function handleShare() {

    error = validate();

    if (error) {
        alert(error);
        return;
    }

    dispatch("submit", {

        template,

        values: JSON.parse(JSON.stringify(formData)),

        message: buildMessage()

    });

    dispatch("close");

}
</script>


{#if show && template}
<div class="overlay">

<div class="form-card">

    <div class="header">
        <h2>{template.name}</h2>

        <button
            class="close-btn"
            on:click={() => dispatch("close")}
        >
            ✕
        </button>
    </div>

    {#if fields.length === 0}

        <div class="empty">
            No fields found.
        </div>

    {:else}

        <div class="fields">

            {#each [...fields].sort((a,b)=>a.display_order-b.display_order) as field}

                <div class="field">

                    <label>
                        {field.label}
                        {#if field.required}
                            *
                        {/if}
                    </label>

                    {#if field.field_type === "dropdown"}

                        <select
                            value={formData[field.field_name]}
                            on:change={(e)=>handleInput(field,e)}
                        >
                            <option value="">
                                Select...
                            </option>

                            {#each parseOptions(field) as opt}
                                <option value={opt}>
                                    {opt}
                                </option>
                            {/each}

                        </select>

                    {:else if field.field_type === "formula"}

                        <input
                            type="text"
                            readonly
                            class="readonly"
                            value={formData[field.field_name]}
                        />

                    {:else if field.field_type === "number"}

                        <input
                            type="number"
                            step="any"
                            value={formData[field.field_name]}
                            on:input={(e)=>handleInput(field,e)}
                            placeholder={field.placeholder}
                        />

                    {:else}

                        <input
                            type="text"
                            value={formData[field.field_name]}
                            on:input={(e)=>handleInput(field,e)}
                            placeholder={field.placeholder}
                        />

                    {/if}

                </div>

            {/each}

        </div>

        <div class="preview">

            <h3>Preview</h3>

            <pre>{buildMessage()}</pre>

        </div>

    {/if}

    <div class="footer">

        <button
            class="btn-secondary"
            on:click={() => dispatch("close")}
        >
            Cancel
        </button>

        <button
            class="btn-primary"
            disabled={!fields.length}
            on:click={handleShare}
        >
            Send Report
        </button>

    </div>

</div>

</div>
{/if}


<style>
.overlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:10000;
}

.form-card{
    width:700px;
    max-width:95vw;
    max-height:90vh;
    background:#fff;
    border-radius:14px;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    box-shadow:0 10px 30px rgba(0,0,0,.25);
}

.header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:18px 20px;
    border-bottom:1px solid #e5e7eb;
}

.header h2{
    margin:0;
    font-size:20px;
    font-weight:600;
}

.close-btn{
    border:none;
    background:none;
    cursor:pointer;
    font-size:22px;
}

.fields{
    flex:1;
    overflow:auto;
    padding:20px;
    display:flex;
    flex-direction:column;
    gap:16px;
}

.field{
    display:flex;
    flex-direction:column;
}

.field label{
    font-weight:600;
    margin-bottom:6px;
    font-size:14px;
}

.field input,
.field select{
    border:1px solid #d1d5db;
    border-radius:8px;
    padding:10px 12px;
    font-size:14px;
}

.field input:focus,
.field select:focus{
    outline:none;
    border-color:#2563eb;
}

.readonly{
    background:#f3f4f6;
}

.preview{
    margin:0 20px 20px;
    background:#f8fafc;
    border-radius:10px;
    padding:14px;
}

.preview h3{
    margin:0 0 10px;
    font-size:15px;
}

.preview pre{
    margin:0;
    white-space:pre-wrap;
    word-break:break-word;
    font-family:monospace;
    font-size:13px;
}

.footer{
    display:flex;
    justify-content:flex-end;
    gap:10px;
    padding:18px 20px;
    border-top:1px solid #e5e7eb;
}

.btn-primary{
    background:#2563eb;
    color:white;
    border:none;
    border-radius:8px;
    padding:10px 20px;
    cursor:pointer;
    font-weight:600;
}

.btn-primary:hover{
    background:#1d4ed8;
}

.btn-primary:disabled{
    opacity:.5;
    cursor:not-allowed;
}

.btn-secondary{
    background:#e5e7eb;
    border:none;
    border-radius:8px;
    padding:10px 20px;
    cursor:pointer;
    font-weight:600;
}

.btn-secondary:hover{
    background:#d1d5db;
}

.empty{
    padding:50px;
    text-align:center;
    color:#888;
}
</style>