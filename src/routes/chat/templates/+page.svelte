<script lang="ts">
import { onMount } from "svelte";
import {
    saveTemplate,
    getTemplates
} from "$lib/db/database";
    import { goto } from "$app/navigation";

    let search = "";

    let templateName = "";
    let department = "Production";

    let fieldName = "";
    let fieldType = "text";
    let fieldColor = "#2563eb";
    let formula = "";

    let chartType = "line";
    let chartX = "";
    let chartY = "";

    let fields: any[] = [];

    let templates: any[] = [];
onMount(async () => {

    templates = await getTemplates();

});

    function addField() {

        if (!fieldName.trim()) return;

        fields = [
            ...fields,
            {
                name: fieldName,
                type: fieldType,
                color: fieldColor,
                formula
            }
        ];

        fieldName = "";
        formula = "";
        fieldColor = "#2563eb";
        fieldType = "text";
    }

    async function createTemplate() {

    if (!templateName.trim()) {
        alert("Enter Template Name");
        return;
    }

    await saveTemplate({

        name: templateName,

        department,

        chart: chartType,

        fields

    });

    templates = await getTemplates();

    alert("Template Saved");

    templateName = "";

    fields = [];

    chartType = "line";

    chartX = "";

    chartY = "";

}
    function openTemplate(t: any) {

        templateName = t.name;
        department = t.department;
        chartType = t.chart;
        fields = [...t.fields];

    }
