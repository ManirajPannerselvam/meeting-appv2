<script lang="ts">
    export let template: any;
</script>

<div class="panel">

    <div class="title">

        <div>
            <h2>Template Information</h2>
            <small>Configure the basic details</small>
        </div>

        <div class="icon">
            📄
        </div>

    </div>

    <div class="grid">

        <div class="field">
            <label>Template Code</label>
            <input
                bind:value={template.template_code}
                placeholder="PROD001"
            />
        </div>

        <div class="field">
            <label>Version</label>
            <input
                bind:value={template.version}
            />
        </div>

        <div class="field full">
            <label>Template Name</label>
            <input
                bind:value={template.name}
                placeholder="Hourly Production"
            />
        </div>

        <div class="field">
            <label>Department</label>

            <select bind:value={template.department}>

                <option>Production</option>
                <option>Quality</option>
                <option>Maintenance</option>
                <option>Engineering</option>
                <option>Warehouse</option>

            </select>

        </div>

        <div class="field">

            <label>Category</label>

            <select bind:value={template.category}>

                <option>Production</option>
                <option>Inspection</option>
                <option>Maintenance</option>
                <option>Audit</option>

            </select>

        </div>

        <div class="field full">

            <label>Description</label>

            <textarea
                rows="4"
                bind:value={template.description}
                placeholder="Short description..."
            />

        </div>

        <div class="field full">

            <label>Theme Color</label>

            <input
                type="color"
                bind:value={template.color}
            />

        </div>

    </div>

</div>

<style>

.panel{

background:white;

border-radius:14px;

padding:20px;

}

.title{

display:flex;

justify-content:space-between;

align-items:center;

margin-bottom:20px;

}

.title h2{

margin:0;

font-size:18px;

}

.title small{

color:#64748b;

}

.icon{

font-size:34px;

}

.grid{

display:grid;

grid-template-columns:1fr 1fr;

gap:14px;

}

.field{

display:flex;

flex-direction:column;

gap:6px;

}

.field.full{

grid-column:1 / span 2;

}

label{

font-size:12px;

font-weight:600;

color:#64748b;

}

input,
select,
textarea{

padding:10px 12px;

border:1px solid #d1d5db;

border-radius:8px;

font-size:14px;

outline:none;

transition:.2s;

}

input:focus,
select:focus,
textarea:focus{

border-color:#2563eb;

box-shadow:0 0 0 3px rgba(37,99,235,.15);

}

textarea{

resize:vertical;

}

</style>