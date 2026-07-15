<script lang="ts">
import { createEventDispatcher } from "svelte";

export let field: any = null;
export let templates: any[] = [];

const dispatch = createEventDispatcher();

function update() {
    dispatch("update", {...field });
}

function updateLabel() {
    if (!field.label) return;
    // Auto generate field_name from label if empty
    if (!field.field_name || field.field_name.trim() === "") {
        field.field_name = field.label
           .trim()
           .toLowerCase()
           .replace(/\s+/g, "_")
           .replace(/[^a-z0-9_]/g, "");
    }
    update();
}

function stringifyOptions(value: any) {
    return JSON.stringify(value, null, 2);
}

$: if (field && field.field_type === "dropdown" && typeof field.options !== "string") {
    field.options = stringifyOptions(field.options || []);
}

// FIX: Force readonly for formula fields
$: if(field?.field_type === "formula"){
    if(!field.readonly) {
        field.readonly = true;
        update();
    }
}
</script>

<div class="panel">
    {#if field}
        <h3>Field Properties</h3>

        <!-- BASIC -->
        <label>Label</label>
        <input type="text" bind:value={field.label} on:input={updateLabel} placeholder="Field Label" />

        <label>Field Name</label>
        <input type="text" bind:value={field.field_name} on:input={update} placeholder="field_name" />
        <small class="hint">Used in formulas. Lowercase, no spaces.</small>

        <!-- FIX 9: METRIC -->
        <label>Metric Type</label>
        <select bind:value={field.metric} on:change={update}>
            <option value="">-- None --</option>
            <option value="input">Input</option>
            <option value="output">Output</option>
            <option value="retest">Retest</option>
            <option value="ntf">NTF</option>
            <option value="ot">OT</option>
            <option value="fail">Fail</option>
            <option value="shift">Shift</option>
            <option value="station">Station</option>
        </select>
        <small class="hint">Set this to enable auto KPI formulas. KPIs use Metric, not Label.</small>

        <label>Field Type</label>
        <select bind:value={field.field_type} on:change={update}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="time">Time</option>
            <option value="dropdown">Dropdown</option>
            <option value="reference">Reference</option>
            <option value="formula">Formula</option>
        </select>

        <label>Placeholder</label>
        <input type="text" bind:value={field.placeholder} on:input={update} />

        <label>Default Value</label>
        <input type="text" bind:value={field.default_value} on:input={update} />

        <!-- VALIDATION -->
        <h4>Validation</h4>
        <div class="check">
            <input type="checkbox" bind:checked={field.required} on:change={update} id="req" />
            <label for="req">Required</label>
        </div>
        <div class="check">
            <input type="checkbox" bind:checked={field.readonly} on:change={update} id="ro" disabled={field.field_type === "formula"} />
            <label for="ro">Readonly</label>
        </div>
        <div class="check">
            <input type="checkbox" bind:checked={field.hidden} on:change={update} id="hid" />
            <label for="hid">Hidden</label>
        </div>

        <!-- NUMBER -->
        {#if field.field_type === "number"}
            <h4>Number Settings</h4>
            <label>Minimum Value</label>
            <input type="number" bind:value={field.min_value} on:input={update} />

            <label>Maximum Value</label>
            <input type="number" bind:value={field.max_value} on:input={update} />
        {/if}

        <!-- DROPDOWN -->
        {#if field.field_type === "dropdown"}
            <h4>Dropdown Options</h4>
            <textarea
                rows="7"
                bind:value={field.options}
                on:input={update}
                placeholder='[
  "Option 1",
  "Option 2"
]'
            ></textarea>
            <small class="hint">
                Enter one valid JSON array.
<pre>[
  "RAT",
  "AOTA",
  "SOTA"
]</pre>
            </small>
        {/if}

        <!-- REFERENCE -->
        {#if field.field_type === "reference"}
            <h4>Reference Template</h4>
            <select bind:value={field.reference_template_id} on:change={update}>
                <option value="">-- Select Template --</option>
                {#each templates as t}
                    <option value={t.id}>{t.name} ({t.template_code})</option>
                {/each}
            </select>
            <small class="hint">Pulls values from another template</small>
        {/if}

        <!-- FORMULA -->
        {#if field.field_type === "formula"}
            <h4>Formula</h4>
            <textarea
                rows="6"
                bind:value={field.formula}
                on:input={update}
                placeholder="({output}/{input})*100"
            ></textarea>
            <small class="hint">
                Use field names inside braces.
Examples
<pre>
({output}/{input})*100
({retestqty}/{input})*100
({failqty}/{input})*100
({ntfqty}/{input})*100
({otqty}/{input})*100
</pre>
            </small>
        {/if}

    {:else}
        <div class="empty">
            Select a field to edit.
        </div>
    {/if}
</div>

<style>
.panel{
    display:flex;
    flex-direction:column;
    gap:12px;
}

.panel h3{
    margin:0;
    font-size:18px;
    font-weight:700;
}

.panel h4{
    margin-top:16px;
    margin-bottom:8px;
    padding-bottom:4px;
    border-bottom:1px solid #e5e7eb;
    color:#2563eb;
    font-size:14px;
    font-weight:700;
}

label{
    font-size:13px;
    font-weight:600;
    color:#374151;
}

input,
select,
textarea{
    width:100%;
    padding:10px;
    border:1px solid #d1d5db;
    border-radius:8px;
    font-size:14px;
    box-sizing:border-box;
    background:white;
    transition:.2s;
}

input:focus,
select:focus,
textarea:focus{
    outline:none;
    border-color:#2563eb;
    box-shadow:0 0 0 3px rgba(37,99,235,.12);
}

textarea{
    resize:vertical;
    font-family:Consolas, monospace;
    line-height:1.45;
}

.check{
    display:flex;
    align-items:center;
    gap:10px;
    margin:4px 0;
}

.check input{
    width:auto;
}

.hint{
    display:block;
    margin-top:8px;
    padding:12px;
    background:#f8fafc;
    border:1px solid #e2e8f0;
    border-radius:8px;
    font-size:12px;
    line-height:1.6;
    color:#475569;
}

.hint code{
    background:#dbeafe;
    color:#1d4ed8;
    padding:2px 6px;
    border-radius:4px;
}

.hint pre{
    margin-top:8px;
    background:#0f172a;
    color:#22c55e;
    padding:10px;
    border-radius:6px;
    overflow:auto;
    font-size:12px;
}

.empty{
    padding:40px;
    text-align:center;
    color:#94a3b8;
    border:1px dashed #cbd5e1;
    border-radius:10px;
    background:#f8fafc;
}

small{
    color:#64748b;
}

::-webkit-scrollbar{
    width:8px;
}

::-webkit-scrollbar-thumb{
    background:#cbd5e1;
    border-radius:10px;
}

::-webkit-scrollbar-thumb:hover{
    background:#94a3b8;
}
</style>