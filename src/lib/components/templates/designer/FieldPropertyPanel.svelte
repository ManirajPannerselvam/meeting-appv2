<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let field: any = null;
    export let templates: any[] = [];
    export let allFields: any[] = []; // for formula builder

    const dispatch = createEventDispatcher();

    /* -------------------------------------------------
       PREDEFINED DROPDOWN OPTION SETS
       ------------------------------------------------- */
    const OPTION_PRESETS: Record<string, string[]> = {
        Station: ["RAT","AotA","SotA","AXI","ICT","FCT","Packing","SMT Line 1","SMT Line 2","Assembly","Repair"],
        Shift: ["A","B","C","Day (A+B+C)"],
        Department: ["Production","Quality","Maintenance","Engineering","Stores","Planning","HR","IT","Admin"],
        Status: ["Open","In Progress","Completed","Pending","Rejected","Cancelled"],
        Priority: ["Low","Medium","High","Critical"],
        YesNo: ["Yes","No"],
        PassFail: ["Pass","Fail"],
        DayNight: ["Day","Night"],
        Gender: ["Male","Female","Other"]
    };

    let newOption = "";
    let selectedPreset = "";

    /* =========================================================
       UPDATE / UTILS
    ========================================================= */
    function update() {
        if (!field) return;
        dispatch("update", {...field });
    }

    function slugify(value: string) {
        return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    }

    function updateLabel() {
        if (!field) return;
        if (!field.field_name || field.field_name.trim() === "") {
            field.field_name = slugify(field.label || "field");
        }
        update();
    }

    function updateFieldName() {
        if (!field) return;
        field.field_name = slugify(field.field_name || "");
        update();
    }

    /* =========================================================
       DROPDOWN OPTIONS - COMBINED
    ========================================================= */
    function getDropdownOptions(): string[] {
        if (!field) return [];
        if (Array.isArray(field.options)) return [...field.options];
        if (typeof field.options === "string") {
            try {
                const parsed = JSON.parse(field.options);
                if (Array.isArray(parsed)) return parsed.map(String);
            } catch {}
        }
        return [];
    }

    function setDropdownOptions(options: string[]) {
        if (!field) return;
        field.options = JSON.stringify(options.filter(o => String(o).trim()!== ""), null, 2);
        update();
    }

    function applyPreset(presetName: string) {
        if (!presetName) return;
        const preset = OPTION_PRESETS[presetName];
        if (!preset) return;
        setDropdownOptions([...preset]);

        if (presetName === "Station" && (!field.label || field.label === "Dropdown")) {
            field.label = "Station"; field.field_name = "station"; field.metric = "station";
        }
        if (presetName === "Shift" && (!field.label || field.label === "Dropdown")) {
            field.label = "Shift"; field.field_name = "shift"; field.metric = "shift";
        }
        update(); selectedPreset = "";
    }

    function addOption() {
        const value = newOption.trim(); if (!value) return;
        const options = getDropdownOptions();
        if (options.some(o => o.toLowerCase() === value.toLowerCase())) { alert(`"${value}" already exists.`); return; }
        options.push(value); setDropdownOptions(options); newOption = "";
    }

    function removeOption(index: number) {
        const options = getDropdownOptions(); options.splice(index, 1); setDropdownOptions(options);
    }

    function moveOption(index: number, direction: "up" | "down") {
        const options = getDropdownOptions();
        if (direction === "up" && index > 0) [options[index - 1], options[index]] = [options[index], options[index - 1]];
        if (direction === "down" && index < options.length - 1) [options[index], options[index + 1]] = [options[index + 1], options[index]];
        setDropdownOptions(options);
    }

    function clearOptions() {
        if (!confirm("Remove all dropdown options?")) return;
        setDropdownOptions([]);
    }

    function suggestPreset() {
        if (!field) return;
        const label = String(field.label || "").toLowerCase();
        const fieldName = String(field.field_name || "").toLowerCase();
        if (label === "station" || fieldName === "station") return applyPreset("Station");
        if (label === "shift" || fieldName === "shift") return applyPreset("Shift");
        if (label === "department" || fieldName === "department") return applyPreset("Department");
        if (label === "status" || fieldName === "status") return applyPreset("Status");
    }

    $: dropdownOptions = field?.field_type === "dropdown"? getDropdownOptions() : [];

    /* =========================================================
       FORMULA BUILDER
    ========================================================= */
    function fieldsForFormula(currentField: any) {
        const source = Array.isArray(allFields)? allFields : [];
        return source.filter(item => item && item.id!== currentField?.id && item.field_name && item.field_type!== "formula" && item.hidden!== true);
    }

    function insertFormula(value: string) {
        if (!field) return;
        field.formula = (field.formula || "") + value;
        update();
    }

    function insertFieldName(fieldName: string) {
        if (!fieldName) return;
        insertFormula(`{${fieldName}}`);
    }

    function clearFormula() {
        if (!field) return;
        field.formula = ""; update();
    }

    function useFormula(formula: string) {
        if (!field) return;
        field.formula = formula; update();
    }

    function getFormulaError(): string {
        if (!field || field.field_type!== "formula") return "";
        const formula = String(field.formula || "").trim();
        if (!formula) return "Formula is empty.";
        const open = (formula.match(/\{/g) || []).length;
        const close = (formula.match(/\}/g) || []).length;
        if (open!== close) return "Check the field brackets.";
        const fieldNames = fieldsForFormula(field).map(item => item.field_name);
        const references = [...formula.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
        for (const reference of references) {
            if (!fieldNames.includes(reference) && reference!== field?.field_name) {
                return `Field "${reference}" was not found.`;
            }
        }
        return "";
    }

    $: formulaError = getFormulaError();
    $: formulaFields = fieldsForFormula(field);

    $: if (field && field.field_type === "formula" &&!field.readonly) {
        field.readonly = true; update();
    }

    function changeFieldType() {
        if (!field) return;
        if (field.field_type === "formula") { field.readonly = true; if (typeof field.formula!== "string") field.formula = ""; }
        if (field.field_type === "dropdown") {
            if (!field.options) field.options = JSON.stringify([], null, 2);
        }
        update();
    }
</script>

<div class="panel">
    {#if field}
        <div class="panel-header">
            <div>
                <h3>Field Properties</h3>
                <p>Configure this field without writing code.</p>
            </div>
            <div class="field-badge">{field.field_type || "field"}</div>
        </div>

        <!-- BASIC -->
        <section class="section">
            <div class="section-title"><span>📝</span><div><strong>Basic Information</strong><small>Field name and display settings</small></div></div>
            <label>Label</label>
            <input type="text" bind:value={field.label} on:input={updateLabel} placeholder="Example: Station" />
            <label>Field Name</label>
            <input type="text" bind:value={field.field_name} on:input={updateFieldName} placeholder="station" />
            <small class="hint">Internal name used by formulas. Spaces are automatically converted to underscores.</small>
        </section>

        <!-- TYPE -->
        <section class="section">
            <div class="section-title"><span>🧩</span><div><strong>Field Type</strong><small>Choose how users enter data</small></div></div>
            <label>Input Type</label>
            <select bind:value={field.field_type} on:change={changeFieldType}>
                <option value="text">📝 Text</option><option value="number">🔢 Number</option><option value="date">📅 Date</option>
                <option value="time">⏰ Time</option><option value="dropdown">📋 Dropdown</option><option value="reference">🔗 Reference</option>
                <option value="formula">🧮 Formula</option>
            </select>
        </section>

        <!-- METRIC -->
        <section class="section">
            <div class="section-title"><span>📊</span><div><strong>Report Metric</strong><small>Used for KPI calculation</small></div></div>
            <label>Metric Type</label>
            <select bind:value={field.metric} on:change={update}>
                <option value="">None</option><option value="input">Input</option><option value="output">Output</option>
                <option value="retest">Retest</option><option value="ntf">NTF</option><option value="ot">OT</option>
                <option value="fail">Fail</option><option value="shift">Shift</option><option value="station">Station</option>
            </select>
        </section>

        <!-- DISPLAY -->
        <section class="section">
            <div class="section-title"><span>👁</span><div><strong>Display Settings</strong><small>Control how the field behaves</small></div></div>
            <label>Placeholder</label><input type="text" bind:value={field.placeholder} on:input={update} placeholder="Example: Select station" />
            <label>Default Value</label><input type="text" bind:value={field.default_value} on:input={update} placeholder="Optional" />
            <div class="checks">
                <label class="check"><input type="checkbox" bind:checked={field.required} on:change={update} /><span><strong>Required</strong><small>User must provide a value</small></span></label>
                <label class="check"><input type="checkbox" bind:checked={field.readonly} on:change={update} disabled={field.field_type === "formula"} /><span><strong>Readonly</strong><small>Prevent manual editing</small></span></label>
                <label class="check"><input type="checkbox" bind:checked={field.hidden} on:change={update} /><span><strong>Hidden</strong><small>Hide from normal report entry</small></span></label>
            </div>
        </section>

        <!-- NUMBER -->
        {#if field.field_type === "number"}
        <section class="section">
            <div class="section-title"><span>🔢</span><div><strong>Number Settings</strong><small>Optional number validation</small></div></div>
            <label>Minimum Value</label><input type="number" bind:value={field.min_value} on:input={update} />
            <label>Maximum Value</label><input type="number" bind:value={field.max_value} on:input={update} />
        </section>
        {/if}

        <!-- DROPDOWN WITH PRESETS -->
        {#if field.field_type === "dropdown"}
        <section class="section dropdown-section">
            <div class="section-title"><span>📋</span><div><strong>Dropdown Options</strong><small>Add choices users can select</small></div></div>

            <label>Quick Option Set</label>
            <select bind:value={selectedPreset} on:change={() => applyPreset(selectedPreset)}>
                <option value="">Select predefined options...</option>
                <option value="Station">🏭 Station List</option><option value="Shift">🕐 Shift A / B / C</option>
                <option value="Department">🏢 Department</option><option value="Status">📋 Status</option>
                <option value="Priority">⚡ Priority</option><option value="YesNo">✅ Yes / No</option>
                <option value="PassFail">✔ Pass / Fail</option><option value="DayNight">☀ Day / Night</option>
                <option value="Gender">👤 Gender</option>
            </select>
            <button type="button" class="suggest-button" on:click={suggestPreset}>✨ Auto Detect Options</button>

            <div class="options-header">
                <div>Current Options <span class="count">{dropdownOptions.length}</span></div>
                {#if dropdownOptions.length > 0}<button type="button" class="clear-button" on:click={clearOptions}>Clear</button>{/if}
            </div>

            <div class="options-list">
                {#if dropdownOptions.length === 0}
                    <div class="empty-options"><div class="empty-icon">📋</div><strong>No options yet</strong><span>Select a Quick Option Set above.</span></div>
                {:else}
                    {#each dropdownOptions as option, index}
                        <div class="option-row">
                            <span class="drag">⋮</span><span class="option-number">{index + 1}</span>
                            <input value={option} on:input={(e) => { const opts = getDropdownOptions(); opts[index] = (e.currentTarget as HTMLInputElement).value; setDropdownOptions(opts); }} />
                            <button type="button" class="move" disabled={index === 0} on:click={() => moveOption(index, "up")}>↑</button>
                            <button type="button" class="move" disabled={index === dropdownOptions.length - 1} on:click={() => moveOption(index, "down")}>↓</button>
                            <button type="button" class="remove" on:click={() => removeOption(index)}>×</button>
                        </div>
                    {/each}
                {/if}
            </div>
            <div class="add-option">
                <input type="text" bind:value={newOption} placeholder="Add new option..." on:keydown={(e) => { if(e.key === "Enter") { e.preventDefault(); addOption(); } }} />
                <button type="button" on:click={addOption}>+ Add</button>
            </div>
        </section>
        {/if}

        <!-- REFERENCE -->
        {#if field.field_type === "reference"}
        <section class="section">
            <div class="section-title"><span>🔗</span><div><strong>Reference Template</strong><small>Connect this field to another template</small></div></div>
            <label>Select Template</label>
            <select bind:value={field.reference_template_id} on:change={update}>
                <option value="">-- Select Template --</option>
                {#each templates as t}<option value={t.id}>{t.name} {#if t.template_code}({t.template_code}){/if}</option>{/each}
            </select>
        </section>
        {/if}

        <!-- FORMULA -->
        {#if field.field_type === "formula"}
        <section class="section formula-section">
            <div class="section-title"><span>🧮</span><div><strong>Formula Builder</strong><small>Build calculations using your fields</small></div></div>
            <label>Formula</label>
            <textarea rows="5" bind:value={field.formula} on:input={update} placeholder="Select fields and operators below"></textarea>
            <div class="formula-toolbar">
                <button type="button" on:click={() => insertFormula("(")}>(</button><button type="button" on:click={() => insertFormula(")")}>)</button>
                <button type="button" on:click={() => insertFormula("+")}>＋</button><button type="button" on:click={() => insertFormula("-")}>−</button>
                <button type="button" on:click={() => insertFormula("*")}>×</button><button type="button" on:click={() => insertFormula("/")}>÷</button>
                <button type="button" on:click={() => insertFormula("%")}>%</button><button type="button" on:click={() => insertFormula("100")}>100</button>
            </div>
            <div class="formula-builder">
                <div class="builder-title"><span>Available Fields</span><small>Click to insert</small></div>
                {#if formulaFields.length}
                    <div class="field-buttons">
                        {#each formulaFields as f}
                            <button type="button" class="field-button" on:click={() => insertFieldName(f.field_name)}>
                                <span class="field-icon">{f.field_type === "number"? "🔢" : f.field_type === "date"? "📅" : "▣"}</span>
                                <span class="field-info"><strong>{f.label || f.field_name}</strong><small>&#123;{f.field_name}&#125;</small></span>
                                <span class="insert-icon">＋</span>
                            </button>
                        {/each}
                    </div>
                {:else}<div class="builder-empty">Add Input / Output / Number fields first.</div>{/if}
            </div>
            <div class="common-formulas">
                <div class="builder-title"><span>Common Calculations</span><small>One click</small></div>
                <button type="button" on:click={() => useFormula("({output}/{input})*100")}><span>Yield %</span><code>&#123;output&#125; ÷ &#123;input&#125; × 100</code></button>
                <button type="button" on:click={() => useFormula("({retest}/{input})*100")}><span>Retest %</span><code>&#123;retest&#125; ÷ &#123;input&#125; × 100</code></button>
            </div>
            <button type="button" class="clear-formula" on:click={clearFormula}>🗑 Clear Formula</button>
            {#if formulaError}<div class="formula-error">⚠️ {formulaError}</div>
            {:else if field.formula}<div class="formula-valid">✓ Formula looks valid</div>{/if}
        </section>
        {/if}

    {:else}
        <div class="empty"><div class="empty-icon">🧩</div><strong>Select a field</strong><small>Choose a field from the table to configure it.</small></div>
    {/if}
</div>

<style>
/* All your CSS from both versions combined here. Keep the.dropdown-section,.formula-section,.panel-header,.field-badge styles from version 2 */
.panel{display:flex;flex-direction:column;gap:14px}
.panel-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.panel-header h3{margin:0;font-size:18px;font-weight:700;color:#1e293b}
.panel-header p{margin:4px 0 0;font-size:12px;color:#64748b}
.field-badge{padding:4px 10px;background:#eff6ff;color:#2563eb;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
.section{display:flex;flex-direction:column;gap:8px;padding-bottom:16px;border-bottom:1px solid #e5e7eb}
.section:last-child{border-bottom:none}
.section-title{display:flex;gap:10px;align-items:center;margin-bottom:4px}
.section-title span{font-size:18px}.section-title strong{display:block;font-size:14px;color:#1e293b}
.section-title small{display:block;font-size:11px;color:#64748b}
label{font-size:13px;font-weight:600;color:#374151}
input,select,textarea{width:100%;padding:10px 11px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;background:white}
input:focus,select:focus,textarea:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.checks{display:flex;flex-direction:column;gap:8px}.check{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
.check input{width:17px;height:17px;margin-top:2px}.check small{display:block;color:#64748b;font-weight:400}
.dropdown-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
.suggest-button{border:none;background:#e0e7ff;color:#3730a3;border-radius:8px;padding:9px 12px;font-size:12px;font-weight:700;cursor:pointer;margin-top:6px}
.options-header{display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:13px;font-weight:700;color:#334155}
.count{display:inline-flex;min-width:22px;height:22px;padding:0 6px;border-radius:20px;background:#2563eb;color:white;font-size:11px}
.options-list{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto;padding:4px}
.option-row{display:grid;grid-template-columns:20px 24px minmax(0,1fr) 28px 28px 28px;align-items:center;gap:4px;padding:5px;background:white;border:1px solid #e2e8f0;border-radius:8px}
.add-option{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:8px}
.add-option button{border:none;border-radius:8px;padding:0 13px;background:#2563eb;color:white;font-weight:700;cursor:pointer}
.formula-section{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px}
.formula-toolbar{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.formula-toolbar button{padding:6px 10px;border:1px solid #e2e8f0;background:white;border-radius:6px;cursor:pointer;font-weight:700}
.field-buttons{display:grid;grid-template-columns:1fr;gap:6px}
.field-button{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e2e8f0;background:white;border-radius:8px;cursor:pointer;text-align:left}
.common-formulas button{display:flex;justify-content:space-between;width:100%;padding:8px;border:1px solid #e2e8f0;background:white;border-radius:8px;cursor:pointer}
.formula-error{background:#fef2f2;color:#b91c1c;padding:10px;border-radius:8px;font-size:12px}
.formula-valid{background:#ecfdf5;color:#047857;padding:10px;border-radius:8px;font-size:12px}
.hint{display:block;margin-top:2px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;color:#475569}
.empty{padding:40px 20px;text-align:center;color:#94a3b8;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}
</style>