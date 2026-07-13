<script lang="ts">
  import { onMount } from "svelte";
  import { getAnalytics } from "$lib/services/database";

  let data: {
  meetings: number;
  actions: number;
  closedActions: number;
  attendance: number;
} = {
  meetings: 0,
  actions: 0,
  closedActions: 0,
  attendance: 0
};
  onMount(async () => {
  try {
    data = await getAnalytics();
  } catch (err) {
    console.error("Analytics Load Failed", err);
  }
});
</script>

<h1>Meeting Analytics Dashboard</h1>

<div class="grid">
  <div class="card">
    <h2>{data.meetings}</h2>
    <p>Total Meetings</p>
  </div>

  <div class="card">
    <h2>{data.actions}</h2>
    <p>Open Actions</p>
  </div>

  <div class="card">
    <h2>{data.closedActions}</h2>
    <p>Closed Actions</p>
  </div>

  <div class="card">
    <h2>{data.attendance}</h2>
    <p>Attendance</p>
  </div>
</div>

<style>
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}
.card {
  border: 1px solid #ddd;
  padding: 20px;
  text-align: center;
  border-radius: 10px;
}
</style>
