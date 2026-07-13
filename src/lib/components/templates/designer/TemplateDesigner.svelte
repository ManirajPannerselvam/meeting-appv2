<script lang="ts">
    import { createEventDispatcher } from "svelte";

    import DesignerHeader from "./DesignerHeader.svelte";
    import DesignerInfoPanel from "./DesignerInfoPanel.svelte";
    import DesignerFieldTable from "./DesignerFieldTable.svelte";
    import FieldPropertyPanel from "./FieldPropertyPanel.svelte";
    import FieldToolbox from "./FieldToolbox.svelte";
    import DesignerPreview from "./DesignerPreview.svelte";

    const dispatch = createEventDispatcher();

    let template = {
        id: null,
        template_code: "",
        name: "",
        department: "Production",
        category: "Daily Report",
        version: 1,
        icon: "📊",
        description: "",
        color: "#2563eb"
    };

    let fields: any[] = [];
    let selectedFieldIndex = 0;

    function addField(e: any) {
        const field = {
            name: e.detail?.name?? "",
            label: e.detail?.label?? e.detail?.name?? "",
            type: e.detail?.type?? "text",
            placeholder: "",
            required: false,
            readonly: false,
            hidden: false,
            defaultValue: "",
            formula: "",
            options_json: "",
            min_value: null,
            max_value: null
        };
        fields = [...fields, field];
        selectedFieldIndex = fields.length - 1;
    }

    function updateField(index: number, value: any) {
        fields[index] = value;
        fields = [...fields];
    }

    function deleteField(index: number) {
        fields.splice(index, 1);
        fields = [...fields];
        if (selectedFieldIndex >= fields.length) {
            selectedFieldIndex = Math.max(0, fields.length - 1);
        }
    }

    async function saveTemplate() {
        if (!template.template_code.trim()) {
            alert("Template Code required");
            return;
        }
        if (!template.name.trim()) {
            alert("Template Name required");
            return;
        }
        if (fields.length === 0) {
            alert("Add at least one field");
            return;
        }

        const res = await fetch("/api/templates", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
               ...template,
                fields
            })
        });

        if (res.ok) {
            dispatch("saved");
        } else {
            alert("Unable to save template");
        }
    }
</script>

<div class="designer">
    <DesignerHeader
        templateName={template.name}
        version={`v${template.version}`}
        draft={true}
        on:save={saveTemplate}
        on:close={() => dispatch("close")}
    />

    <div class="content">

        <!-- LEFT -->
        <aside class="left-column">

            <div class="card">

                <DesignerInfoPanel
                    bind:template
                />

            </div>

        </aside>

        <!-- CENTER -->

        <main class="center-column">

            <div class="card">

                <FieldToolbox
                    on:add={addField}
                />

            </div>

            <div class="card field-card">

                <DesignerFieldTable
                    bind:fields
                    bind:selectedIndex={selectedFieldIndex}
                    on:add={addField}
                    on:delete={(e)=>deleteField(e.detail)}
                />

            </div>

        </main>

        <!-- RIGHT -->

        <aside class="right-column">

            <div class="card property-card">

                {#if fields.length>0}

                    <FieldPropertyPanel
                        field={fields[selectedFieldIndex]}
                        on:update={(e)=>updateField(selectedFieldIndex,e.detail)}
                    />

                {:else}

                    <div class="empty-panel">

                        <div class="empty-icon">
                            ⚙️
                        </div>

                        <h3>No Field Selected</h3>

                    </div>

                {/if}

            </div>

        </aside>

    </div>

    <!-- PREVIEW -->

    <section class="preview-section">

        <div class="preview-header">

            <h2>
                👁 Live Form Preview
            </h2>

            <small>
                This is how users will see the form.
            </small>

        </div>

        <div class="preview-card">

            <DesignerPreview
                {template}
                {fields}
            />

        </div>

    </section>

</div>

<style>
:global(body){
    margin:0;
    background:#eef3f9;
    font-family:Inter,"Segoe UI",sans-serif;
}

/* ==========================
DESIGNER
========================== */

.designer{
    height:100vh;
    display:flex;
    flex-direction:column;
    background:#f4f7fb;
    overflow:hidden;
}

/* ==========================
MAIN GRID
========================== */

.content{
    flex:1;
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:18px;
    padding:18px;
    overflow:hidden;
}

/* ==========================
COLUMNS
========================== */

.left-column,
.center-column,
.right-column{
    display:flex;
    flex-direction:column;
    gap:16px;
    overflow:auto;
    min-height:0;
}
/* ==========================
CARDS
========================== */

.card{
    background:#fff;
    border-radius:16px;
    display:flex;
    flex-direction:column;
    overflow:visible;
    min-height:fit-content;
}

.toolbox-card{
    min-height:220px;
}

.field-card{
    min-height:350px;
    overflow:auto;
}
.property-card{
    flex:1;
}

/* ==========================
CARD HEADER
========================== */

.card-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:14px 18px;
    border-bottom:1px solid #edf2f7;
    background:#fafbfc;
}

.card-header h2{
    margin:0;
    font-size:16px;
    color:#111827;
}

.card-header span{
    font-size:13px;
    color:#64748b;
    background:#e2e8f0;
    padding:4px 10px;
    border-radius:20px;
}

/* ==========================
EMPTY PANEL
========================== */

.empty-panel{
    flex:1;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    text-align:center;
    color:#64748b;
    padding:30px;
}

.empty-icon{
    font-size:60px;
    opacity:.3;
    margin-bottom:18px;
}

.empty-panel h3{
    margin:0 0 10px;
    font-size:20px;
    color:#1f2937;
}

.empty-panel p{
    margin:0;
    line-height:1.6;
    font-size:14px;
}

/* ==========================
PREVIEW
========================== */

.preview-section{
    padding:0 18px 18px;
}

.preview-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:12px;
}

.preview-header h2{
    margin:0;
    font-size:18px;
}

.preview-header small{
    color:#6b7280;
}

.preview-card{
    background:#fff;
    border-radius:16px;
    border:1px solid #e5e7eb;
    box-shadow:0 5px 18px rgba(15,23,42,.08);
    min-height:260px;
    max-height:280px;
    overflow:auto;
    padding:20px;
}

/* ==========================
SCROLLBAR
========================== */

::-webkit-scrollbar{
    width:8px;
    height:8px;
}

::-webkit-scrollbar-thumb{
    background:#cbd5e1;
    border-radius:20px;
}

::-webkit-scrollbar-track{
    background:transparent;
}

/* ==========================
RESPONSIVE
========================== */

@media(max-width:1500px){
   .content{
        grid-template-columns:300px 1fr 320px;
    }
}

@media(max-width:1300px){
   .content{
        grid-template-columns:280px 1fr;
    }
   .right-column{
        display:none;
    }
}

@media(max-width:900px){
   .content{
        grid-template-columns:1fr;
    }
   .preview-card{
        min-height:320px;
    }
}
</style>