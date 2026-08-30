<script lang="ts">
import { createEventDispatcher } from "svelte";
import DesignerInfoPanel from "./DesignerInfoPanel.svelte";
import DesignerFieldTable from "./DesignerFieldTable.svelte";
import FieldPropertyPanel from "./FieldPropertyPanel.svelte";
import FieldToolbox from "./FieldToolbox.svelte";
import DesignerPreview from "./DesignerPreview.svelte";

export let templates: any[] = [];
export let template: any = null;

const dispatch = createEventDispatcher();

let saving = false;

function uuid() {
    return crypto.randomUUID?.() ??
        Date.now().toString() +
        Math.random().toString(36).substring(2);
}

function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

/* -------------------------------------------------
   TEMPLATE DATA
--------------------------------------------------*/

let templateData: any = {
    id: "",
    template_code: "",
    name: "",
    description: "",
    category: "Production",
    department: "Production",
    icon: "📊",
    color: "#2563eb",
    version: 1,

    chart_enabled: false,
    chart_type: "bar",
    chart_title: "",
    chart_x: "",
    chart_y: "",

    reference_template: "",

    last_values: {}
};

let fields: any[] = [];

let selectedFieldIndex = 0;

let activeTab: "fields" | "preview" = "fields";

/* -------------------------------------------------
   REQUIRED FIELDS
--------------------------------------------------*/

const requiredFields = [

{
    id: uuid(),

    label: "Shift",

    field_name: "shift",

    metric: "shift",

    field_type: "dropdown",

    required: true,

    readonly: false,

    hidden: false,

    placeholder: "",

    default_value: "",

    formula: "",

    options: JSON.stringify([
        "A",
        "B",
        "C",
        "Day (A+B+C)"
    ])
},

{
    id: uuid(),

    label: "Station",

    field_name: "station",

    metric: "station",

    field_type: "dropdown",

    required: true,

    readonly: false,

    hidden: false,

    placeholder: "",

    default_value: "",

    formula: "",

    options: JSON.stringify([
        "RAT",
        "AotA",
        "SotA",
        "AXI",
        "ICT",
        "FCT",
        "Packing",
        "SMT Line 1",
        "SMT Line 2",
        "Assembly",
        "Repair"
    ])
}

];

/* -------------------------------------------------
   LOAD TEMPLATE ONLY WHEN TEMPLATE CHANGES
--------------------------------------------------*/

let loadedTemplateId = "";

$: {

    if (template?.id) {

        if (loadedTemplateId !== template.id) {

            loadedTemplateId = template.id;

            const data =
                typeof template.data === "string"
                    ? JSON.parse(template.data)
                    : (template.data || {});

            templateData = {

                ...structuredClone(templateData),

                ...template,

                ...structuredClone(data)

            };

            fields = structuredClone(
                data.fields || []
            );

            ensureRequiredFields();

        }

    }
    else {

        if (loadedTemplateId !== "__new__") {

            loadedTemplateId = "__new__";

            templateData = {

                id: "",

                template_code: "",

                name: "",

                description: "",

                category: "Production",

                department: "Production",

                icon: "📊",

                color: "#2563eb",

                version: 1,

                chart_enabled: false,

                chart_type: "bar",

                chart_title: "",

                chart_x: "",

                chart_y: "",

                reference_template: "",

                last_values: {}

            };

            fields = [];

            ensureRequiredFields();

        }

    }

}

/* -------------------------------------------------
   ENSURE REQUIRED FIELDS
--------------------------------------------------*/

function ensureRequiredFields() {

    requiredFields.forEach(req => {

        const exists = fields.some(
            f => f.field_name === req.field_name
        );

        if (!exists) {

            fields.unshift({

                ...structuredClone(req),

                id: uuid(),

                display_order: 0

            });

        }

    });

    fields = fields.map((field, index) => ({

        ...field,

        display_order:
            field.display_order ?? index

    }));

}

/* -------------------------------------------------
   ADD FIELD
--------------------------------------------------*/

