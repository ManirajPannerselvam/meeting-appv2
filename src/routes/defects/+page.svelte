<script lang="ts">
  import { saveDefect, getDefects } from "$lib/services/database";
  import { onMount } from "svelte";

  // ✅ Proper type (better than any)
  type Defect = {
    defect_id?: string;
    title: string;
    device_model?: string;
    status: string;
  };

  let defects: Defect[] = [];

  let defectId: string = "";
  let title: string = "";
  let deviceModel: string = "";
  let status: string = "Open";

  async function loadDefects() {
    try {
      defects = await getDefects();
    } catch (error) {
      console.error("Failed to load defects:", error);
    }
  }

  async function save() {
    try {
      await saveDefect({
        defectId,
        title,
        description: "",
        deviceModel,
        softwareVersion: "",
        priority: "High",
        severity: "Major",
        status,
        assignedTo: "",
        targetDate: ""
      });

      await loadDefects();

      // reset fields
      defectId = "";
      title = "";
      deviceModel = "";
      status = "Open";
    } catch (error) {
      console.error("Failed to save defect:", error);
    }
  }

  onMount(() => {
    loadDefects();
  });
</script>

<h1>Defect Tracker</h1>

<div>
  <input bind:value={defectId} placeholder="Defect ID" />
  <input bind:value={title} placeholder="Title" />
  <input bind:value={deviceModel} placeholder="Device Model" />

  <select bind:value={status}>
    <option value="Open">Open</option>
    <option value="In Progress">In Progress</option>
    <option value="Fixed">Fixed</option>
    <option value="Closed">Closed</option>
  </select>

  <button on:click={save}>
    Save Defect
  </button>
</div>

<table border="1">
  <thead>
    <tr>
      <th>ID</th>
      <th>Title</th>
      <th>Device</th>
      <th>Status</th>
    </tr>
  </thead>

  <tbody>
    {#each defects as d (d.defect_id)}
      <tr>
        <td>{d.defect_id}</td>
        <td>{d.title}</td>
        <td>{d.device_model}</td>
        <td>{d.status}</td>
      </tr>
    {/each}
  </tbody>
</table>