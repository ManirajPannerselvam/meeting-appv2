<script lang="ts">
  import { onMount } from "svelte";
  import { getKPIData }
    from "$lib/services/database";

  let kpi = {
    totalDefects: 0,
    openDefects: 0,
    closedDefects: 0,
    meetings: 0,
    actions: 0
  };

  onMount(async () => {
    kpi = await getKPIData();
  });
</script>

<h1>KPI Dashboard</h1>

<div class="grid">

  <div class="card">
    <h2>{kpi.totalDefects}</h2>
    <p>Total Defects</p>
  </div>

  <div class="card">
    <h2>{kpi.openDefects}</h2>
    <p>Open Defects</p>
  </div>

  <div class="card">
    <h2>{kpi.closedDefects}</h2>
    <p>Closed Defects</p>
  </div>

  <div class="card">
    <h2>{kpi.meetings}</h2>
    <p>Meetings</p>
  </div>

  <div class="card">
    <h2>{kpi.actions}</h2>
    <p>Action Items</p>
  </div>

</div>

<style>
.grid{
  display:grid;
  grid-template-columns:
  repeat(5,1fr);
  gap:15px;
}

.card{
  border:1px solid #ddd;
  padding:20px;
  border-radius:10px;
  text-align:center;
}
</style>