function addField(event: any) {

    const type =
        event.detail?.type ?? "text";

    const label =
        event.detail?.label ?? type;

    const baseName =
        slugify(label);

    let fieldName = baseName;

    let metric = "";

    switch (label.toLowerCase()) {

        case "input":
            metric = "input";
            break;

        case "output":
            metric = "output";
            break;

        case "retestqty":
            metric = "retest";
            break;

        case "ntfqty":
            metric = "ntf";
            break;

        case "otqty":
            metric = "ot";
            break;

        case "failqty":
            metric = "fail";
            break;

    }

    let counter = 2;

    while (

        fields.some(
            f => f.field_name === fieldName
        )

    ) {

        fieldName =
            `${baseName}_${counter}`;

        counter++;

    }

    const newField = {

        id: uuid(),

        label,

        field_name: fieldName,

        metric,

        field_type: type,

        placeholder: "",

        required: false,

        readonly: false,

        hidden: false,

        default_value: "",

        formula: "",

        options:
            type === "dropdown"
                ? JSON.stringify([])
                : "",

        min_value: null,

        max_value: null,

        reference_template_id: null,

        display_order: fields.length

    };

    fields = [

        ...fields,

        newField

    ];

    selectedFieldIndex =
        fields.length - 1;

    createFormulaFields();

}

/* -------------------------------------------------
   AUTO KPI
--------------------------------------------------*/

function createFormulaFields() {

    const kpiNames = [

        "yield",

        "rr",

        "ntf",

        "ot",

        "fail"

    ];

    const normalFields =
        fields.filter(
            f => !kpiNames.includes(f.field_name)
        );

    const inputField =
        normalFields.find(
            f => f.metric === "input"
        );

    const outputField =
        normalFields.find(
            f => f.metric === "output"
        );

    const retestField =
        normalFields.find(
            f => f.metric === "retest"
        );

    const ntfField =
        normalFields.find(
            f => f.metric === "ntf"
        );

    const otField =
        normalFields.find(
            f => f.metric === "ot"
        );

    const failField =
        normalFields.find(
            f => f.metric === "fail"
        );

    if (

        !inputField ||

        !outputField

    ) {

        fields = normalFields;

        return;

    }

    const kpiFields = [];

    kpiFields.push({

        id: uuid(),

        label: "Yield",

        field_name: "yield",

        metric: "yield",

        field_type: "formula",

        readonly: true,

        formula:
            `({${outputField.field_name}}/{${inputField.field_name}})*100`,

        default_value: "0",

        display_order:
            normalFields.length +

            kpiFields.length

    });

    if (retestField) {

        kpiFields.push({

            id: uuid(),

            label: "RR",

            field_name: "rr",

            metric: "rr",

            field_type: "formula",

            readonly: true,

            formula:
                `({${retestField.field_name}}/{${inputField.field_name}})*100`,

            default_value: "0",

            display_order:
                normalFields.length +

                kpiFields.length

        });

    }

    if (ntfField) {

        kpiFields.push({

            id: uuid(),

            label: "NTF",

            field_name: "ntf",

            metric: "ntf",

            field_type: "formula",

            readonly: true,

            formula:
                `({${ntfField.field_name}}/{${inputField.field_name}})*100`,

            default_value: "0",

            display_order:
                normalFields.length +

                kpiFields.length

        });

    }

    if (otField) {

        kpiFields.push({

            id: uuid(),

            label: "OT",

            field_name: "ot",

            metric: "ot",

            field_type: "formula",

            readonly: true,

            formula:
                `({${otField.field_name}}/{${inputField.field_name}})*100`,

            default_value: "0",

            display_order:
                normalFields.length +

                kpiFields.length

        });

    }

    if (failField) {

        kpiFields.push({

            id: uuid(),

            label: "Fail",

            field_name: "fail",

            metric: "fail",

            field_type: "formula",

            readonly: true,

            formula:
                `({${failField.field_name}}/{${inputField.field_name}})*100`,

            default_value: "0",

            display_order:
                normalFields.length +

                kpiFields.length

        });

    }

    fields = [

        ...normalFields,

        ...kpiFields

    ];

}

