<script lang="ts">
  import { onMount } from "svelte";

  let reports: any[] = [];
  let selectedDate = new Date().toISOString().split('T')[0]; // default today
  let loading = false;

  async function loadReports() {
    loading = true;
    try {
      const res = await fetch(`/api/templates/reports?date=${selectedDate}`);
      const json = await res.json();

      // FIX: API returns { success, count, data }
      reports = json.success? json.data : [];
      console.log('Loaded reports:', reports.length);
    } catch (err) {
      console.error('Load error:', err);
      reports = [];
    } finally {
      loading = false;
    }
  }

  onMount(loadReports);

  function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  }

  function generateReport() {
    console.log("Generate report clicked");
    // TODO: implement actual report generation logic
  }

  function exportPDF() {
    console.log("Export PDF clicked");
    // TODO: implement PDF export logic
  }

  function exportExcel() {
    console.log("Export Excel clicked");
    // TODO: implement Excel export logic
  }

  function printReport() {
    window.print();
  }
</script>

<div class="page">
  <h1>📊 Template Reports</h1>

  <div class="toolbar">
    <input type="date" bind:value={selectedDate} />
    <button on:click={loadReports} disabled={loading}>
      {loading? 'Loading...' : 'Load'}
    </button>
  </div>

  <div class="reportTable">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Template</th>
          <th>Sender</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {#if reports.length === 0}
          <tr>
            <td colspan="5">No reports found</td>
          </tr>
        {:else}
          {#each reports as report}
            <tr>
              <td>{report.id}</td>
              <td>{report.template_name}</td>
              <td>{report.sender}</td>
              <td>{formatDate(report.created_at)}</td>
              <td>
                <a href="/api/templates/report-view?id={report.id}" target="_blank">
                  <button class="view">View JSON</button>
                </a>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <div class="actions">
    <button class="generate" on:click={generateReport}>📊 Generate Report</button>
    <button class="pdf" on:click={exportPDF}>📄 Export PDF</button>
    <button class="excel" on:click={exportExcel}>📗 Export Excel</button>
    <button class="print" on:click={printReport}>🖨 Print</button>
  </div>
</div>

<style>
 .page {
    padding: 25px;
    background: #eef4fb;
    min-height: 100vh;
  }

  h1 {
    margin-bottom: 20px;
  }

 .toolbar {
    margin-bottom: 20px;
    display: flex;
    gap: 10px;
  }

 .toolbar input,.toolbar button {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #ccc;
  }

 .toolbar button {
    background: #2563eb;
    color: white;
    cursor: pointer;
  }

 .toolbar button:disabled {
    opacity: 0.5;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
  }

  th {
    background: #1e293b;
    color: white;
    padding: 12px;
    text-align: left;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #eee;
  }

  tbody tr:hover {
    background: #f8fafc;
  }

 .view {
    padding: 6px 12px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

 .actions {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    margin-top: 20px;
  }

 .actions button {
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    color: white;
    cursor: pointer;
    font-weight: bold;
  }

 .generate { background: #2563eb; }
 .pdf { background: #dc2626; }
 .excel { background: #16a34a; }
 .print { background: #6b7280; }
</style>