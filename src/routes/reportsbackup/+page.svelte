<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from '$app/environment';
  import { supabaseTemplates } from "$lib/supabase";
  import dayjs from 'dayjs';
  import type { Template, TemplateField } from '$lib/types';
  import type { Chart } from 'chart.js';

  let templates: Template[] = [];
  let selectedTemplateId: string = '';
  $: selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;

  let startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  let endDate = dayjs().format('YYYY-MM-DD');
  let selectedShift: string = 'A';
  let selectedStations: string[] = [];

  let records: any[] = [];
  let loading = false;
  let error = "";

  let xField = "station";
  let yField = "";
  let chartType: 'bar' | 'line' | 'pie' | 'doughnut' = 'line';
  let chartCanvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  let ChartJS: typeof import('chart.js').Chart | null = null;

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
        expr = expr.replaceAll(`{${key.toLowerCase()}}`, value.toString());
        expr = expr.replaceAll(`{${key.toUpperCase()}}`, value.toString());
    });
    try {
        const fn = new Function(`"use strict"; return (${expr})`);
        const result = Number(fn());
        return Number.isFinite(result)? result.toFixed(2) : "0.00";
    } catch (err) {
        console.error("Formula Error", formula, err);
        return "0.00";
    }
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
  });

  $: availableStations = normalizeFields(selectedTemplate).find(f => f.name.toLowerCase() === 'station')?.options || [];
  $: numericFields = normalizeFields(selectedTemplate).filter(f => f.field_type === "number" || f.field_type === "formula");
  $: if(selectedTemplateId && startDate && endDate && selectedShift) loadRecords();

  async function loadRecords() {
    if (!selectedTemplate) return;
    loading = true;
    error = "";

    try {
        const t_code = selectedTemplate.template_code?.trim();

        console.log("FILTERS:", {
            t_code,
            shift: selectedShift.trim(),
            start: dayjs(startDate).startOf("day").toISOString(),
            end: dayjs(endDate).endOf("day").toISOString(),
            stations: selectedStations
        });

        // TEST 1: Only filter by t_code first to debug
        const { data: testData, error: testError } = await supabaseTemplates
         .from("records")
         .select("id, t_code, shift, station, ts")
         .eq("t_code", t_code);

        console.log("TEST 1 - Only t_code:", testData);
        console.log("TEST 1 - Error:", testError);

        if (!testData || testData.length === 0) {
            error = `No records found with t_code = '${t_code}'. Check if data was saved with this code.`;
            records = [];
            return;
        }

        // If Test 1 passed, run full query with all filters
        let query = supabaseTemplates
         .from("records")
         .select("*")
         .eq("t_code", t_code)
         .ilike("shift", selectedShift.trim())
         .gte("ts", dayjs(startDate).startOf("day").toISOString())
         .lte("ts", dayjs(endDate).endOf("day").toISOString());

        if (selectedStations.length > 0) {
            query = query.in("station", selectedStations);
        }

        const { data, error: dbError } = await query.order("ts");

        console.log("FULL QUERY Returned Records:", data);
        console.log("FULL QUERY DB Error:", dbError);

        if (dbError) throw dbError;

        if (!data || data.length === 0) {
            error = `Found ${testData.length} records with this template, but 0 matched your date/shift/station filters. Try: All dates, All shifts.`;
            records = [];
            return;
        }

        const templateFields = normalizeFields(selectedTemplate);

        records = (data || []).map(r => {
            const rowData = {
                station: r.station,
                shift: r.shift,
                ts: r.ts,
            ...(r.data || {})
            };

            templateFields
             .filter(f => f.field_type === "formula" && f.formula)
             .forEach(f => {
                    const key = f.field_name?? f.name;
                    rowData[key] = evaluateFormula(f.formula, rowData);
                });

            return {...r,...rowData };
        });

        if (records.length > 0 && browser) {
            setTimeout(generateChart, 100);
        }

    } catch (err: any) {
        error = err.message;
        records = [];
    } finally {
        loading = false;
    }
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

  function exportExcel() {
    if (records.length === 0) return alert('No data to export');
    const fields = normalizeFields(selectedTemplate);
    const headers = Array.from(new Set([
        "ts",
        "station",
        "shift",
    ...fields.map(f => f.field_name)
    ]));

    const csv = [
      headers.map(h => `"${getFieldLabel(h)}"`).join(','),
  ...records.map(r => headers.map(h => `"${String(r[h]?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate?.template_code}_${startDate}_${endDate}.csv`;
    a.click();
  }
</script>

<div class="page">
  <div class="header"><h1>📊 Universal Reports</h1><a href="/" class="btn-back">← Data Entry</a></div>

  <div class="toolbar">
    <label for="template">Template</label>
    <select id="template" bind:value={selectedTemplateId}>
      <option value="">Select</option>
      {#each templates as t}<option value={t.id}>{t.name}</option>{/each}
    </select>

    <label for="from">From</label><input id="from" type="date" bind:value={startDate} />
    <label for="to">To</label><input id="to" type="date" bind:value={endDate} />

    <label for="shift">Shift</label>
    <select id="shift" bind:value={selectedShift}>
      <option value="A">A</option><option value="B">B</option><option value="C">C</option>
    </select>

    <button on:click={loadRecords} disabled={loading}>{loading? 'Loading...' : 'Load'}</button>
  </div>

  {#if availableStations.length > 0}
    <div class="station-filter">
      <p>Filter Stations:</p>
      <div>{#each availableStations as station}<label><input type="checkbox" bind:group={selectedStations} value={station} /> {station}</label>{/each}</div>
    </div>
  {/if}

  {#if error}<div class="error">{error}</div>{/if}

  {#if records.length > 0}
    <div class="analysis-view">
      <h2>{selectedTemplate?.name} - {records.length} records</h2>

      <div class="controls">
        <div>
          <label for="xaxis">X-Axis</label>
          <select id="xaxis" bind:value={xField} on:change={generateChart}>
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
          <select id="yaxis" bind:value={yField} on:change={generateChart}>
            {#each numericFields as field}<option value={field.name}>{getFieldLabel(field.name)}</option>{/each}
          </select>
        </div>
        <div>
          <label for="chart">Chart</label>
          <select id="chart" bind:value={chartType} on:change={generateChart}>
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
      <div class="actions"><button class="excel" on:click={exportExcel}>📗 Export Excel</button></div>
    </div>
  {/if}
</div>

<style>
.page { padding: 25px; background: #eef4fb; min-height: 100vh; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.btn-back { background: #2563eb; color: white; padding: 10px 16px; border-radius: 8px; font-weight: 600; text-decoration: none; }
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; background: white; padding: 16px; border-radius: 8px; }
.toolbar input,.toolbar select,.toolbar button { padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; }
.toolbar button { background: #2563eb; color: white; font-weight: 600; cursor: pointer; }
.station-filter { background: white; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
.analysis-view { background: white; padding: 24px; border-radius: 12px; }
.controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.chart-container { height: 400px; background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 20px; }
.table-container { overflow-x: auto; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
th { background: #f3f4f6; font-weight: 600; }
.actions button { padding: 12px 20px; border: none; border-radius: 10px; color: white; background: #16a34a; cursor: pointer; }
.error { background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px; }
</style>