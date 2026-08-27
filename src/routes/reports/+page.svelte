<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import { supabaseTemplates, supabaseChat } from "$lib/supabase";
  import dayjs from 'dayjs';
  import type { Template, TemplateField } from '$lib/types';
  import type { Chart } from 'chart.js';
  import ProductionTrackerModal from '$lib/components/reports/ProductionTrackerModal.svelte';

  let templates: Template[] = $state([]);
  let selectedTemplateId: string = $state('');
  let selectedTemplate = $derived(templates.find(t => t.id === selectedTemplateId) || null);

  let startDate = $state(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  let endDate = $state(dayjs().format('YYYY-MM-DD'));
  let selectedShift: string = $state('All');
  let selectedStations: string[] = $state([]);

  let records: any[] = $state([]);
  let loading = $state(false);
  let error = $state("");

  let contacts: any[] = $state([]);
  let groups: any[] = $state([]);
  let selectedContactId: string = $state('All');
  let selectedGroupId: string = $state('All');
  let chatMessages: any[] = $state([]);
  let reportType: 'template' | 'chat' = $state('template');

  let xField = $state("station");
  let yField = $state("");
  let chartType: 'bar' | 'line' | 'pie' | 'doughnut' = $state('line');
  let chartCanvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  let ChartJS: typeof import('chart.js').Chart | null = null;

  let availableStations = $derived(
    normalizeFields(selectedTemplate).find(f => f.name.toLowerCase() === 'station')?.options || []
  );
  let numericFields = $derived(
    normalizeFields(selectedTemplate).filter(f => f.field_type === "number" || f.field_type === "formula")
  );

  function normalizeFields(template: Template | null): TemplateField[] {
    if (!template) return [];
    return (template.data?.fields || []).map((f: any) => ({
     ...f,
        name: f.field_name?? f.name?? f._key,
        field_name: f.field_name?? f.name?? f._key,
        label: f.label?? f.field_name,
        type: f.field_type?? f.type,
        field_type: f.field_type?? f.type,
        options: typeof f.options === "string"? JSON.parse(f.options || "[]") : (f.options || []),
        formula: f.formula?? "",
        required: f.required?? false
    }));
  }

  function getFieldLabel(name: string): string {
    const f = normalizeFields(selectedTemplate).find(f => f.name === name);
    return f?.label || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  function evaluateFormula(formula: string, data: Record<string, any>): string {
    if (!formula) return "0.00";
    let expr = formula;
    Object.keys(data).forEach(key => {
        const value = Number(data[key]) || 0;
        expr = expr.replaceAll(`{${key}}`, value.toString());
    });
    try {
        const fn = new Function(`"use strict"; return (${expr})`);
        const result = Number(fn());
        return Number.isFinite(result)? result.toFixed(2) : "0.00";
    } catch { return "0.00"; }
  }

  onMount(async () => {
    if (browser) {
      const chartjs = await import('chart.js/auto');
      await import('chartjs-adapter-dayjs-4');
      ChartJS = chartjs.Chart;
    }
    const { data, error: fetchErr } = await supabaseTemplates.from('templates').select('*').order('name');
    if (fetchErr) error = "Failed to fetch templates: " + fetchErr.message;
    else {
      templates = data || [];
      if (templates.length > 0) {
        selectedTemplateId = templates[0].id;
        const numeric = normalizeFields(templates[0]).filter(f => f.field_type === 'number' || f.field_type === 'formula');
        if (numeric.length > 0) yField = numeric[0].name;
      }
    }
    await loadContactsAndGroups();
  });

  async function loadContactsAndGroups(){
    try{
      const { data: rooms } = await supabaseChat.from("rooms").select(`id, user1_id, user2_id, user1:profiles!rooms_user1_fkey(id,name,email), user2:profiles!rooms_user2_fkey(id,name,email)`);
      let mappedContacts: any[] = [];
      (rooms||[]).forEach((r:any)=>{
        if(r.user1) mappedContacts.push({ id: r.user1_id, name: r.user1.name || r.user1.email, email: r.user1.email, room_id: r.id });
        if(r.user2) mappedContacts.push({ id: r.user2_id, name: r.user2.name || r.user2.email, email: r.user2.email, room_id: r.id });
      });
      const unique = new Map();
      mappedContacts.forEach(c=>{ if(!unique.has(c.id)) unique.set(c.id, c); });
      contacts = Array.from(unique.values());
      const { data: grp } = await supabaseChat.from("chat_groups").select("id,name");
      groups = grp || [];
    }catch(e){ console.log("contact load error", e); }
  }

  // Auto-load when filter changes
  $effect(()=>{
    if(selectedTemplateId && startDate && endDate){
      // trigger load but avoid loop
      if(reportType==='template') loadRecords();
    }
  });

  async function loadRecords() {
    if (!selectedTemplate && reportType==='template') return;
    loading = true;
    error = "";
    try {
        if(reportType==='chat'){
          await loadChatReport();
          return;
        }
        const t_code = selectedTemplate?.template_code?.trim();
        let query = supabaseTemplates.from("records").select("*")
        .eq("t_code", t_code)
        .gte("ts", dayjs(startDate).startOf("day").toISOString())
        .lte("ts", dayjs(endDate).endOf("day").toISOString());
        if(selectedShift!=='All') query = query.ilike("shift", selectedShift.trim());
        if (selectedStations.length > 0) query = query.in("station", selectedStations);
        if(selectedContactId!=='All') query = query.eq("created_by", selectedContactId);

        const { data, error: dbError } = await query.order("ts", { ascending: true });
        if (dbError) throw dbError;
        if (!data || data.length === 0) {
            error = `No records found for ${selectedTemplate?.name}. Try All shifts / All stations.`;
            records = [];
            return;
        }
        const templateFields = normalizeFields(selectedTemplate);
        records = (data || []).map(r => {
            const rowData = { station: r.station, shift: r.shift, ts: r.ts,...(r.data || {}) };
            templateFields.filter(f => f.field_type === "formula" && f.formula).forEach(f => {
                    const key = f.field_name?? f.name;
                    rowData[key] = evaluateFormula(f.formula, rowData);
                });
            return {...r,...rowData };
        });
        if (records.length > 0 && browser) setTimeout(generateChart, 100);
    } catch (err: any) {
        error = err.message;
        records = [];
    } finally {
        loading = false;
    }
  }

  async function loadChatReport(){
    try{
      let query = supabaseChat.from("messages").select("*, sender:profiles!messages_sender_id_fkey(name,email)").gte("created_at", dayjs(startDate).startOf("day").toISOString()).lte("created_at", dayjs(endDate).endOf("day").toISOString()).order("created_at", { ascending: true }).limit(1000);
      if(selectedContactId!=='All') query = query.eq("sender_id", selectedContactId);
      if(selectedGroupId!=='All') query = query.eq("group_id", selectedGroupId);
      const { data, error: dbErr } = await query;
      if(dbErr) throw dbErr;
      chatMessages = data || [];
      records = [];
      if(chatMessages.length===0) error = "No chat messages found";
    }catch(e:any){ error = e.message; chatMessages = []; }
    finally{ loading = false; }
  }

  function generateChart() {
    if (!browser ||!ChartJS ||!xField ||!yField ||!chartCanvas || records.length === 0) return;
    const grouped: Record<string, {vals: number[], rawTs: string}> = {};
    records.forEach(row => {
      const xVal = xField === 'ts'? dayjs(row[xField]).format('MMM D HH:mm') : String(row[xField] || 'Unknown');
      const yVal = parseFloat(row[yField]?? "0");
      if (!grouped[xVal]) grouped[xVal] = {vals: [], rawTs: row.ts};
      grouped[xVal].vals.push(yVal);
    });
    let entries = Object.entries(grouped);
    if(xField === 'ts') entries.sort((a,b) => new Date(a[1].rawTs).getTime() - new Date(b[1].rawTs).getTime());
    else entries.sort((a,b) => a[0].localeCompare(b[0]));
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => e[1].vals.reduce((a, b) => a + b, 0) / (e[1].vals.length || 1));
    const colors = labels.map((_, i) => `hsl(${(i * 45) % 360},70%,55%)`);
    if (chart) chart.destroy();
    const ctx = chartCanvas.getContext('2d');
    if (!ctx) return;
    chart = new ChartJS(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: getFieldLabel(yField),
          data: values,
          backgroundColor: chartType === "line"? "rgba(37,99,235,.15)" : colors,
          borderColor: "#2563eb",
          borderWidth: 2,
          tension: chartType === 'line'? 0.25 : 0,
          fill: chartType === 'line'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: chartType === 'pie' || chartType === 'doughnut' },
          title: { display: true, text: `${getFieldLabel(yField)} by ${getFieldLabel(xField)}` }
        },
        scales: chartType === 'pie' || chartType === 'doughnut'? {} : {
          x: { title: { display: true, text: getFieldLabel(xField) } },
          y: { beginAtZero: true, title: { display: true, text: getFieldLabel(yField) } }
        }
      }
    });
  }

  // FIX ITEM 6 - Excel filter by template + shift + station + contact
  function exportExcel() {
    const dataToExport = reportType==='chat'? chatMessages : records;
    if (dataToExport.length === 0) return alert('No data to export');
    let headers: string[] = [];
    let csvRows: string[] = [];
    if(reportType==='chat'){
      headers = ["Time","Sender","Content","Group","Room"];
      csvRows = [
        headers.join(','),
       ...chatMessages.map((r:any)=> [`"${dayjs(r.created_at).format('DD/MM HH:mm')}"`,`"${r.sender?.name||r.sender_id}"`,`"${(r.content||'').replace(/"/g,'""').slice(0,200)}"`,`"${r.group_id||''}"`,`"${r.room_id||''}"`].join(','))
      ];
    } else {
      const fields = normalizeFields(selectedTemplate);
      const base = ["ts","station","shift"];
      const fieldNames = fields.map(f => f.field_name).filter(fn=>!base.includes(fn));
      headers = [...base, ...fieldNames];
      csvRows = [
        headers.map(h => `"${getFieldLabel(h)}"`).join(','),
       ...records.map(r => headers.map(h => `"${String(r[h]?? '').replace(/"/g, '""')}"`).join(','))
      ];
    }
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tmplName = selectedTemplate?.template_code || reportType;
    a.download = `${tmplName}_${selectedShift}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="page">
  <div class="header">
    <h1>📊 Universal Reports</h1>
    <div class="header-right">
      <select bind:value={reportType} class="type-select">
        <option value="template">Template Report</option>
        <option value="chat">Chat Report</option>
      </select>
      <a href="/chat" class="btn-back">← Chat</a>
    </div>
  </div>

  <div class="toolbar">
    <div class="field">
      <label for="from">From</label>
      <input id="from" type="date" bind:value={startDate} />
    </div>
    <div class="field">
      <label for="to">To</label>
      <input id="to" type="date" bind:value={endDate} />
    </div>

    {#if reportType==='template'}
      <div class="field">
        <label for="template">Template</label>
        <select id="template" bind:value={selectedTemplateId}>
          <option value="">Select</option>
          {#each templates as t}<option value={t.id}>{t.name} ({t.template_code})</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="shift">Shift</label>
        <select id="shift" bind:value={selectedShift}>
          <option value="All">All Shifts</option>
          <option value="A">A</option><option value="B">B</option><option value="C">C</option>
        </select>
      </div>
    {/if}

    <div class="field">
      <label for="contact">Contact</label>
      <select id="contact" bind:value={selectedContactId}>
        <option value="All">All Contacts</option>
        {#each contacts as c}<option value={c.id}>{c.name} - {c.email}</option>{/each}
      </select>
    </div>

    <div class="field">
      <label for="group">Group</label>
      <select id="group" bind:value={selectedGroupId}>
        <option value="All">All Groups</option>
        {#each groups as g}<option value={g.id}>{g.name}</option>{/each}
      </select>
    </div>

    <button class="btn-load" onclick={loadRecords} disabled={loading}>{loading? 'Loading...' : 'Load All Data'}</button>
  </div>

  {#if reportType==='template' && availableStations.length > 0}
    <div class="station-filter">
      <p>Filter Stations:</p>
      <div class="station-list">{#each availableStations as station}<label><input type="checkbox" bind:group={selectedStations} value={station} /> {station}</label>{/each}</div>
    </div>
  {/if}

  {#if error}<div class="error">{error}</div>{/if}

  {#if reportType==='chat' && chatMessages.length > 0}
    <div class="analysis-view">
      <h2>💬 Chat Messages - {chatMessages.length} records</h2>
      <div class="table-container">
        <table>
          <thead><tr><th>Time</th><th>Sender</th><th>Content</th><th>Group</th><th>Room</th></tr></thead>
          <tbody>
            {#each chatMessages as r}
              <tr>
                <td>{dayjs(r.created_at).format('DD/MM HH:mm')}</td>
                <td>{r.sender?.name || r.sender_id}</td>
                <td class="msg-cell">{r.content?.slice(0,200)}</td>
                <td>{r.group_id||'-'}</td>
                <td>{r.room_id||'-'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="actions"><button class="excel" onclick={exportExcel}>📗 Export Chat Excel</button></div>
    </div>
  {/if}

  {#if reportType==='template' && records.length > 0}
    <div class="analysis-view">
      <h2>{selectedTemplate?.name} - {records.length} records</h2>
      <div class="controls">
        <div>
          <label for="xaxis">X-Axis</label>
          <select id="xaxis" bind:value={xField} onchange={generateChart}>
            <option value="ts">Time</option>
            <option value="station">Station</option>
            <option value="shift">Shift</option>
            {#each normalizeFields(selectedTemplate).filter(f => (f.type === "text" || f.type === "dropdown") && f.field_name!== "station" && f.field_name!== "shift") as field}
                <option value={field.field_name}>{field.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="yaxis">Y-Axis</label>
          <select id="yaxis" bind:value={yField} onchange={generateChart}>
            {#each numericFields as field}<option value={field.name}>{getFieldLabel(field.name)}</option>{/each}
          </select>
        </div>
        <div>
          <label for="chart">Chart</label>
          <select id="chart" bind:value={chartType} onchange={generateChart}>
            <option value="line">Line</option><option value="bar">Bar</option><option value="pie">Pie</option><option value="doughnut">Doughnut</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th><th>Shift</th><th>Station</th>
              {#each normalizeFields(selectedTemplate) as field}<th>{getFieldLabel(field.name)}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each records as r}
              <tr>
                <td>{dayjs(r.ts).format('DD/MM HH:mm')}</td>
                <td>{r.shift}</td>
                <td>{r.station}</td>
                {#each normalizeFields(selectedTemplate) as field}<td>{r[field.field_name]}</td>{/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="chart-container"><canvas bind:this={chartCanvas}></canvas></div>
      <div class="actions"><button class="excel" onclick={exportExcel}>📗 Export {selectedTemplate?.template_code} Excel ({selectedShift})</button></div>
    </div>
  {/if}
</div>

<style>
.page { padding: 20px; background: #eef4fb; min-height: 100vh; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.header h1{ margin:0; font-size:22px; }
.header-right{ display:flex; gap:10px; align-items:center; }
.type-select{ padding:8px 12px; border-radius:8px; border:1px solid #ccc; font-weight:600; }
.btn-back { background: #111b21; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; text-decoration: none; }
.toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 16px; background: white; padding: 16px; border-radius: 12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
.field{ display:flex; flex-direction:column; gap:4px; }
.field label{ font-size:12px; font-weight:600; color:#64748b; }
.toolbar input,.toolbar select { padding: 9px 12px; border-radius: 8px; border: 1px solid #cbd5e1; min-width:140px; }
.btn-load { background: #00a884; color: white; font-weight: 700; cursor: pointer; padding:10px 20px; border-radius:8px; border:none; height:38px; }
.btn-load:disabled{ opacity:0.6; }
.station-filter { background: white; padding: 14px; border-radius: 12px; margin-bottom: 16px; }
.station-filter p{ margin:0 0 8px; font-weight:600; font-size:13px; }
.station-list{ display:flex; gap:12px; flex-wrap:wrap; }
.analysis-view { background: white; padding: 20px; border-radius: 12px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
.controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.controls select{ width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; }
.chart-container { height: 380px; background: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 20px; border:1px solid #e2e8f0; }
.table-container { overflow-x: auto; margin-bottom: 20px; border:1px solid #e5e7eb; border-radius:8px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
th { background: #f8fafc; font-weight: 700; position:sticky; top:0; }
.msg-cell{ max-width:300px; white-space:pre-wrap; word-break:break-word; }
.actions{ margin-top:16px; }
.actions button { padding: 10px 18px; border: none; border-radius: 8px; color: white; background: #16a34a; cursor: pointer; font-weight:600; }
.error { background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px; margin-bottom:12px; border:1px solid #fecaca; }
@media (max-width:768px){
 .controls{ grid-template-columns:1fr; }
 .toolbar{ flex-direction:column; align-items:stretch; }
}
</style>