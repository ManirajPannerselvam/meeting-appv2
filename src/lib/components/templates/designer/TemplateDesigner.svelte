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
    return crypto.randomUUID?.()?? Date.now().toString() + Math.random().toString(36).substring(2);
}
function slugify(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

let templateData: any = {
    id: "", template_code: "", name: "", description: "",
    category: "Production", department: "Production",
    icon: "📊", color: "#2563eb", version: 1,
    chart_enabled: false, chart_type: "bar", chart_title: "", chart_x: "", chart_y: "",
    reference_template: "", last_values: {}
};

let fields: any[] = [];
let selectedFieldIndex = 0;
let activeTab: "fields" | "preview" = "fields";

// --- NEW DESIGN BOX OPTIONS - MERGED FROM LATEST PROGRAM ---
let cols = 36; let rows = 24; let gap = 16;
let dotSize = 3; let dotOpacity = 0.42; let showGrid = true; let showOptions = false;
$: boardHeight = rows * gap + 16;
$: totalDots = cols * rows;

$: totalCount = templates.length;
$: catCounts = templates.reduce((acc:any, t:any)=>{
    const cat = t.category || t.department || "Production";
    acc[cat]=(acc[cat]||0)+1; return acc;
},{});
$: catList = Object.entries(catCounts);

type Placed = { id:string, fIndex:number, x:number, y:number, w:number, h:number };
let placed: Placed[] = [];
let drag: Placed | null = null;
let dragOff = {x:0,y:0};

$: {
    // sync fields -> placed for visual design box
    if(fields.length){
        placed = fields.map((f,i)=>{
            const existing = placed.find(p=> p.fIndex===i);
            if(existing) return existing;
            const w = f.field_type==="number"||f.field_type==="formula"?4:6;
            const h = 3;
            const x = (i*7) % (cols-w);
            const y = Math.floor((i*7)/(cols-w))*4 % (rows-h);
            return { id:f.id, fIndex:i, x, y, w, h };
        });
    }
}

function dotNo(r:number,c:number){ return r*cols+c+1; }
function onDown(e:MouseEvent, p:Placed){ drag=p; const b=document.getElementById("board")!.getBoundingClientRect(); dragOff.x=e.clientX-b.left-p.x*gap; dragOff.y=e.clientY-b.top-p.y*gap; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }
function onMove(e:MouseEvent){ if(!drag) return; const b=document.getElementById("board")!.getBoundingClientRect(); let nx=Math.round((e.clientX-b.left-dragOff.x)/gap); let ny=Math.round((e.clientY-b.top-dragOff.y)/gap); nx=Math.max(0,Math.min(cols-drag.w,nx)); ny=Math.max(0,Math.min(rows-drag.h,ny)); placed=placed.map(pl=> pl.fIndex===drag!.fIndex? {...pl, x:nx, y:ny}:pl); selectedFieldIndex=drag!.fIndex; }
function onUp(){ drag=null; window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); }
function onTouchStart(e:TouchEvent, p:Placed){ const t=e.touches[0]; onDown({clientX:t.clientX,clientY:t.clientY} as MouseEvent, p); }
function onTouchMove(e:TouchEvent){ if(!drag) return; const t=e.touches[0]; onMove({clientX:t.clientX,clientY:t.clientY} as MouseEvent); }
function fillFullBox(){ cols=40; rows=36; gap=14; }
function fillDense(){ cols=50; rows=40; gap=12; dotSize=2.5; }

const requiredFields = [
{ id: uuid(), label: "Shift", field_name: "shift", metric: "shift", field_type: "dropdown", required: true, readonly: false, hidden: false, placeholder: "", default_value: "", formula: "", options: JSON.stringify(["A","B","C","Day (A+B+C)"]) },
{ id: uuid(), label: "Station", field_name: "station", metric: "station", field_type: "dropdown", required: true, readonly: false, hidden: false, placeholder: "", default_value: "", formula: "", options: JSON.stringify(["RAT","AotA","SotA","AXI","ICT","FCT","Packing","SMT Line 1","SMT Line 2","Assembly","Repair"]) }
];

