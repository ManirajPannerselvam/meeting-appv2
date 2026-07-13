<script lang="ts">
  import { onMount } from "svelte";
  import {
    getExecutiveDashboard
  } from "$lib/services/database";

  let data: any = {};

  onMount(async () => {
    data =
      await getExecutiveDashboard();
  });
</script>

<h1>Executive Dashboard</h1>

<div class="grid">

  <div class="card">
    <h2>{data.meetings}</h2>
    <p>Total Meetings</p>
  </div>

  <div class="card">
    <h2>{data.openActions}</h2>
    <p>Open Actions</p>
  </div>

  <div class="card">
    <h2>{data.closedActions}</h2>
    <p>Closed Actions</p>
  </div>

  <div class="card">
    <h2>{data.defects}</h2>
    <p>Total Defects</p>
  </div>

  <div class="card">
    <h2>{data.openDefects}</h2>
    <p>Open Defects</p>
  </div>

  <div class="card">
    <h2>{data.attendance}%</h2>
    <p>Attendance</p>
  </div>

  <div class="card">
    <h2>{data.rfPassRate}%</h2>
    <p>RF Pass Rate</p>
  </div>

</div>

<style>
.grid{
  display:grid;
  grid-template-columns:
  repeat(auto-fit,minmax(220px,1fr));
  gap:20px;
}

.card{
  padding:20px;
  border:1px solid #ddd;
  border-radius:12px;
  text-align:center;
}
</style>