/* -------------------------------------------------
   UPDATE FIELD
--------------------------------------------------*/

function updateField(
    index: number,
    value: any
) {

    fields = fields.map(

        (field, i) =>

            i === index

                ? {

                    ...field,

                    ...value

                }

                : field

    );

    createFormulaFields();

}

/* -------------------------------------------------
   DELETE FIELD
--------------------------------------------------*/

function deleteField(
    index: number
) {

    const field =
        fields[index];

    if (!field)
        return;

    if (

        field.field_name === "shift" ||

        field.field_name === "station"

    ) {

        alert(

            "Shift and Station cannot be deleted."

        );

        return;

    }

    fields =

        fields

            .filter(
                (_, i) => i !== index
            )

            .map(

                (field, i) => ({

                    ...field,

                    display_order: i

                })

            );

    selectedFieldIndex = Math.min(

        selectedFieldIndex,

        Math.max(

            fields.length - 1,

            0

        )

    );

    createFormulaFields();

}

/* -------------------------------------------------
   SAVE TEMPLATE
--------------------------------------------------*/
async function saveTemplate() {

    ensureRequiredFields();
    createFormulaFields();

    templateData.template_code =
        (templateData.template_code || "")
            .trim()
            .toUpperCase();

    templateData.name =
        (templateData.name || "")
            .trim();

    if (!templateData.template_code) {
        alert("Template Code is required");
        return;
    }

    if (!templateData.name) {
        alert("Template Name is required");
        return;
    }

    const duplicate = templates.find(
        (t) =>
            t.template_code?.toUpperCase() ===
                templateData.template_code &&
            t.id !== template?.id
    );

    if (duplicate) {
        alert(
            `Template Code "${templateData.template_code}" already exists`
        );
        return;
    }

    if (fields.length < 2) {
        alert("Please add at least two fields.");
        return;
    }

    const names = new Set<string>();

    for (const field of fields) {

        field.field_name =
            field.field_name
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_");

        if (names.has(field.field_name)) {
            alert(
                `Duplicate Field Name : ${field.field_name}`
            );
            return;
        }

        names.add(field.field_name);
    }

    saving = true;

    const payload = {

        template_code: templateData.template_code,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,

        data: {

            icon: templateData.icon,
            color: templateData.color,
            version: templateData.version,
            department: templateData.department,

            chart_enabled:
                templateData.chart_enabled ?? false,

            chart_type:
                templateData.chart_type ?? "bar",

            chart_title:
                templateData.chart_title ?? "",

            chart_x:
                templateData.chart_x ?? "",

            chart_y:
                templateData.chart_y ?? "",

            reference_template:
                templateData.reference_template || null,

            last_values:
                templateData.last_values || {},

            fields: fields.map((field, index) => ({

                id: field.id,
                label: field.label,
                field_name: field.field_name,
                metric: field.metric || "",

                field_type: field.field_type,

                placeholder:
                    field.placeholder || "",

                required:
                    !!field.required,

                readonly:
                    field.field_type === "formula"
                        ? true
                        : !!field.readonly,

                hidden:
                    !!field.hidden,

                default_value:
                    field.default_value ?? "",

                formula:
                    field.formula ?? "",

                options:
                    typeof field.options === "string"
                        ? field.options
                        : JSON.stringify(
                              field.options || []
                          ),

                min_value:
                    field.min_value,

                max_value:
                    field.max_value,

                display_order:
                    field.display_order ?? index,

                reference_template_id:
                    field.reference_template_id || null
            }))
        }
    };

    try {

        let response;

        if (template?.id) {

            response = await fetch(
                "/api/templates",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        id: template.id,
                        ...payload
                    })
                }
            );

        } else {

            response = await fetch(
                "/api/templates",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

        }

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to save template"
            );
        }

        alert(
            template?.id
                ? "✅ Template Updated Successfully"
                : "✅ Template Created Successfully"
        );

        dispatch("saved", result.data);

    }
    catch (err: any) {

        console.error(err);

        alert(
            err.message ||
            "Save failed"
        );

    }
    finally {

        saving = false;

    }

}
</script>