let loadedTemplateId = "";
$: {
    if (template?.id) {
        if (loadedTemplateId!== template.id) {
            loadedTemplateId = template.id;
            const data = typeof template.data === "string"? JSON.parse(template.data) : (template.data || {});
            templateData = {...structuredClone(templateData),...template,...structuredClone(data) };
            fields = structuredClone(data.fields || []);
            ensureRequiredFields();
        }
    } else {
        if (loadedTemplateId!== "__new__") {
            loadedTemplateId = "__new__";
            templateData = { id: "", template_code: "", name: "", description: "", category: "Production", department: "Production", icon: "📊", color: "#2563eb", version: 1, chart_enabled: false, chart_type: "bar", chart_title: "", chart_x: "", chart_y: "", reference_template: "", last_values: {} };
            fields = []; ensureRequiredFields();
        }
    }
}
function ensureRequiredFields() {
    requiredFields.forEach(req => {
        const exists = fields.some(f => f.field_name === req.field_name);
        if (!exists) { fields.unshift({...structuredClone(req), id: uuid(), display_order: 0 }); }
    });
    fields = fields.map((field, index) => ({...field, display_order: field.display_order?? index }));
}
function addField(event: any) {
    const type = event.detail?.type?? "text";
    const label = event.detail?.label?? type;
    const baseName = slugify(label);
    let fieldName = baseName; let metric = "";
    switch (label.toLowerCase()) {
        case "input": metric = "input"; break;
        case "output": metric = "output"; break;
        case "retestqty": metric = "retest"; break;
        case "ntfqty": metric = "ntf"; break;
        case "otqty": metric = "ot"; break;
        case "failqty": metric = "fail"; break;
    }
    let counter = 2; while (fields.some(f => f.field_name === fieldName)) { fieldName = `${baseName}_${counter}`; counter++; }
    const newField = { id: uuid(), label, field_name: fieldName, metric, field_type: type, placeholder: "", required: false, readonly: false, hidden: false, default_value: "", formula: "", options: type === "dropdown"? JSON.stringify([]) : "", min_value: null, max_value: null, reference_template_id: null, display_order: fields.length };
    fields = [...fields, newField]; selectedFieldIndex = fields.length - 1; createFormulaFields();
}
function createFormulaFields() {
    const kpiNames = ["yield","rr","ntf","ot","fail"];
    const normalFields = fields.filter(f =>!kpiNames.includes(f.field_name));
    const inputField = normalFields.find(f => f.metric === "input");
    const outputField = normalFields.find(f => f.metric === "output");
    const retestField = normalFields.find(f => f.metric === "retest");
    const ntfField = normalFields.find(f => f.metric === "ntf");
    const otField = normalFields.find(f => f.metric === "ot");
    const failField = normalFields.find(f => f.metric === "fail");
    if (!inputField ||!outputField) { fields = normalFields; return; }
    const kpiFields:any[] = [];
    kpiFields.push({ id: uuid(), label: "Yield", field_name: "yield", metric: "yield", field_type: "formula", readonly: true, formula: `({${outputField.field_name}}/{${inputField.field_name}})*100`, default_value: "0", display_order: normalFields.length + kpiFields.length });
    if (retestField) kpiFields.push({ id: uuid(), label: "RR", field_name: "rr", metric: "rr", field_type: "formula", readonly: true, formula: `({${retestField.field_name}}/{${inputField.field_name}})*100`, default_value: "0", display_order: normalFields.length + kpiFields.length });
    if (ntfField) kpiFields.push({ id: uuid(), label: "NTF", field_name: "ntf", metric: "ntf", field_type: "formula", readonly: true, formula: `({${ntfField.field_name}}/{${inputField.field_name}})*100`, default_value: "0", display_order: normalFields.length + kpiFields.length });
    if (otField) kpiFields.push({ id: uuid(), label: "OT", field_name: "ot", metric: "ot", field_type: "formula", readonly: true, formula: `({${otField.field_name}}/{${inputField.field_name}})*100`, default_value: "0", display_order: normalFields.length + kpiFields.length });
    if (failField) kpiFields.push({ id: uuid(), label: "Fail", field_name: "fail", metric: "fail", field_type: "formula", readonly: true, formula: `({${failField.field_name}}/{${inputField.field_name}})*100`, default_value: "0", display_order: normalFields.length + kpiFields.length });
    fields = [...normalFields,...kpiFields];
}
function updateField(index: number, value: any) { fields = fields.map((field, i) => i === index? {...field,...value } : field); createFormulaFields(); }
function deleteField(index: number) {
    const field = fields[index]; if (!field) return;
    if (field.field_name === "shift" || field.field_name === "station") { alert("Shift and Station cannot be deleted."); return; }
    fields = fields.filter((_, i) => i!== index).map((field, i) => ({...field, display_order: i }));
    selectedFieldIndex = Math.min(selectedFieldIndex, Math.max(fields.length - 1, 0)); createFormulaFields();
}
async function saveTemplate() {
    ensureRequiredFields(); createFormulaFields();
    templateData.template_code = (templateData.template_code || "").trim().toUpperCase();
    templateData.name = (templateData.name || "").trim();
    if (!templateData.template_code) { alert("Template Code is required"); return; }
    if (!templateData.name) { alert("Template Name is required"); return; }
    const duplicate = templates.find((t) => t.template_code?.toUpperCase() === templateData.template_code && t.id!== template?.id);
    if (duplicate) { alert(`Template Code "${templateData.template_code}" already exists`); return; }
    if (fields.length < 2) { alert("Please add at least two fields."); return; }
    const names = new Set<string>();
    for (const field of fields) {
        field.field_name = field.field_name.trim().toLowerCase().replace(/\s+/g, "_");
        if (names.has(field.field_name)) { alert(`Duplicate Field Name : ${field.field_name}`); return; }
        names.add(field.field_name);
    }
    saving = true;
    const payload = {
        template_code: templateData.template_code, name: templateData.name, description: templateData.description, category: templateData.category,
        data: {
            icon: templateData.icon, color: templateData.color, version: templateData.version, department: templateData.department,
            chart_enabled: templateData.chart_enabled?? false, chart_type: templateData.chart_type?? "bar", chart_title: templateData.chart_title?? "", chart_x: templateData.chart_x?? "", chart_y: templateData.chart_y?? "",
            reference_template: templateData.reference_template || null, last_values: templateData.last_values || {},
            designConfig: { cols, rows, gap, dotSize, placed },
            fields: fields.map((field, index) => ({
                id: field.id, label: field.label, field_name: field.field_name, metric: field.metric || "", field_type: field.field_type,
                placeholder: field.placeholder || "", required:!!field.required, readonly: field.field_type === "formula"? true :!!field.readonly, hidden:!!field.hidden,
                default_value: field.default_value?? "", formula: field.formula?? "",
                options: typeof field.options === "string"? field.options : JSON.stringify(field.options || []),
                min_value: field.min_value, max_value: field.max_value, display_order: field.display_order?? index, reference_template_id: field.reference_template_id || null,
                x: placed.find(p=>p.fIndex===index)?.x?? 0, y: placed.find(p=>p.fIndex===index)?.y?? 0
            }))
        }
    };
    try {
        let response;
        if (template?.id) { response = await fetch("/api/templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: template.id,...payload }) }); }
        else { response = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to save template");
        alert(template?.id? "✅ Template Updated Successfully" : "✅ Template Created Successfully");
        dispatch("saved", result.data);
    } catch (err: any) { console.error(err); alert(err.message || "Save failed"); } finally { saving = false; }
}
</script>

<div class="designer">
    <!-- TOP FIXED COUNT - 4 items + category based -->
    <div class="top-fixed">
        <div class="total-badge">{totalCount} Templates Saved</div>
        <div class="cat-counts">
            {#each catList as [cat,count]}
                <div class="cat-item"><b>{count}</b><span>{cat}</span></div>
            {/each}
            {#if catList.length===0}<div class="cat-item"><b>0</b><span>Production</span></div>{/if}
            <div class="dot-info">{totalDots} dots | {cols}x{rows}</div>
        </div>
    </div>

    <div class="header">
        <div class="left">
            <span class="icon">{templateData.icon}</span>
            <div>
                <input class="title-input" bind:value={templateData.name} placeholder="Template Name" />
                <div class="sub">Code : <input class="code-input" bind:value={templateData.template_code} placeholder="AXI01" /></div>
            </div>
        </div>
        <div class="actions">
            <button class="btn ghost" on:click={() => dispatch("close")}>Cancel</button>
            <button class="btn primary" disabled={saving} on:click={saveTemplate}>
                {#if saving}Saving...{:else if template?.id}💾 Update Template{:else}💾 Save Template{/if}
            </button>
        </div>
    </div>

    <div class="body">
        <div class="sidebar">
            <div class="card"><h3>Template Information</h3><DesignerInfoPanel bind:template={templateData} />
                <div class="field-group"><label>Reference Template</label><select bind:value={templateData.reference_template}><option value="">None</option>{#each templates.filter(t => t.id!== templateData.id) as t}<option value={t.id}>{t.name} ({t.template_code})</option>{/each}</select><small class="hint">Optional. Link another template.</small></div>
            </div>
            <div class="card"><h3>Field Toolbox</h3><FieldToolbox on:add={addField} /></div>
        </div>

        <div class="main">
            <div class="tabs">
                <button class:active={activeTab === "fields"} on:click={() => activeTab = "fields"}>Fields ({fields.length})</button>
                <button class:active={activeTab === "preview"} on:click={() => activeTab = "preview"}>Preview</button>
            </div>

            {#if activeTab === "fields"}
                <!-- NEW DESIGN BOX - FULL FILL TILL DOWNSIDE -->
                <div class="card design-card">
                    <div class="design-head" on:click={()=>showOptions=!showOptions}>
                        <span>⚙️ Design Box - {cols}x{rows} = {totalDots} dots | Gap {gap}px - Full Fill</span>
                        <span>{showOptions?'▲':'▼'}</span>
                    </div>
                    {#if showOptions}
                    <div class="options-grid">
                        <div class="opt-group"><label>Gap: {gap}px</label><input type="range" min="10" max="32" bind:value={gap} /></div>
                        <div class="opt-group"><label>Cols: {cols}</label><input type="range" min="10" max="50" bind:value={cols} /></div>
                        <div class="opt-group"><label>Rows: {rows}</label><input type="range" min="10" max="40" bind:value={rows} /></div>
                        <div class="opt-group"><label>Dot: {dotSize}px</label><input type="range" min="1" max="6" step="0.5" bind:value={dotSize} /></div>
                        <div class="opt-actions"><button on:click={fillFullBox}>Full Box</button><button on:click={fillDense}>Dense</button><label><input type="checkbox" bind:checked={showGrid}/> Grid</label></div>
                    </div>
                    {/if}
                    <div id="board" class="board-fixed" style="height:{boardHeight}px; background-size:{gap}px {gap}px; background-image:{showGrid?`linear-gradient(to right, #f1f5f9 1px, transparent 1px),linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`: 'none'};" on:touchmove={onTouchMove} on:touchend={onUp}>
                        {#each Array(rows) as _,r}{#each Array(cols) as _,c}<div class="sdot" style="left:{c*gap+8}px; top:{r*gap+8}px; width:{dotSize}px; height:{dotSize}px; opacity:{dotOpacity};"></div>{/each}{/each}
                        {#each placed as p}<div class="mod" class:active={p.fIndex===selectedFieldIndex} style="left:{p.x*gap+2}px; top:{p.y*gap+2}px; width:{p.w*gap-4}px; height:{p.h*gap-6}px;" on:mousedown={(e)=>onDown(e,p)} on:touchstart={(e)=>onTouchStart(e,p)} on:click={()=>selectedFieldIndex=p.fIndex}><span>{fields[p.fIndex]?.label}</span></div>{/each}
                    </div>
                </div>

                <div class="card table-card">
                    <DesignerFieldTable {fields} bind:selectedIndex={selectedFieldIndex} on:update={(e) => updateField(e.detail.index, e.detail.field)} on:delete={(e) => deleteField(e.detail.index)} />
                    <p class="hint">Required fields: <b>shift</b> and <b>station</b>.<br>Set Metric as: input / output / retest / ntf / ot / fail to auto-create KPI formulas.</p>
                </div>
            {:else}
                <!-- PREVIEW - NO DOTS - CLEAN VIEW -->
                <div class="card preview-card">
                    <div class="gray">Preview - No Dots - Clean View - {boardHeight}px</div>
                    <div class="preview-fixed clean" style="height:{boardHeight}px;">
                        {#each placed as p}<div class="p-abs" style="left:{p.x*gap+2}px; top:{p.y*gap+2}px; width:{p.w*gap-4}px; height:{p.h*gap-6}px;"><div class="p-label">{fields[p.fIndex]?.label}</div></div>{/each}
                        <DesignerPreview template={templateData} {fields} />
                    </div>
                </div>
            {/if}
        </div>

        <div class="sidebar">
            <div class="card"><h3>Field Properties</h3>{#if fields[selectedFieldIndex]}<FieldPropertyPanel field={fields[selectedFieldIndex]} templates={templates} on:update={(e) => updateField(selectedFieldIndex, e.detail)} />{:else}<div class="empty">Select a field</div>{/if}</div>
        </div>
    </div>
</div>

<style>
.designer{width:95vw;max-width:1500px;height:90vh;background:#f8fafc;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.15);}
.top-fixed{position:sticky;top:0;z-index:50;background:white;border-bottom:1px solid #e5e7eb;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;}
.total-badge{background:#111827;color:white;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:800;}
.cat-counts{display:flex;gap:8px;align-items:center;overflow:auto;}
.cat-item{display:flex;flex-direction:column;align-items:center;background:#f1f5f9;padding:3px 8px;border-radius:6px;border:1px solid #e2e8f0;min-width:50px;}
.cat-item b{font-size:12px;}.cat-item span{font-size:9px;color:#64748b;}
.dot-info{background:#eff6ff;padding:4px 8px;border-radius:6px;font-size:10px;border:1px solid #bfdbfe;color:#334155;}
.header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:white;border-bottom:1px solid #e5e7eb;}
.left{display:flex;align-items:center;gap:12px;}
.icon{font-size:24px;background:#eff6ff;width:48px;height:48px;display:flex;justify-content:center;align-items:center;border-radius:10px;}
.title-input{border:none;outline:none;background:transparent;font-size:18px;font-weight:700;width:280px;}
.sub{margin-top:4px;color:#64748b;font-size:12px;}
.code-input{width:110px;margin-left:6px;padding:4px 6px;border:1px solid #d1d5db;border-radius:6px;text-transform:uppercase;}
.actions{display:flex;gap:8px;}
.btn{border:none;cursor:pointer;border-radius:8px;padding:8px 14px;font-weight:600;}
.btn.primary{background:#2563eb;color:white;}.btn.ghost{background:#f3f4f6;}
.body{flex:1;display:grid;grid-template-columns:300px 1fr 340px;gap:12px;padding:12px;overflow:hidden;}
.sidebar{display:flex;flex-direction:column;gap:12px;overflow:auto;}
.main{display:flex;flex-direction:column;gap:10px;overflow:auto;}
.card{background:white;border:1px solid #e5e7eb;border-radius:10px;padding:12px;}
.card h3{margin:0 0 10px;color:#334155;font-size:14px;}
.design-card{border:1px dashed #2563eb;}
.design-head{display:flex;justify-content:space-between;cursor:pointer;font-weight:700;font-size:11px;color:#334155;}
.options-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;}
.opt-group{display:flex;flex-direction:column;gap:2px;}.opt-group label{font-size:10px;font-weight:700;}
.opt-actions{grid-column:1/-1;display:flex;gap:6px;align-items:center;}
.opt-actions button{padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;background:white;font-size:10px;cursor:pointer;}
.board-fixed{position:relative;width:100%;background:#fcfcfc;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;touch-action:none;margin-top:8px;}
.sdot{position:absolute;background:#111827;border-radius:50%;pointer-events:none;}
.mod{position:absolute;background:#3b6fbf;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:10px;border-radius:5px;cursor:grab;z-index:5;box-shadow:0 2px 6px rgba(59,111,191,.35);}
.mod.active{outline:2px solid #f59e0b; z-index:6;}
.table-card{max-height:45vh;overflow:auto;}
.preview-card.gray{background:#6b7280;color:white;padding:4px 8px;width:fit-content;border-radius:4px;font-size:10px;font-weight:700;margin-bottom:8px;}
.preview-fixed.clean{position:relative;width:100%;background:white;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background-image:none!important;}
.p-abs{position:absolute;display:flex;flex-direction:column;}
.p-label{font-size:9px;background:#374151;color:white;padding:2px 4px;border-radius:3px;width:fit-content;}
.tabs{display:flex;gap:6px;background:white;border:1px solid #e5e7eb;border-radius:10px;padding:4px;}
.tabs button{flex:1;border:none;background:transparent;cursor:pointer;border-radius:6px;padding:8px;font-weight:600;font-size:13px;}
.tabs button.active{background:#2563eb;color:white;}
.field-group{display:flex;flex-direction:column;gap:4px;margin-top:10px;}
.field-group label{font-size:12px;font-weight:600;}
.field-group select{padding:8px;border-radius:6px;border:1px solid #d1d5db;}
.empty{color:#94a3b8;padding:40px 0;text-align:center;}
.hint{font-size:11px;color:#64748b;line-height:1.5;margin-top:8px;}
::-webkit-scrollbar{width:6px;height:6px;} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:6px;}
@media(max-width:1200px){.body{grid-template-columns:280px 1fr;}.sidebar:last-child{display:none;}}
</style>