</script>
<div class="page">

    <!-- LEFT SIDEBAR -->
    <aside class="sidebar">

        <h2>📁 EMS Templates</h2>

        <button class="menu active">📈 Production</button>
        <button class="menu">🔍 Quality</button>
        <button class="menu">🛠 Engineering</button>
        <button class="menu">⚙ Maintenance</button>
        <button class="menu">🔄 Shift Handover</button>
        <button class="menu">📊 KPI Dashboard</button>
        <button class="menu">📦 Material</button>
        <button class="menu">🚨 Escalation</button>

    </aside>

    <!-- CENTER -->
    <main class="content">

        <div class="header">

            <div>

                <h1>EMS Communication Template Designer</h1>

                <small>Create production & communication templates</small>

            </div>

            <input
                class="search"
                bind:value={search}
                placeholder="🔍 Search Template..."
            />

        </div>

        <!-- Template Information -->

        <div class="card">

            <h2>📄 Template Information</h2>

            <div class="grid">

                <input
                    bind:value={templateName}
                    placeholder="Template Name"
                />

                <select bind:value={department}>

                    <option>Production</option>
                    <option>Quality</option>
                    <option>Engineering</option>
                    <option>Maintenance</option>
                    <option>Material</option>
                    <option>Management</option>

                </select>

            </div>

        </div>

        <!-- Field Designer -->

        <div class="card">

            <h2>➕ Field Designer</h2>

            <div class="grid">

                <input
                    bind:value={fieldName}
                    placeholder="Field Name"
                />

                <select bind:value={fieldType}>

                    <option value="text">📝 Text</option>
                    <option value="number">123 Number</option>
                    <option value="date">📅 Date</option>
                    <option value="formula">🧮 Formula</option>

                </select>

                <input
                    type="color"
                    bind:value={fieldColor}
                />

                <input
                    bind:value={formula}
                    placeholder="Formula (Optional)"
                />

            </div>

            <button
                class="primary"
                on:click={addField}
            >

                ➕ Add Field

            </button>

        </div>
        <!-- Field Preview -->

        {#if fields.length > 0}

        <div class="card">

            <h2>📋 Added Fields</h2>

            {#each fields as f}

            <div
                class="field-card"
                style={`border-left:5px solid ${f.color}`}
            >

                <div class="field-title">

                    <strong>{f.name}</strong>

                    <span>{f.type}</span>

                </div>

                {#if f.formula}

                <small>
                    🧮 {f.formula}
                </small>

                {/if}

            </div>

            {/each}

        </div>

        {/if}

        <!-- Chart -->

        <div class="card">

            <h2>📊 Chart Configuration</h2>

            <div class="grid">

                <select bind:value={chartType}>

                    <option value="line">📈 Line Chart</option>

                    <option value="bar">📊 Bar Chart</option>

                    <option value="pie">🥧 Pie Chart</option>

                </select>

                <input
                    bind:value={chartX}
                    placeholder="X Axis"
                />

                <input
                    bind:value={chartY}
                    placeholder="Y Axis"
                />

            </div>

        </div>

        <!-- Saved Templates -->

        <div class="card">

            <h2>📂 Saved Templates</h2>

            {#if templates.length === 0}

                <p>No templates created.</p>

            {:else}

                {#each templates as t}

                <button
                    type="button"
                    class="template-item"
                    on:click={() => openTemplate(t)}
                >

                    <div class="template-header">

                        <div>

                            <strong>{t.name}</strong>

                            <br>

                            <small>{t.department}</small>

                        </div>

                        <span>

                            {t.chart}

                        </span>

                    </div>

                </button>

                {/each}

            {/if}

        </div>

    </main>

    <!-- RIGHT PANEL -->

    <aside class="properties">

        <h2>⚙ Properties</h2>

        <div class="property">

            <label>Total Fields</label>

            <h3>{fields.length}</h3>

        </div>

        <div class="property">

            <label>Department</label>

            <h3>{department}</h3>

        </div>

        <div class="property">

            <label>Chart</label>

            <h3>{chartType}</h3>

        </div>

        <div class="property">

            <label>X Axis</label>

            <h3>{chartX || "-"}</h3>

        </div>

        <div class="property">

            <label>Y Axis</label>

            <h3>{chartY || "-"}</h3>

        </div>

        <button
            class="save"
            on:click={createTemplate}
        >

            💾 Save Template

        </button>

    </aside>

</div>
<style>

:global(body){
    margin:0;
    background:#edf2f7;
    font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;
}

.page{
    display:grid;
    grid-template-columns:260px 1fr 320px;
    gap:20px;
    padding:20px;
    min-height:100vh;
    box-sizing:border-box;
}

/* Sidebar */

.sidebar,
.properties{
    background:#fff;
    border-radius:16px;
    padding:20px;
    box-shadow:0 6px 18px rgba(0,0,0,.08);
}

.sidebar h2,
.properties h2{
    margin-top:0;
    color:#1e293b;
}

/* Main */

.content{
    display:flex;
    flex-direction:column;
    gap:20px;
}

.header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    background:#fff;
    padding:20px;
    border-radius:16px;
    box-shadow:0 6px 18px rgba(0,0,0,.08);
}

.header h1{
    margin:0;
    color:#1e293b;
}

.header small{
    color:#64748b;
}

.card{
    background:#fff;
    border-radius:16px;
    padding:20px;
    box-shadow:0 6px 18px rgba(0,0,0,.08);
}

.card h2{
    margin-top:0;
    color:#1e293b;
}

/* Grid */

.grid{
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:15px;
    margin-top:15px;
}

/* Input */

input,
select,
textarea{
    width:100%;
    padding:12px;
    border:1px solid #d1d5db;
    border-radius:10px;
    box-sizing:border-box;
    font-size:14px;
}

.search{
    width:320px;
}

/* Buttons */

button{
    cursor:pointer;
    transition:.25s;
    border:none;
    border-radius:10px;
    font-size:14px;
}

.primary{
    margin-top:15px;
    background:#2563eb;
    color:white;
    padding:12px 18px;
}

.primary:hover{
    background:#1d4ed8;
}

.save{
    width:100%;
    margin-top:15px;
    background:#16a34a;
    color:white;
    padding:14px;
}

.save:hover{
    background:#15803d;
}

/* Menu */

.menu{
    width:100%;
    padding:12px;
    margin-bottom:10px;
    background:#f1f5f9;
    text-align:left;
}

.menu:hover{
    background:#dbeafe;
}

.active{
    background:#2563eb;
    color:white;
}

/* Field */

.field-card{
    background:#f8fafc;
    margin-top:12px;
    padding:12px;
    border-radius:10px;
}

.field-title{
    display:flex;
    justify-content:space-between;
}

.field-card small{
    color:#64748b;
}

/* Template */

.template-item{
    width:100%;
    margin-top:12px;
    padding:14px;
    background:white;
    border:1px solid #e2e8f0;
    text-align:left;
}

.template-item:hover{
    background:#eff6ff;
    border-color:#2563eb;
}

.template-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
}

.template-header small{
    color:#64748b;
}

/* Properties */

.property{
    background:#f8fafc;
    padding:15px;
    border-radius:10px;
    margin-bottom:15px;
}

.property label{
    color:#64748b;
    font-size:13px;
}

.property h3{
    margin:6px 0 0;
    color:#1e293b;
}

/* Responsive */

@media(max-width:1200px){

.page{

grid-template-columns:1fr;

}

.sidebar,
.properties{

order:2;

}

.content{

order:1;

}

.search{

width:100%;

}

.grid{

grid-template-columns:1fr;

}

}

</style>