<div class="designer">

    <div class="header">

        <div class="left">

            <span class="icon">
                {templateData.icon}
            </span>

            <div>

                <input
                    class="title-input"
                    bind:value={templateData.name}
                    placeholder="Template Name"
                />

                <div class="sub">

                    Code :

                    <input
                        class="code-input"
                        bind:value={templateData.template_code}
                        placeholder="AXI01"
                    />

                </div>

            </div>

        </div>

        <div class="actions">

            <button
                class="btn ghost"
                on:click={() => dispatch("close")}
            >
                Cancel
            </button>

            <button
                class="btn primary"
                disabled={saving}
                on:click={saveTemplate}
            >

                {#if saving}
                    Saving...
                {:else if template?.id}
                    💾 Update Template
                {:else}
                    💾 Save Template
                {/if}

            </button>

        </div>

    </div>

    <div class="body">

        <!-- LEFT PANEL -->

        <div class="sidebar">

            <div class="card">

                <h3>Template Information</h3>

                <DesignerInfoPanel
                    bind:template={templateData}
                />

                <div class="field-group">

                    <label>
                        Reference Template
                    </label>

                    <select
                        bind:value={templateData.reference_template}
                    >

                        <option value="">
                            None
                        </option>

                        {#each templates.filter(t => t.id !== templateData.id) as t}

                            <option value={t.id}>
                                {t.name}
                                ({t.template_code})
                            </option>

                        {/each}

                    </select>

                    <small class="hint">

                        Optional.
                        Link another template.

                    </small>

                </div>

            </div>

            <div class="card">

                <h3>Field Toolbox</h3>

                <FieldToolbox
                    on:add={addField}
                />

            </div>

        </div>

        <!-- CENTER PANEL -->

        <div class="main">

            <div class="tabs">

                <button
                    class:active={activeTab === "fields"}
                    on:click={() => activeTab = "fields"}
                >
                    Fields ({fields.length})
                </button>

                <button
                    class:active={activeTab === "preview"}
                    on:click={() => activeTab = "preview"}
                >
                    Preview
                </button>

            </div>

            {#if activeTab === "fields"}

                <div class="card">

                    <DesignerFieldTable
                        {fields}
                        bind:selectedIndex={selectedFieldIndex}
                        on:update={(e) =>
                            updateField(
                                e.detail.index,
                                e.detail.field
                            )
                        }
                        on:delete={(e) =>
                            deleteField(
                                e.detail.index
                            )
                        }
                    />

                    <p class="hint">

                        Required fields:
                        <b>shift</b> and
                        <b>station</b>.

                        <br>

                        Set Metric as:

                        input /
                        output /
                        retest /
                        ntf /
                        ot /
                        fail

                        to auto-create KPI formulas.

                    </p>

                </div>

            {:else}

                <div class="card">

                    <DesignerPreview
                        template={templateData}
                        {fields}
                    />

                </div>

            {/if}

        </div>

        <!-- RIGHT PANEL -->

        <div class="sidebar">

            <div class="card">

                <h3>Field Properties</h3>

                {#if fields[selectedFieldIndex]}

                    <FieldPropertyPanel

                        field={fields[selectedFieldIndex]}
                        templates={templates}

                        on:update={(e) =>
                            updateField(
                                selectedFieldIndex,
                                e.detail
                            )
                        }

                    />

                {:else}

                    <div class="empty">

                        Select a field

                    </div>

                {/if}

            </div>

        </div>

    </div>

</div>

<style>
.designer{
    width:95vw;
    max-width:1500px;
    height:90vh;

    background:#f8fafc;

    border-radius:16px;

    overflow:hidden;

    display:flex;
    flex-direction:column;

    box-shadow:0 10px 40px rgba(0,0,0,.15);
}

/* ------------------------------------------------- */

.header{

    display:flex;

    justify-content:space-between;

    align-items:center;

    padding:18px 24px;

    background:white;

    border-bottom:1px solid #e5e7eb;

}

/* ------------------------------------------------- */

.left{

    display:flex;

    align-items:center;

    gap:14px;

}

.icon{

    font-size:30px;

    background:#eff6ff;

    width:54px;

    height:54px;

    display:flex;

    justify-content:center;

    align-items:center;

    border-radius:12px;

}

.title-input{

    border:none;

    outline:none;

    background:transparent;

    font-size:20px;

    font-weight:700;

    width:320px;

}

.sub{

    margin-top:6px;

    color:#64748b;

    font-size:13px;

}

.code-input{

    width:130px;

    margin-left:8px;

    padding:5px 8px;

    border:1px solid #d1d5db;

    border-radius:6px;

    text-transform:uppercase;

}

/* ------------------------------------------------- */

.actions{

    display:flex;

    gap:10px;

}

.btn{

    border:none;

    cursor:pointer;

    border-radius:8px;

    padding:10px 20px;

    font-weight:600;

    transition:.2s;

}

.btn.primary{

    background:#2563eb;

    color:white;

}

.btn.primary:hover{

    background:#1d4ed8;

}

.btn.primary:disabled{

    opacity:.5;

    cursor:not-allowed;

}

.btn.ghost{

    background:#f3f4f6;

}

.btn.ghost:hover{

    background:#e5e7eb;

}

/* ------------------------------------------------- */

.body{

    flex:1;

    display:grid;

    grid-template-columns:

        300px
        1fr
        340px;

    gap:16px;

    padding:16px;

    overflow:hidden;

}

/* ------------------------------------------------- */

.sidebar{

    display:flex;

    flex-direction:column;

    gap:16px;

    overflow:auto;

}

.main{

    display:flex;

    flex-direction:column;

    gap:12px;

    overflow:auto;

}

/* ------------------------------------------------- */

.card{

    background:white;

    border:1px solid #e5e7eb;

    border-radius:12px;

    padding:16px;

}

.card h3{

    margin:0 0 14px;

    color:#334155;

    font-size:15px;

}

/* ------------------------------------------------- */

.tabs{

    display:flex;

    gap:6px;

    background:white;

    border:1px solid #e5e7eb;

    border-radius:10px;

    padding:6px;

}

.tabs button{

    flex:1;

    border:none;

    background:transparent;

    cursor:pointer;

    border-radius:8px;

    padding:10px;

    font-weight:600;

}

.tabs button:hover{

    background:#eff6ff;

}

.tabs button.active{

    background:#2563eb;

    color:white;

}

/* ------------------------------------------------- */

.field-group{

    display:flex;

    flex-direction:column;

    gap:6px;

    margin-top:14px;

}

.field-group label{

    font-size:13px;

    font-weight:600;

}

.field-group input,
.field-group select{

    padding:9px;

    border-radius:8px;

    border:1px solid #d1d5db;

}

.field-group input:focus,
.field-group select:focus{

    outline:none;

    border-color:#2563eb;

}

/* ------------------------------------------------- */

.empty{

    color:#94a3b8;

    padding:50px 0;

    text-align:center;

}

.hint{

    display:block;

    margin-top:12px;

    color:#64748b;

    font-size:12px;

    line-height:1.6;

}

/* ------------------------------------------------- */

::-webkit-scrollbar{

    width:8px;

    height:8px;

}

::-webkit-scrollbar-thumb{

    background:#cbd5e1;

    border-radius:8px;

}

::-webkit-scrollbar-thumb:hover{

    background:#94a3b8;

}

/* ------------------------------------------------- */

@media(max-width:1200px){

.body{

grid-template-columns:

280px
1fr;

}

.sidebar:last-child{

display:none;

}

}

@media(max-width:900px){

.header{

flex-direction:column;

align-items:flex-start;

gap:14px;

}

.actions{

width:100%;

}

.actions button{

flex:1;

}

.body{

display:flex;

flex-direction:column;

}

.title-input{

width:100%;

}

}
</style>